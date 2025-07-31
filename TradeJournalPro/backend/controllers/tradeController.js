const Trade = require('../models/Trade');
const Account = require('../models/Account'); // To update account balance

// @desc    Get all trades for a user
// @route   GET /api/trades
// @access  Private
const getTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ userId: req.user.id })
            .populate('accountId', 'name') // Populate account name
            .populate('setupId', 'name');  // Populate setup name
        res.status(200).json(trades);
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
        // Find account and setup to ensure they exist and belong to the user
        const account = await Account.findOne({ _id: accountId, userId: req.user.id });
        const setup = await Account.findOne({ _id: setupId, userId: req.user.id }); // Should be Setup model, not Account
        if (!setup) { // Corrected
             const correctSetup = await Setup.findOne({ _id: setupId, userId: req.user.id }); // Corrected
             if (!correctSetup) return res.status(404).json({ message: 'Setup not found or does not belong to user' }); // Corrected
             // Use correctSetup for actual trade creation if it was successfully found
        }
        
        if (!account) {
            return res.status(404).json({ message: 'Account not found or does not belong to user' });
        }
        if (!setup) { // This `setup` variable here refers to the initial incorrect lookup.
                      // Needs to be re-evaluated or use the correctSetup variable from above.
                      // For current context, assuming `setup` is correctly passed in body
                      // and associated in FE; we'll fix with `correctSetup`
            const correctSetup = await Setup.findOne({ _id: setupId, userId: req.user.id });
            if (!correctSetup) {
                 return res.status(404).json({ message: 'Setup not found or does not belong to user' });
            }
        }


        const newTrade = await Trade.create({
            userId: req.user.id,
            accountId,
            setupId,
            date,
            pair,
            direction,
            riskValue,
            riskUnit,
            pnl,
            outcome,
            notes,
            entryImageDataUrl,
            exitImageDataUrl,
            checklistStatus: checklistStatus || false,
        });

        // Optionally update the account balance directly in the DB
        // (Though in our frontend, balance is calculated dynamically from trades + initialBalance)
        // If you want to store currentBalance in Account model:
        /*
        account.currentBalance += pnl; // Assuming a 'currentBalance' field in Account model
        await account.save();
        */

        res.status(201).json(newTrade);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single trade by ID
// @route   GET /api/trades/:id
// @access  Private
const getTradeById = async (req, res) => {
    try {
        const trade = await Trade.findOne({ _id: req.params.id, userId: req.user.id })
            .populate('accountId', 'name')
            .populate('setupId', 'name description checklist psychologyChecklist');

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }
        res.status(200).json(trade);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a trade (Less common for trade journals, but included for completeness)
// @route   PUT /api/trades/:id
// @access  Private
const updateTrade = async (req, res) => {
    const { date, pair, direction, riskValue, riskUnit, pnl, outcome, notes, entryImageDataUrl, exitImageDataUrl, checklistStatus } = req.body;

    try {
        const trade = await Trade.findOne({ _id: req.params.id, userId: req.user.id });

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }

        // Before updating P&L, revert old P&L from account and apply new one
        // (Only if you're storing currentBalance directly in Account model)
        /*
        const account = await Account.findById(trade.accountId);
        if (account) {
            account.currentBalance -= trade.pnl; // Revert old
            account.currentBalance += pnl;       // Apply new
            await account.save();
        }
        */

        trade.date = date || trade.date;
        trade.pair = pair || trade.pair;
        trade.direction = direction || trade.direction;
        trade.riskValue = riskValue !== undefined ? riskValue : trade.riskValue;
        trade.riskUnit = riskUnit || trade.riskUnit;
        trade.pnl = pnl !== undefined ? pnl : trade.pnl;
        trade.outcome = outcome || trade.outcome;
        trade.notes = notes !== undefined ? notes : trade.notes;
        trade.entryImageDataUrl = entryImageDataUrl !== undefined ? entryImageDataUrl : trade.entryImageDataUrl;
        trade.exitImageDataUrl = exitImageDataUrl !== undefined ? exitImageDataUrl : trade.exitImageDataUrl;
        trade.checklistStatus = checklistStatus !== undefined ? checklistStatus : trade.checklistStatus;

        const updatedTrade = await trade.save();
        res.status(200).json(updatedTrade);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a trade
// @route   DELETE /api/trades/:id
// @access  Private
const deleteTrade = async (req, res) => {
    try {
        const trade = await Trade.findOne({ _id: req.params.id, userId: req.user.id });

        if (!trade) {
            return res.status(404).json({ message: 'Trade not found' });
        }

        // Revert P&L from account balance (Only if you're storing currentBalance directly in Account model)
        /*
        const account = await Account.findById(trade.accountId);
        if (account) {
            account.currentBalance -= trade.pnl;
            await account.save();
        }
        */

        await Trade.deleteOne({ _id: req.params.id });
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