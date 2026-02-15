const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getLivePrices,
    getCandles,
    getIndicators,
    getSupportedPairs,
    getSmcPatterns,
} = require('../controllers/priceController');

router.get('/live', protect, getLivePrices);
router.get('/candles/:symbol', protect, getCandles);
router.get('/indicators/:symbol', protect, getIndicators);
router.get('/pairs', protect, getSupportedPairs);
router.get('/smc/:symbol', protect, getSmcPatterns);

module.exports = router;
