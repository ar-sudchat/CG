const axios = require('axios');
const prisma = require('../lib/prisma');

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Map OANDA symbols to Twelve Data format
const SYMBOL_MAP = {
    'OANDA:XAU_USD': 'XAU/USD', 'OANDA:EUR_USD': 'EUR/USD', 'OANDA:GBP_USD': 'GBP/USD',
    'OANDA:USD_JPY': 'USD/JPY', 'OANDA:GBP_JPY': 'GBP/JPY', 'OANDA:EUR_GBP': 'EUR/GBP',
    'OANDA:AUD_USD': 'AUD/USD', 'OANDA:USD_CHF': 'USD/CHF', 'OANDA:NZD_USD': 'NZD/USD',
    'OANDA:EUR_JPY': 'EUR/JPY', 'OANDA:USD_CAD': 'USD/CAD',
};

// Map resolution to Twelve Data interval format
const RESOLUTION_MAP = {
    '1': '1min', '5': '5min', '15': '15min', '30': '30min',
    '60': '1h', '240': '4h', 'D': '1day',
};

// Base prices for demo candles fallback
const BASE_PRICES = {
    'OANDA:XAU_USD': 2900, 'OANDA:EUR_USD': 1.0850, 'OANDA:GBP_USD': 1.2650,
    'OANDA:USD_JPY': 150.50, 'OANDA:GBP_JPY': 190.30, 'OANDA:EUR_GBP': 0.8570,
    'OANDA:AUD_USD': 0.6550, 'OANDA:USD_CHF': 0.8830, 'OANDA:NZD_USD': 0.5990,
    'OANDA:EUR_JPY': 163.20, 'OANDA:USD_CAD': 1.3550,
};

class HistoricalService {
    constructor() {
        this.finnhubKey = process.env.FINNHUB_API_KEY;
        this.twelveDataKey = process.env.TWELVE_DATA_API_KEY;
    }

    async fetchCandles(symbol, resolution = '60', from, to, { forceRefresh = false } = {}) {
        const now = Math.floor(Date.now() / 1000);
        const defaultDays = resolution === 'D' ? 90 : resolution === '240' ? 30 : 7;
        const fromTs = from ? parseInt(from) : now - (defaultDays * 24 * 60 * 60);
        const toTs = to ? parseInt(to) : now;

        // 1. Check PostgreSQL cache first (skip if forceRefresh)
        let cached = [];
        if (!forceRefresh) {
            cached = await prisma.forexCandle.findMany({
                where: {
                    symbol,
                    resolution,
                    timestamp: {
                        gte: new Date(fromTs * 1000),
                        lte: new Date(toTs * 1000),
                    },
                },
                orderBy: { timestamp: 'asc' },
            });

            const expectedCandles = this._estimateCandles(resolution, fromTs, toTs);
            if (cached.length >= expectedCandles * 0.8) {
                console.log(`[HistoricalService] Using cached data: ${cached.length} candles for ${symbol}`);
                return cached.map(c => ({
                    timestamp: Math.floor(c.timestamp.getTime() / 1000),
                    open: c.open, high: c.high, low: c.low, close: c.close,
                    volume: c.volume || 0,
                }));
            }
        } else {
            // Clear old cache for this symbol/resolution when force refreshing
            await prisma.forexCandle.deleteMany({
                where: { symbol, resolution },
            }).catch(() => {});
            console.log(`[HistoricalService] Force refresh: cleared cache for ${symbol} ${resolution}`);
        }

        // 2. Try Twelve Data API (best free option for Forex)
        if (this.twelveDataKey && this.twelveDataKey !== 'your_twelve_data_api_key_here') {
            try {
                const candles = await this._fetchFromTwelveData(symbol, resolution, fromTs, toTs);
                if (candles && candles.length > 0) {
                    console.log(`[HistoricalService] Twelve Data: ${candles.length} candles for ${symbol}`);
                    await this._cacheCandles(symbol, resolution, candles);
                    return candles;
                }
            } catch (error) {
                console.warn(`[HistoricalService] Twelve Data failed: ${error.message}`);
            }
        }

        // 3. Try Finnhub REST API
        try {
            const candles = await this._fetchFromFinnhub(symbol, resolution, fromTs, toTs);
            if (candles && candles.length > 0) {
                console.log(`[HistoricalService] Finnhub: ${candles.length} candles for ${symbol}`);
                await this._cacheCandles(symbol, resolution, candles);
                return candles;
            }
        } catch (error) {
            console.warn(`[HistoricalService] Finnhub failed: ${error.message}`);
        }

        // 4. Return cache if available
        if (cached.length > 0) {
            return cached.map(c => ({
                timestamp: Math.floor(c.timestamp.getTime() / 1000),
                open: c.open, high: c.high, low: c.low, close: c.close,
                volume: c.volume || 0,
            }));
        }

        // 5. Fallback: demo candles
        console.log(`[HistoricalService] Generating demo candles for ${symbol} ${resolution}`);
        return this._generateDemoCandles(symbol, resolution, fromTs, toTs);
    }

