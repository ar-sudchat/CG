const express = require('express');
const { getAccounts, createAccount, getAccountById, updateAccount, deleteAccount } = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(protect, getAccounts)
    .post(protect, createAccount);

router.route('/:id')
    .get(protect, getAccountById)
    .put(protect, updateAccount)
    .delete(protect, deleteAccount);

module.exports = router;