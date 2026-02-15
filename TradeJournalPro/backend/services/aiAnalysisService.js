const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const historicalService = require('./historicalService');
const indicatorService = require('./indicatorService');
const smcService = require('./smcService');
const documentService = require('./documentService');

class AiAnalysisService {
    constructor() {
        this.client = null;
    }

    _getClient() {
        if (!this.client) {
            this.client = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
        }
        return this.client;
    }

    async analyze(userId, symbol, resolution = '60', options = {}) {
        // 1. Fetch candle data
        const candles = await historicalService.fetchCandles(symbol, resolution);
        if (!candles || candles.length < 20) {
            return { error: 'Not enough candle data for analysis' };
        }

        // 2. Calculate indicators
        const indicators = indicatorService.computeAll(candles);

        // 3. Detect SMC patterns
        const smcResult = smcService.detectAll(candles);

        // 4. Get knowledge base context
        const knowledge = await documentService.getKnowledgeContext(userId, options.category || 'all');

        // 5. Build AI prompt
        const displaySymbol = symbol.replace('OANDA:', '').replace('_', '/');
        const lastCandles = candles.slice(-20);
        const lastPrice = candles[candles.length - 1];

        const candlesSummary = lastCandles.map(c =>
            `T:${new Date(c.timestamp * 1000).toISOString().slice(0, 16)} O:${c.open.toFixed(5)} H:${c.high.toFixed(5)} L:${c.low.toFixed(5)} C:${c.close.toFixed(5)}`
        ).join('\n');

        const indicatorsSummary = this._formatIndicators(indicators);
        const smcSummary = this._formatSmcPatterns(smcResult);

        const systemPrompt = `คุณเป็นผู้เชี่ยวชาญการวิเคราะห์ Forex ด้วยหลัก SMC (Smart Money Concepts) / ICT (Inner Circle Trader)
คุณมีความรู้เรื่อง Order Blocks, Fair Value Gaps, Break of Structure, Change of Character, Liquidity Sweeps, Kill Zones และ Optimal Trade Entry

ให้วิเคราะห์ข้อมูลราคาและ patterns ที่ตรวจจับได้ แล้วให้คำแนะนำการเทรดเป็นภาษาไทย

${knowledge.textContext ? `\n--- ความรู้จากคู่มือ ---\n${knowledge.textContext}` : ''}`;

        const userPrompt = `วิเคราะห์ ${displaySymbol} (Timeframe: ${resolution})

--- ข้อมูลราคาล่าสุด 20 แท่งเทียน ---
${candlesSummary}

--- Technical Indicators ---
${indicatorsSummary}

--- SMC/ICT Patterns ที่ตรวจจับได้ ---
${smcSummary}

กรุณาวิเคราะห์และตอบในรูปแบบ:
1. **แนวโน้มตลาด**: สรุป trend ปัจจุบัน (Bullish/Bearish/Sideways)
2. **SMC Analysis**: อธิบาย patterns ที่สำคัญ (OB, FVG, BOS, CHoCH, Liquidity)
3. **Kill Zone**: อยู่ใน session ไหน เหมาะเทรดไหม
4. **จุดเข้าเทรด (Entry)**: ราคาที่แนะนำเข้า พร้อมเหตุผล
5. **จุด Stop Loss**: ราคา SL ที่เหมาะสม
6. **จุด Take Profit**: ราคา TP ที่เหมาะสม (อย่างน้อย 1:2 RR)
7. **ความมั่นใจ**: ระดับ 1-10
8. **สรุป**: Buy/Sell/Wait พร้อมเหตุผลสั้นๆ`;

        // 6. Build messages with images if available
        const messages = [{ role: 'user', content: [] }];

        // Add image documents if available (Claude Vision)
        if (knowledge.imageDocs && knowledge.imageDocs.length > 0) {
            for (const imgDoc of knowledge.imageDocs.slice(0, 5)) { // Max 5 images
                try {
                    if (fs.existsSync(imgDoc.path)) {
                        const imageData = fs.readFileSync(imgDoc.path);
                        const base64 = imageData.toString('base64');
                        const ext = imgDoc.path.split('.').pop().toLowerCase();
                        const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';

                        messages[0].content.push({
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64,
                            },
                        });
                    }
                } catch (err) {
                    console.error(`[AiAnalysis] Error reading image ${imgDoc.path}:`, err.message);
                }
            }
        }

