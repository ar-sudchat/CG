const prisma = require('../lib/prisma');

// @desc    Get all trades for a user
// @route   GET /api/trades
// @access  Private
const getTrades = async (req, res) => {
    try {
        const trades = await prisma.trade.findMany({
            where: { userId: req.user.id },
            include: {
                account: { select: { id: true, name: true } },
                setup: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map to match frontend expectations (_id, accountId populated, setupId populated)
        const mapped = trades.map((t) => ({
            ...t,
            _id: t.id,
            accountId: { _id: t.account.id, name: t.account.name },
            setupId: { _id: t.setup.id, name: t.setup.name },
        }));

        res.status(200).json(mapped);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new trade
// @route   POST /api/trades
// @access  Private
const createTrade = async (req, res) => {
    const { accountId, setupId, date, pair, direction, riskValue, riskUnit, pnl, outcome, notes, entryImageDataUrl, exitImageDataUrl, checklistStatus } = req.body;

    if (!accountId || !setupId || !date || !pair || !direction || riskValue === undefined || riskUnit === undefined || pnl === undefined || !outcome) {
        return res.status(400).json({ message: 'Please provide all required trade fields' });
    }

    try {
        const account = await prisma.account.findFirst({
            where: { id: accountId, userId: req.user.id },
        });
        if (!account) {
            return res.status(404).json({ message: 'Account not found or does not belong to user' });
        }

        const setup = await prisma.setup.findFirst({
            where: { id: setupId, userId: req.user.id },
        });
        if (!setup) {
            return res.status(404).json({ message: 'Setup not found or does not belong to user' });
        }

        const newTrade = await prisma.trade.create({
            data: {
                userId: req.user.id,
                accountId,
                setupId,
                date: new Date(date),
                pair,
                direction,
                riskValue,
                riskUnit,
                pnl,
                outcome,
                notes: notes || null,
                entryImageDataUrl: entryImageDataUrl || null,
                exitImageDataUrl: exitImageDataUrl || null,
                checklistStatus: checklistStatus || false,
            },
        });

        res.status(201).json({ ...newTrade, _id: newTrade.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single trade by ID
// @route   GET /api/trades/:id
// @access  Private
const getTradeById = async (req, res) => {
    try {
        const trade = await prisma.trade.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            include: {
                account: { select: { id: true, name: true } },
                setup: { select: { id: true, name: true, description: true, checklist: true, psychologyChecklist: true } },
            },
        });

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }

        res.status(200).json({
            ...trade,
            _id: trade.id,
            accountId: { _id: trade.account.id, name: trade.account.name },
            setupId: { _id: trade.setup.id, name: trade.setup.name, description: trade.setup.description, checklist: trade.setup.checklist, psychologyChecklist: trade.setup.psychologyChecklist },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a trade
// @route   PUT /api/trades/:id
// @access  Private
const updateTrade = async (req, res) => {
    const { date, pair, direction, riskValue, riskUnit, pnl, outcome, notes, entryImageDataUrl, exitImageDataUrl, checklistStatus } = req.body;

    try {
        const trade = await prisma.trade.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }

        const updatedTrade = await prisma.trade.update({
            where: { id: req.params.id },
            data: {
                date: date ? new Date(date) : trade.date,
                pair: pair || trade.pair,
                direction: direction || trade.direction,
                riskValue: riskValue !== undefined ? riskValue : trade.riskValue,
                riskUnit: riskUnit || trade.riskUnit,
                pnl: pnl !== undefined ? pnl : trade.pnl,
                outcome: outcome || trade.outcome,
                notes: notes !== undefined ? notes : trade.notes,
                entryImageDataUrl: entryImageDataUrl !== undefined ? entryImageDataUrl : trade.entryImageDataUrl,
                exitImageDataUrl: exitImageDataUrl !== undefined ? exitImageDataUrl : trade.exitImageDataUrl,
                checklistStatus: checklistStatus !== undefined ? checklistStatus : trade.checklistStatus,
            },
        });

        res.status(200).json({ ...updatedTrade, _id: updatedTrade.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a trade
// @route   DELETE /api/trades/:id
// @access  Private
const deleteTrade = async (req, res) => {
    try {
        const trade = await prisma.trade.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }

        await prisma.trade.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Trade removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTrades,
    createTrade,
    getTradeById,
    updateTrade,
    deleteTrade,
};
