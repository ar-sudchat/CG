const axios = require('axios');
const prisma = require('../lib/prisma');

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

class HistoricalService {
    constructor() {
        this.apiKey = process.env.FINNHUB_API_KEY;
    }

    async fetchCandles(symbol, resolution = '60', from, to) {
        const now = Math.floor(Date.now() / 1000);
        const fromTs = from ? parseInt(from) : now - (7 * 24 * 60 * 60);
        const toTs = to ? parseInt(to) : now;

        // Check PostgreSQL cache first
        const cached = await prisma.forexCandle.findMany({
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

        // If we have enough cached data (at least 80% of expected), return cache
        const expectedCandles = this._estimateCandles(resolution, fromTs, toTs);
        if (cached.length >= expectedCandles * 0.8) {
            return cached.map(c => ({
                timestamp: Math.floor(c.timestamp.getTime() / 1000),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume || 0,
            }));
        }

        // Fetch from Finnhub REST API
        try {
            const response = await axios.get(`${FINNHUB_BASE_URL}/forex/candle`, {
                params: {
                    symbol,
                    resolution,
                    from: fromTs,
                    to: toTs,
                    token: this.apiKey,
                },
            });

            const data = response.data;

            if (data.s !== 'ok' || !data.t) {
                console.warn(`[HistoricalService] No data for ${symbol} ${resolution}`);
                return cached.map(c => ({
                    timestamp: Math.floor(c.timestamp.getTime() / 1000),
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume || 0,
                }));
            }

            const candles = [];

            for (let i = 0; i < data.t.length; i++) {
                const candle = {
                    timestamp: data.t[i],
                    open: data.o[i],
                    high: data.h[i],
                    low: data.l[i],
                    close: data.c[i],
                    volume: data.v ? data.v[i] : 0,
                };
                candles.push(candle);

                // Upsert into PostgreSQL cache
                const displaySymbol = symbol.replace('OANDA:', '').replace('_', '/');
                const ts = new Date(data.t[i] * 1000);

                await prisma.forexCandle.upsert({
                    where: {
                        symbol_resolution_timestamp: {
                            symbol,
                            resolution,
                            timestamp: ts,
                        },
                    },
                    update: {
                        open: data.o[i],
                        high: data.h[i],
                        low: data.l[i],
                        close: data.c[i],
                        volume: data.v ? data.v[i] : 0,
                        displaySymbol,
                    },
                    create: {
                        symbol,
                        displaySymbol,
                        resolution,
                        open: data.o[i],
                        high: data.h[i],
                        low: data.l[i],
                        close: data.c[i],
                        volume: data.v ? data.v[i] : 0,
                        timestamp: ts,
                    },
                }).catch(err => {
                    // Ignore duplicate key errors during concurrent upserts
                    if (!err.message.includes('Unique constraint')) {
                        console.error('[HistoricalService] Cache write error:', err.message);
                    }
                });
            }

            return candles;
        } catch (error) {
            console.error('[HistoricalService] Fetch error:', error.message);
            return cached.map(c => ({
                timestamp: Math.floor(c.timestamp.getTime() / 1000),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume || 0,
            }));
        }
    }

    _estimateCandles(resolution, from, to) {
        const duration = to - from;
        const resolutionMap = {
            '1': 60,
            '5': 300,
            '15': 900,
            '30': 1800,
            '60': 3600,
            'D': 86400,
            'W': 604800,
            'M': 2592000,
        };
        const interval = resolutionMap[resolution] || 3600;
        return Math.floor((duration / interval) * 0.7);
    }
}

module.exports = new HistoricalService();
