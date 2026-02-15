const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    getAlertHistory,
} = require('../controllers/alertController');

router.get('/history', protect, getAlertHistory);

router.route('/')
    .get(protect, getAlerts)
    .post(protect, createAlert);

router.route('/:id')
    .put(protect, updateAlert)
    .delete(protect, deleteAlert);

module.exports = router;
