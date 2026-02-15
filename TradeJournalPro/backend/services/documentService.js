const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');

class DocumentService {
    constructor() {
        this.uploadDir = path.join(__dirname, '..', 'uploads', 'knowledge');
        this._ensureUploadDir();
    }

    _ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async processDocument(doc) {
        try {
            const ext = doc.fileType.toLowerCase();

            if (ext === 'pdf') {
                const pdfParse = require('pdf-parse');
                const dataBuffer = fs.readFileSync(doc.filePath);
                const pdfData = await pdfParse(dataBuffer);

                await prisma.knowledgeDoc.update({
                    where: { id: doc.id },
                    data: {
                        extractedText: pdfData.text,
                        isProcessed: true,
                    },
                });
                console.log(`[DocumentService] PDF processed: ${doc.originalName} (${pdfData.text.length} chars)`);
            } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
                await prisma.knowledgeDoc.update({
                    where: { id: doc.id },
                    data: {
                        extractedText: `[Image: ${doc.originalName}] - Will be analyzed by AI Vision during analysis requests`,
                        isProcessed: true,
                    },
                });
                console.log(`[DocumentService] Image registered: ${doc.originalName}`);
            }

            return doc;
        } catch (error) {
            console.error(`[DocumentService] Error processing ${doc.originalName}:`, error.message);
            await prisma.knowledgeDoc.update({
                where: { id: doc.id },
                data: {
                    extractedText: `[Error processing file: ${error.message}]`,
                    isProcessed: false,
                },
            });
            return doc;
        }
    }

    async getKnowledgeContext(userId, category) {
        const where = { userId, isProcessed: true };
        if (category && category !== 'all') {
            where.category = category;
        }

        const docs = await prisma.knowledgeDoc.findMany({
            where,
            select: {
                originalName: true,
                category: true,
                extractedText: true,
                fileType: true,
                filePath: true,
            },
        });

        let textContext = '';
        const imageDocs = [];

        for (const doc of docs) {
            if (['png', 'jpg', 'jpeg'].includes(doc.fileType)) {
                imageDocs.push({
                    name: doc.originalName,
                    path: doc.filePath,
                    category: doc.category,
                });
            } else if (doc.extractedText) {
                textContext += `\n--- ${doc.originalName} (${doc.category}) ---\n${doc.extractedText}\n`;
            }
        }

        return { textContext, imageDocs };
    }

    async deleteDocument(docId, userId) {
        const doc = await prisma.knowledgeDoc.findFirst({
            where: { id: docId, userId },
        });
        if (!doc) return null;

        // Delete file from disk
        if (fs.existsSync(doc.filePath)) {
            fs.unlinkSync(doc.filePath);
        }

        await prisma.knowledgeDoc.delete({ where: { id: docId } });
        return doc;
    }
}

module.exports = new DocumentService();
