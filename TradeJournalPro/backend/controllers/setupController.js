const Setup = require('../models/Setup');

// @desc    Get all setups for a user
// @route   GET /api/setups
// @access  Private
const getSetups = async (req, res) => {
    try {
        const setups = await Setup.find({ userId: req.user.id });
        res.status(200).json(setups);
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
        const newSetup = await Setup.create({
            userId: req.user.id,
            name,
            description,
            checklist: checklist || [],
            psychologyChecklist: psychologyChecklist || [],
        });
        res.status(201).json(newSetup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single setup by ID
// @route   GET /api/setups/:id
// @access  Private
const getSetupById = async (req, res) => {
    try {
        const setup = await Setup.findOne({ _id: req.params.id, userId: req.user.id });

        if (!setup) {
            return res.status(404).json({ message: 'Setup not found' });
        }
        res.status(200).json(setup);
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
        const setup = await Setup.findOne({ _id: req.params.id, userId: req.user.id });

        if (!setup) {
            return res.status(404).json({ message: 'Setup not found' });
        }

        setup.name = name || setup.name;
        setup.description = description !== undefined ? description : setup.description;
        setup.checklist = checklist !== undefined ? checklist : setup.checklist;
        setup.psychologyChecklist = psychologyChecklist !== undefined ? psychologyChecklist : setup.psychologyChecklist;
        setup.updatedAt = Date.now();

        const updatedSetup = await setup.save();
        res.status(200).json(updatedSetup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a setup
// @route   DELETE /api/setups/:id
// @access  Private
const deleteSetup = async (req, res) => {
    try {
        const setup = await Setup.findOne({ _id: req.params.id, userId: req.user.id });

        if (!setup) {
            return res.status(404).json({ message: 'Setup not found' });
        }

        await Setup.deleteOne({ _id: req.params.id });
        // Optionally, also delete associated trades or handle them specifically
        // await Trade.deleteMany({ setupId: req.params.id }); 
        
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