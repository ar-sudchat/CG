const mongoose = require('mongoose');

const SetupSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    checklist: {
        type: [String], // Array of strings for technical checklist items
        default: [],
    },
    psychologyChecklist: {
        type: [String], // Array of strings for psychology checklist items
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update `updatedAt` field on save
SetupSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Setup', SetupSchema);