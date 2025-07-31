const express = require('express');
const { getSetups, createSetup, getSetupById, updateSetup, deleteSetup } = require('../controllers/setupController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(protect, getSetups)
    .post(protect, createSetup);

router.route('/:id')
    .get(protect, getSetupById)
    .put(protect, updateSetup)
    .delete(protect, deleteSetup);

module.exports = router;