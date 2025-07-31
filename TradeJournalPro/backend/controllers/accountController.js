const Account = require('../models/Account');
const Trade = require('../models/Trade'); // To calculate current balance from trades

// @desc    Get all accounts for a user
// @route   GET /api/accounts
// @access  Private
const getAccounts = async (req, res) => {
    try {
        const accounts = await Account.find({ userId: req.user.id });

        // Calculate current balance for each account on the fly
        const accountsWithBalance = await Promise.all(accounts.map(async (account) => {
            const trades = await Trade.find({ accountId: account._id });
            const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
            return {
                ...account.toObject(),
                currentBalance: account.initialBalance + totalPnl,
                totalPnl: totalPnl,
                tradeCount: trades.length
            };
        }));

        res.status(200).json(accountsWithBalance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new account
// @route   POST /api/accounts
// @access  Private
const createAccount = async (req, res) => {
    const { name, initialBalance } = req.body;

    if (!name || initialBalance === undefined) {
        return res.status(400).json({ message: 'Please provide account name and initial balance' });
    }

    try {
        const newAccount = await Account.create({
            userId: req.user.id,
            name,
            initialBalance,
        });
        res.status(201).json(newAccount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single account by ID
// @route   GET /api/accounts/:id
// @access  Private
const getAccountById = async (req, res) => {
    try {
        const account = await Account.findOne({ _id: req.params.id, userId: req.user.id });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // Calculate current balance and stats
        const trades = await Trade.find({ accountId: account._id });
        const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
        const currentBalance = account.initialBalance + totalPnl;

        // Trade statistics for chart
        let runningBalance = account.initialBalance;
        const balanceHistory = [{ balance: account.initialBalance, date: account.createdAt }]; // Start with initial balance at creation
        trades.forEach(trade => {
            runningBalance += trade.pnl;
            balanceHistory.push({ balance: runningBalance, date: trade.date });
        });
        
        const winningTrades = trades.filter(t => t.pnl > 0).length;
        const losingTrades = trades.filter(t => t.pnl < 0).length;
        const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
        const averagePnl = trades.length > 0 ? totalPnl / trades.length : 0;

        res.status(200).json({
            ...account.toObject(),
            currentBalance,
            totalPnl,
            tradeCount: trades.length,
            winningTrades,
            losingTrades,
            winRate: winRate.toFixed(2),
            averagePnl: averagePnl.toFixed(2),
            balanceHistory // For charting
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update an account
// @route   PUT /api/accounts/:id
// @access  Private
const updateAccount = async (req, res) => {
    const { name, initialBalance } = req.body;

    try {
        const account = await Account.findOne({ _id: req.params.id, userId: req.user.id });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        account.name = name || account.name;
        account.initialBalance = initialBalance !== undefined ? initialBalance : account.initialBalance;
        account.updatedAt = Date.now();

        const updatedAccount = await account.save();
        res.status(200).json(updatedAccount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const account = await Account.findOne({ _id: req.params.id, userId: req.user.id });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        await Account.deleteOne({ _id: req.params.id });
        
        // Optionally, also delete associated trades or set their accountId to null
        // For simplicity, we'll just delete the account here. Trades will remain with dangling accountId.
        // A more robust solution might delete trades or handle them specifically.
        // await Trade.deleteMany({ accountId: req.params.id }); 

        res.status(200).json({ message: 'Account removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAccounts,
    createAccount,
    getAccountById,
    updateAccount,
    deleteAccount,
};