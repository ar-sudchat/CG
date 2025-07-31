const express = require('express');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all accounts for user
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create account
router.post('/', auth, async (req, res) => {
  try {
    const { name, initialBalance } = req.body;
    const account = new Account({ userId: req.userId, name, initialBalance });
    await account.save();
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get, update, delete by id
router.get('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.userId });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
