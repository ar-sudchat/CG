const prisma = require('../lib/prisma');

// @desc    Get all alerts for user
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
    try {
        const { status } = req.query;
        const where = { userId: req.user.id };

        if (status === 'active') {
            where.isActive = true;
            where.isTriggered = false;
        } else if (status === 'triggered') {
            where.isTriggered = true;
        }

        const alerts = await prisma.priceAlert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json(alerts.map((a) => ({ ...a, _id: a.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new alert
// @route   POST /api/alerts
// @access  Private
const createAlert = async (req, res) => {
    const { symbol, displaySymbol, alertType, targetPrice, maType, maPeriodFast, maPeriodSlow, crossDirection, rsiPeriod, rsiThreshold } = req.body;

    if (!symbol || !alertType) {
        return res.status(400).json({ message: 'Please provide symbol and alertType' });
    }

    try {
        const alert = await prisma.priceAlert.create({
            data: {
                userId: req.user.id,
                symbol,
                displaySymbol: displaySymbol || null,
                alertType,
                targetPrice: targetPrice || null,
                maType: maType || null,
                maPeriodFast: maPeriodFast || null,
                maPeriodSlow: maPeriodSlow || null,
                crossDirection: crossDirection || null,
                rsiPeriod: rsiPeriod || 14,
                rsiThreshold: rsiThreshold || null,
            },
        });

        res.status(201).json({ ...alert, _id: alert.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update an alert
// @route   PUT /api/alerts/:id
// @access  Private
const updateAlert = async (req, res) => {
    try {
        const alert = await prisma.priceAlert.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        const { isActive, targetPrice, rsiThreshold } = req.body;

        const updated = await prisma.priceAlert.update({
            where: { id: req.params.id },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(targetPrice !== undefined && { targetPrice }),
                ...(rsiThreshold !== undefined && { rsiThreshold }),
            },
        });

        res.status(200).json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an alert
// @route   DELETE /api/alerts/:id
// @access  Private
const deleteAlert = async (req, res) => {
    try {
        const alert = await prisma.priceAlert.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        await prisma.priceAlert.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Alert removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get alert history (triggered alerts)
// @route   GET /api/alerts/history
// @access  Private
const getAlertHistory = async (req, res) => {
    try {
        const alerts = await prisma.priceAlert.findMany({
            where: {
                userId: req.user.id,
                isTriggered: true,
            },
            orderBy: { triggeredAt: 'desc' },
            take: 50,
        });

        res.status(200).json(alerts.map((a) => ({ ...a, _id: a.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    getAlertHistory,
};
