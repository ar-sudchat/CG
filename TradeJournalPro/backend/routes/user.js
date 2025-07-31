const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.preferences);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { preferences: req.body },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.preferences);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
