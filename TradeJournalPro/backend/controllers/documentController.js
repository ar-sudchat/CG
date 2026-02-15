const prisma = require('../lib/prisma');
const documentService = require('../services/documentService');
const path = require('path');

// @desc    Get all documents for user
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
    try {
        const { category } = req.query;
        const where = { userId: req.user.id };
        if (category) where.category = category;

        const docs = await prisma.knowledgeDoc.findMany({
            where,
            select: {
                id: true,
                userId: true,
                filename: true,
                originalName: true,
                filePath: true,
                fileType: true,
                fileSize: true,
                category: true,
                description: true,
                isProcessed: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json(docs.map((d) => ({ ...d, _id: d.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload a document
// @route   POST /api/documents
// @access  Private
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
        const allowedTypes = ['pdf', 'png', 'jpg', 'jpeg'];

        if (!allowedTypes.includes(ext)) {
            return res.status(400).json({ message: 'Only PDF, PNG, JPG files are allowed' });
        }

        const doc = await prisma.knowledgeDoc.create({
            data: {
                userId: req.user.id,
                filename: req.file.filename,
                originalName: req.file.originalname,
                filePath: req.file.path,
                fileType: ext,
                fileSize: req.file.size,
                category: req.body.category || 'general',
                description: req.body.description || null,
            },
        });

        // Process document in background
        documentService.processDocument(doc).catch((err) => {
            console.error('[DocumentController] Process error:', err.message);
        });

        res.status(201).json({ ...doc, _id: doc.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
    try {
        const doc = await documentService.deleteDocument(req.params.id, req.user.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.status(200).json({ message: 'Document removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDocuments,
    uploadDocument,
    deleteDocument,
};
