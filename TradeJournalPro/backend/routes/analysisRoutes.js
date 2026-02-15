const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAiAnalysis } = require('../controllers/analysisController');

router.post('/ai', protect, getAiAnalysis);

module.exports = router;
