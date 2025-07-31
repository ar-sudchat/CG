const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
    },
    setupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Setup',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    pair: {
        type: String,
        required: true,
    },
    direction: {
        type: String, // 'Buy' or 'Sell'
        required: true,
    },
    riskValue: {
        type: Number,
        required: true,
    },
    riskUnit: {
        type: String, // 'R' or 'Amount' ($)
        required: true,
    },
    pnl: { // Profit and Loss
        type: Number,
        required: true,
    },
    outcome: {
        type: String, // 'TP', 'SL', 'BE', 'Manual'
        required: true,
    },
    notes: {
        type: String,
    },
    entryImageDataUrl: { // Storing as Base64 string for simplicity in example
        type: String,
        default: null,
    },
    exitImageDataUrl: { // Storing as Base64 string for simplicity in example
        type: String,
        default: null,
    },
    checklistStatus: {
        type: Boolean,
        default: false, // true if checklist was completed
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Trade', TradeSchema);