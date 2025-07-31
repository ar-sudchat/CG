const express = require('express');
const { getTrades, createTrade, getTradeById, updateTrade, deleteTrade } = require('../controllers/tradeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(protect, getTrades)
    .post(protect, createTrade);

router.route('/:id')
    .get(protect, getTradeById)
    .put(protect, updateTrade)
    .delete(protect, deleteTrade);

module.exports = router;