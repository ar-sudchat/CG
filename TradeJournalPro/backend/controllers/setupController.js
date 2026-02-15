const prisma = require('../lib/prisma');

// @desc    Get all setups for a user
// @route   GET /api/setups
// @access  Private
const getSetups = async (req, res) => {
    try {
        const setups = await prisma.setup.findMany({
            where: { userId: req.user.id },
        });
        res.status(200).json(setups.map((s) => ({ ...s, _id: s.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new setup
// @route   POST /api/setups
// @access  Private
const createSetup = async (req, res) => {
    const { name, description, checklist, psychologyChecklist } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Please provide setup name' });
    }

    try {
        const newSetup = await prisma.setup.create({
            data: {
                userId: req.user.id,
                name,
                description: description || null,
                checklist: checklist || [],
                psychologyChecklist: psychologyChecklist || [],
            },
        });
        res.status(201).json({ ...newSetup, _id: newSetup.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single setup by ID
// @route   GET /api/setups/:id
// @access  Private
const getSetupById = async (req, res) => {
    try {
        const setup = await prisma.setup.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!setup) {
            return res.status(404).json({ message: 'Setup not found' });
        }
        res.status(200).json({ ...setup, _id: setup.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a setup
// @route   PUT /api/setups/:id
// @access  Private
const updateSetup = async (req, res) => {
    const { name, description, checklist, psychologyChecklist } = req.body;

    try {
        const setup = await prisma.setup.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!setup) {
            return res.status(404).json({ message: 'Setup not found' });
        }

        const updatedSetup = await prisma.setup.update({
            where: { id: req.params.id },
            data: {
                name: name || setup.name,
                description: description !== undefined ? description : setup.description,
                checklist: checklist !== undefined ? checklist : setup.checklist,
                psychologyChecklist: psychologyChecklist !== undefined ? psychologyChecklist : setup.psychologyChecklist,
            },
        });

        res.status(200).json({ ...updatedSetup, _id: updatedSetup.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a setup
// @route   DELETE /api/setups/:id
// @access  Private
const deleteSetup = async (req, res) => {
    try {
        const setup = await prisma.setup.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!setup) {
            return res.status(404).json({ message: 'Setup not found' });
        }

        await prisma.setup.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Setup removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSetups,
    createSetup,
    getSetupById,
    updateSetup,
    deleteSetup,
};
