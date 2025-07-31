const express = require('express');
const Setup = require('../models/Setup');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all setups for user
router.get('/', auth, async (req, res) => {
  try {
    const setups = await Setup.find({ userId: req.userId });
    res.json(setups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create setup
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, checklist, psychologyChecklist } = req.body;
    const setup = new Setup({ userId: req.userId, name, description, checklist, psychologyChecklist });
    await setup.save();
    res.status(201).json(setup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get, update, delete by id
router.get('/:id', auth, async (req, res) => {
  try {
    const setup = await Setup.findOne({ _id: req.params.id, userId: req.userId });
    if (!setup) return res.status(404).json({ message: 'Setup not found' });
    res.json(setup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const setup = await Setup.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!setup) return res.status(404).json({ message: 'Setup not found' });
    res.json(setup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const setup = await Setup.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!setup) return res.status(404).json({ message: 'Setup not found' });
    res.json({ message: 'Setup deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
