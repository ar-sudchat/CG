const prisma = require('../lib/prisma');

// @desc    Get all accounts for a user
// @route   GET /api/accounts
// @access  Private
const getAccounts = async (req, res) => {
    try {
        const accounts = await prisma.account.findMany({
            where: { userId: req.user.id },
            include: { trades: { select: { pnl: true } } },
        });

        const accountsWithBalance = accounts.map((account) => {
            const totalPnl = account.trades.reduce((sum, t) => sum + t.pnl, 0);
            const { trades, ...rest } = account;
            return {
                ...rest,
                _id: account.id,
                currentBalance: account.initialBalance + totalPnl,
                totalPnl,
                tradeCount: account.trades.length,
            };
        });

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
        const newAccount = await prisma.account.create({
            data: {
                userId: req.user.id,
                name,
                initialBalance,
            },
        });
        res.status(201).json({ ...newAccount, _id: newAccount.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single account by ID
// @route   GET /api/accounts/:id
// @access  Private
const getAccountById = async (req, res) => {
    try {
        const account = await prisma.account.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const trades = await prisma.trade.findMany({
            where: { accountId: account.id },
            orderBy: { date: 'asc' },
        });

        const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
        const currentBalance = account.initialBalance + totalPnl;

        let runningBalance = account.initialBalance;
        const balanceHistory = [{ balance: account.initialBalance, date: account.createdAt }];
        trades.forEach((trade) => {
            runningBalance += trade.pnl;
            balanceHistory.push({ balance: runningBalance, date: trade.date });
        });

        const winningTrades = trades.filter((t) => t.pnl > 0).length;
        const losingTrades = trades.filter((t) => t.pnl < 0).length;
        const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
        const averagePnl = trades.length > 0 ? totalPnl / trades.length : 0;

        res.status(200).json({
            ...account,
            _id: account.id,
            currentBalance,
            totalPnl,
            tradeCount: trades.length,
            winningTrades,
            losingTrades,
            winRate: winRate.toFixed(2),
            averagePnl: averagePnl.toFixed(2),
            balanceHistory,
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
        const account = await prisma.account.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const updatedAccount = await prisma.account.update({
            where: { id: req.params.id },
            data: {
                name: name || account.name,
                initialBalance: initialBalance !== undefined ? initialBalance : account.initialBalance,
            },
        });

        res.status(200).json({ ...updatedAccount, _id: updatedAccount.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const account = await prisma.account.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        await prisma.account.delete({ where: { id: req.params.id } });
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
