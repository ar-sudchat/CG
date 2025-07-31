const express = require('express');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all trades for user
router.get('/', auth, async (req, res) => {
  try {
    const trades = await Trade.find({ userId: req.userId });
    res.json(trades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create trade
router.post('/', auth, async (req, res) => {
  try {
    const trade = new Trade({ ...req.body, userId: req.userId });
    await trade.save();
    res.status(201).json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get, update, delete by id
router.get('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, userId: req.userId });
    if (!trade) return res.status(404).json({ message: 'Trade not found' });
    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!trade) return res.status(404).json({ message: 'Trade not found' });
    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!trade) return res.status(404).json({ message: 'Trade not found' });
    res.json({ message: 'Trade deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