        messages[0].content.push({ type: 'text', text: userPrompt });

        // 7. Call Claude API
        try {
            const client = this._getClient();
            const response = await client.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 2000,
                system: systemPrompt,
                messages,
            });

            const analysisText = response.content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('\n');

            return {
                symbol: displaySymbol,
                resolution,
                analysis: analysisText,
                currentPrice: lastPrice.close,
                smcPatterns: smcResult.summary,
                indicators: {
                    rsi: indicators.rsi.length > 0 ? indicators.rsi[indicators.rsi.length - 1] : null,
                    macd: indicators.macd.length > 0 ? indicators.macd[indicators.macd.length - 1] : null,
                },
                timestamp: new Date(),
            };
        } catch (error) {
            console.error('[AiAnalysis] Claude API error:', error.message);
            return {
                error: `AI analysis failed: ${error.message}`,
                symbol: displaySymbol,
                smcPatterns: smcResult.summary,
            };
        }
    }

    _formatIndicators(indicators) {
        const lines = [];

        if (indicators.rsi && indicators.rsi.length > 0) {
            lines.push(`RSI(14): ${indicators.rsi[indicators.rsi.length - 1].toFixed(2)}`);
        }
        if (indicators.sma20 && indicators.sma20.length > 0) {
            lines.push(`SMA(20): ${indicators.sma20[indicators.sma20.length - 1].toFixed(5)}`);
        }
        if (indicators.sma50 && indicators.sma50.length > 0) {
            lines.push(`SMA(50): ${indicators.sma50[indicators.sma50.length - 1].toFixed(5)}`);
        }
        if (indicators.ema12 && indicators.ema12.length > 0) {
            lines.push(`EMA(12): ${indicators.ema12[indicators.ema12.length - 1].toFixed(5)}`);
        }
        if (indicators.ema26 && indicators.ema26.length > 0) {
            lines.push(`EMA(26): ${indicators.ema26[indicators.ema26.length - 1].toFixed(5)}`);
        }
        if (indicators.macd && indicators.macd.length > 0) {
            const last = indicators.macd[indicators.macd.length - 1];
            lines.push(`MACD: ${last.MACD?.toFixed(5)} Signal: ${last.signal?.toFixed(5)} Hist: ${last.histogram?.toFixed(5)}`);
        }
        if (indicators.bollingerBands && indicators.bollingerBands.length > 0) {
            const last = indicators.bollingerBands[indicators.bollingerBands.length - 1];
            lines.push(`BB Upper: ${last.upper?.toFixed(5)} Middle: ${last.middle?.toFixed(5)} Lower: ${last.lower?.toFixed(5)}`);
        }
        if (indicators.pivotPoints) {
            const pp = indicators.pivotPoints;
            lines.push(`Pivot: ${pp.pivot.toFixed(5)} R1: ${pp.r1.toFixed(5)} S1: ${pp.s1.toFixed(5)}`);
        }

        return lines.join('\n') || 'No indicators available';
    }

    _formatSmcPatterns(smcResult) {
        if (!smcResult || !smcResult.patterns || smcResult.patterns.length === 0) {
            return 'No SMC patterns detected';
        }

        const lines = [`Total patterns found: ${smcResult.patterns.length}`];
        const { summary } = smcResult;

        if (summary.orderBlocks > 0) lines.push(`- Order Blocks: ${summary.orderBlocks}`);
        if (summary.fvg > 0) lines.push(`- Fair Value Gaps: ${summary.fvg}`);
        if (summary.bos > 0) lines.push(`- Break of Structure: ${summary.bos}`);
        if (summary.choch > 0) lines.push(`- Change of Character: ${summary.choch}`);
        if (summary.liquiditySweeps > 0) lines.push(`- Liquidity Sweeps: ${summary.liquiditySweeps}`);
        if (summary.oteZones > 0) lines.push(`- OTE Zones: ${summary.oteZones}`);

        // Detail the most recent patterns
        const recentPatterns = smcResult.patterns.slice(-10);
        lines.push('\nRecent patterns:');
        for (const p of recentPatterns) {
            lines.push(`  ${p.patternType}: ${p.priceLow?.toFixed(5)} - ${p.priceHigh?.toFixed(5)}`);
        }

        return lines.join('\n');
    }
}

module.exports = new AiAnalysisService();