    // ─── Twelve Data API ───
    async _fetchFromTwelveData(symbol, resolution, fromTs, toTs) {
        const tdSymbol = SYMBOL_MAP[symbol] || symbol.replace('OANDA:', '').replace('_', '/');
        const interval = RESOLUTION_MAP[resolution] || '1h';

        // Calculate output size based on time range
        const resSeconds = { '1': 60, '5': 300, '15': 900, '30': 1800, '60': 3600, '240': 14400, 'D': 86400 };
        const candleInterval = resSeconds[resolution] || 3600;
        const outputsize = Math.min(Math.ceil((toTs - fromTs) / candleInterval), 500);

        const response = await axios.get(`${TWELVE_DATA_URL}/time_series`, {
            params: {
                symbol: tdSymbol,
                interval,
                outputsize,
                apikey: this.twelveDataKey,
                format: 'JSON',
                timezone: 'UTC',
            },
            timeout: 10000,
        });

        const data = response.data;

        if (data.status === 'error') {
            throw new Error(data.message || 'Twelve Data API error');
        }

        if (!data.values || data.values.length === 0) {
            return [];
        }

        // Twelve Data returns newest first, we need oldest first
        const candles = data.values
            .map(v => ({
                timestamp: Math.floor(new Date(v.datetime + ' UTC').getTime() / 1000),
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
                close: parseFloat(v.close),
                volume: parseInt(v.volume) || 0,
            }))
            .filter(c => !isNaN(c.timestamp) && !isNaN(c.open))
            .sort((a, b) => a.timestamp - b.timestamp);

        return candles;
    }

    // ─── Finnhub API ───
    async _fetchFromFinnhub(symbol, resolution, fromTs, toTs) {
        const response = await axios.get(`${FINNHUB_BASE_URL}/forex/candle`, {
            params: { symbol, resolution, from: fromTs, to: toTs, token: this.finnhubKey },
            timeout: 8000,
        });

        const data = response.data;

        if (data.s !== 'ok' || !data.t || data.t.length === 0) {
            return [];
        }

        const candles = [];
        for (let i = 0; i < data.t.length; i++) {
            candles.push({
                timestamp: data.t[i],
                open: data.o[i], high: data.h[i], low: data.l[i], close: data.c[i],
                volume: data.v ? data.v[i] : 0,
            });
        }

        return candles;
    }

    // ─── Cache candles to PostgreSQL ───
    async _cacheCandles(symbol, resolution, candles) {
        const displaySymbol = symbol.replace('OANDA:', '').replace('_', '/');

        for (const c of candles) {
            const ts = new Date(c.timestamp * 1000);
            await prisma.forexCandle.upsert({
                where: { symbol_resolution_timestamp: { symbol, resolution, timestamp: ts } },
                update: { open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0, displaySymbol },
                create: { symbol, displaySymbol, resolution, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0, timestamp: ts },
            }).catch(err => {
                if (!err.message.includes('Unique constraint')) {
                    console.error('[HistoricalService] Cache write error:', err.message);
                }
            });
        }
    }

    // ─── Demo candles fallback ───
    _generateDemoCandles(symbol, resolution, fromTs, toTs) {
        const resSeconds = { '1': 60, '5': 300, '15': 900, '30': 1800, '60': 3600, '240': 14400, 'D': 86400 };
        const interval = resSeconds[resolution] || 3600;

        const basePrice = BASE_PRICES[symbol] || 1.0;
        const isJpy = symbol.includes('JPY');
        const isXau = symbol.includes('XAU') || symbol.includes('GOLD');

        const volatility = isXau ? 0.003 : isJpy ? 0.0015 : 0.001;

        const candles = [];
        let price = basePrice;

        let seed = 0;
        for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);
        const seededRandom = () => {
            seed = (seed * 16807 + 0) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        let trend = seededRandom() > 0.5 ? 1 : -1;
        let trendLen = Math.floor(seededRandom() * 20) + 10;
        let trendCount = 0;

        for (let ts = fromTs; ts <= toTs; ts += interval) {
            const day = new Date(ts * 1000).getUTCDay();
            if (day === 0 || day === 6) continue;

            trendCount++;
            if (trendCount > trendLen) {
                trend = -trend;
                trendLen = Math.floor(seededRandom() * 20) + 10;
                trendCount = 0;
            }

            const trendBias = trend * volatility * 0.3;
            const change = (seededRandom() - 0.5) * volatility * basePrice + trendBias * basePrice;
            const open = price;
            const close = price + change;

            const wickUp = seededRandom() * volatility * basePrice * 0.5;
            const wickDown = seededRandom() * volatility * basePrice * 0.5;
            const high = Math.max(open, close) + wickUp;
            const low = Math.min(open, close) - wickDown;

            const volume = Math.floor(seededRandom() * 1000 + 100);

            candles.push({
                timestamp: ts,
                open: parseFloat(open.toFixed(isXau ? 2 : isJpy ? 3 : 5)),
                high: parseFloat(high.toFixed(isXau ? 2 : isJpy ? 3 : 5)),
                low: parseFloat(low.toFixed(isXau ? 2 : isJpy ? 3 : 5)),
                close: parseFloat(close.toFixed(isXau ? 2 : isJpy ? 3 : 5)),
                volume,
            });

            price = close;
        }

        return candles;
    }

    _estimateCandles(resolution, from, to) {
        const duration = to - from;
        const resolutionMap = {
            '1': 60, '5': 300, '15': 900, '30': 1800,
            '60': 3600, '240': 14400, 'D': 86400, 'W': 604800, 'M': 2592000,
        };
        const interval = resolutionMap[resolution] || 3600;
        return Math.floor((duration / interval) * 0.7);
    }
}

module.exports = new HistoricalService();
