const priceService = require('../services/priceService');
const historicalService = require('../services/historicalService');
const indicatorService = require('../services/indicatorService');
const smcService = require('../services/smcService');

// @desc    Get live prices for all subscribed pairs
// @route   GET /api/prices/live
// @access  Private
const getLivePrices = async (req, res) => {
    try {
        const prices = priceService.getAllPrices();
        const result = {};
        for (const [key, value] of prices) {
            result[key] = value;
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get historical candle data
// @route   GET /api/prices/candles/:symbol
// @access  Private
const getCandles = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { resolution = '60', from, to, refresh } = req.query;
        const candles = await historicalService.fetchCandles(symbol, resolution, from, to, { forceRefresh: refresh === 'true' });
        res.status(200).json(candles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get computed technical indicators
// @route   GET /api/prices/indicators/:symbol
// @access  Private
const getIndicators = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { resolution = '60', smaPeriod, rsiPeriod } = req.query;
        const candles = await historicalService.fetchCandles(symbol, resolution);

        if (!candles || candles.length < 20) {
            return res.status(400).json({ message: 'Not enough data for indicators' });
        }

        const indicators = indicatorService.computeAll(candles, {
            smaPeriod: smaPeriod ? parseInt(smaPeriod) : undefined,
            rsiPeriod: rsiPeriod ? parseInt(rsiPeriod) : undefined,
        });
        res.status(200).json(indicators);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get supported forex pairs
// @route   GET /api/prices/pairs
// @access  Private
const getSupportedPairs = async (req, res) => {
    try {
        const pairs = priceService.getSupportedPairs();
        res.status(200).json(pairs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get SMC patterns for a symbol
// @route   GET /api/prices/smc/:symbol
// @access  Private
const getSmcPatterns = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { resolution = '60', from, to } = req.query;
        const candles = await historicalService.fetchCandles(symbol, resolution, from, to);

        if (!candles || candles.length < 10) {
            return res.status(400).json({ message: 'Not enough data for SMC analysis' });
        }

        const smcResult = smcService.detectAll(candles);
        res.status(200).json(smcResult);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLivePrices,
    getCandles,
    getIndicators,
    getSupportedPairs,
    getSmcPatterns,
};
