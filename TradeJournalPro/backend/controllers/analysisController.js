const aiAnalysisService = require('../services/aiAnalysisService');

// @desc    Request AI analysis for a symbol
// @route   POST /api/analysis/ai
// @access  Private
const getAiAnalysis = async (req, res) => {
    try {
        const { symbol, resolution, category } = req.body;

        if (!symbol) {
            return res.status(400).json({ message: 'Please provide a symbol' });
        }

        const result = await aiAnalysisService.analyze(
            req.user.id,
            symbol,
            resolution || '60',
            { category }
        );

        if (result.error) {
            return res.status(400).json({ message: result.error, ...result });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAiAnalysis,
};
