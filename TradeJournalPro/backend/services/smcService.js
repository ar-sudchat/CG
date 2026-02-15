/**
 * SMC (Smart Money Concepts) / ICT Pattern Detection Service
 *
 * Detects: Order Blocks, Fair Value Gaps, Break of Structure,
 * Change of Character, Liquidity Sweeps, Kill Zones, OTE Zones
 */

class SmcService {
    /**
     * Detect all SMC patterns from candle data
     * @param {Array} candles - Array of {timestamp, open, high, low, close, volume}
     * @param {Object} options - Detection parameters
     * @returns {Object} All detected patterns grouped by type
     */
    detectAll(candles, options = {}) {
        if (!candles || candles.length < 10) return { patterns: [] };

        const swings = this._findSwingPoints(candles, options.swingLookback || 5);
        const bos = this._detectBOS(candles, swings);
        const choch = this._detectCHoCH(candles, swings);
        const orderBlocks = this._detectOrderBlocks(candles, bos);
        const fvg = this._detectFVG(candles);
        const liquiditySweeps = this._detectLiquiditySweeps(candles, swings);
        const oteZones = this._detectOTE(candles, bos);
        const killZones = this._getKillZones(candles);

        const patterns = [
            ...orderBlocks,
            ...fvg,
            ...bos,
            ...choch,
            ...liquiditySweeps,
            ...oteZones,
            ...killZones,
        ];

        return {
            patterns,
            swingPoints: swings,
            summary: {
                orderBlocks: orderBlocks.length,
                fvg: fvg.length,
                bos: bos.length,
                choch: choch.length,
                liquiditySweeps: liquiditySweeps.length,
                oteZones: oteZones.length,
                killZones: killZones.length,
            },
        };
    }

    /**
     * Find swing highs and swing lows
     */
    _findSwingPoints(candles, lookback = 5) {
        const swings = [];

        for (let i = lookback; i < candles.length - lookback; i++) {
            const current = candles[i];

            // Check swing high
            let isSwingHigh = true;
            for (let j = 1; j <= lookback; j++) {
                if (candles[i - j].high >= current.high || candles[i + j].high >= current.high) {
                    isSwingHigh = false;
                    break;
                }
            }
            if (isSwingHigh) {
                swings.push({
                    type: 'high',
                    price: current.high,
                    index: i,
                    timestamp: current.timestamp,
                });
            }

            // Check swing low
            let isSwingLow = true;
            for (let j = 1; j <= lookback; j++) {
                if (candles[i - j].low <= current.low || candles[i + j].low <= current.low) {
                    isSwingLow = false;
                    break;
                }
            }
            if (isSwingLow) {
                swings.push({
                    type: 'low',
                    price: current.low,
                    index: i,
                    timestamp: current.timestamp,
                });
            }
        }

        return swings;
    }

    /**
     * Detect Break of Structure (BOS)
     * BOS = price breaks a swing point in the SAME direction as the trend
     */
    _detectBOS(candles, swings) {
        const bosPatterns = [];

        for (let i = 1; i < swings.length; i++) {
            const prev = swings[i - 1];
            const curr = swings[i];

            // Bullish BOS: price breaks above a swing high (uptrend continuation)
            if (prev.type === 'high') {
                for (let j = prev.index + 1; j < candles.length; j++) {
                    if (candles[j].close > prev.price) {
                        bosPatterns.push({
                            patternType: 'bos_bull',
                            priceHigh: prev.price,
                            priceLow: prev.price,
                            timestamp: candles[j].timestamp,
                            metadata: {
                                swingHighPrice: prev.price,
                                candleIndex: j,
                            },
                        });
                        break;
                    }
                    if (j > prev.index + 20) break; // Look ahead limit
                }
            }

            // Bearish BOS: price breaks below a swing low (downtrend continuation)
            if (prev.type === 'low') {
                for (let j = prev.index + 1; j < candles.length; j++) {
                    if (candles[j].close < prev.price) {
                        bosPatterns.push({
                            patternType: 'bos_bear',
                            priceHigh: prev.price,
                            priceLow: prev.price,
                            timestamp: candles[j].timestamp,
                            metadata: {
                                swingLowPrice: prev.price,
                                candleIndex: j,
                            },
                        });
                        break;
                    }
                    if (j > prev.index + 20) break;
                }
            }
        }

        return bosPatterns;
    }

    /**
     * Detect Change of Character (CHoCH)
     * CHoCH = price breaks a swing point in the OPPOSITE direction (trend reversal)
     */
    _detectCHoCH(candles, swings) {
        const chochPatterns = [];

        // Track the trend direction based on swing sequence
        let trend = null; // 'up' or 'down'
        let lastSwingHigh = null;
        let lastSwingLow = null;

        for (const swing of swings) {
            if (swing.type === 'high') {
                if (lastSwingHigh && swing.price > lastSwingHigh.price) {
                    trend = 'up';
                }
                lastSwingHigh = swing;
            } else {
                if (lastSwingLow && swing.price < lastSwingLow.price) {
                    trend = 'down';
                }
                lastSwingLow = swing;
            }

            // Detect CHoCH: in uptrend, price breaks below last swing low
            if (trend === 'up' && lastSwingLow) {
                for (let j = lastSwingLow.index + 1; j < Math.min(lastSwingLow.index + 15, candles.length); j++) {
                    if (candles[j].close < lastSwingLow.price) {
                        chochPatterns.push({
                            patternType: 'choch_bear',
                            priceHigh: lastSwingLow.price,
                            priceLow: lastSwingLow.price,
                            timestamp: candles[j].timestamp,
                            metadata: {
                                swingLowPrice: lastSwingLow.price,
                                candleIndex: j,
                            },
                        });
                        trend = 'down';
                        break;
                    }
                }
            }

            // In downtrend, price breaks above last swing high
            if (trend === 'down' && lastSwingHigh) {
                for (let j = lastSwingHigh.index + 1; j < Math.min(lastSwingHigh.index + 15, candles.length); j++) {
                    if (candles[j].close > lastSwingHigh.price) {
                        chochPatterns.push({
                            patternType: 'choch_bull',
                            priceHigh: lastSwingHigh.price,
                            priceLow: lastSwingHigh.price,
                            timestamp: candles[j].timestamp,
                            metadata: {
                                swingHighPrice: lastSwingHigh.price,
                                candleIndex: j,
                            },
                        });
                        trend = 'up';
                        break;
                    }
                }
            }
        }

        return chochPatterns;
    }

    /**
     * Detect Order Blocks (OB)
     * OB = last opposing candle before an impulsive move that caused a BOS
     */
    _detectOrderBlocks(candles, bosPatterns) {
        const orderBlocks = [];

        for (const bos of bosPatterns) {
            const bosIndex = bos.metadata.candleIndex;
            if (!bosIndex || bosIndex < 3) continue;

            if (bos.patternType === 'bos_bull') {
                // Find last bearish candle before the impulsive bullish move
                for (let i = bosIndex - 1; i >= Math.max(0, bosIndex - 10); i--) {
                    if (candles[i].close < candles[i].open) {
                        orderBlocks.push({
                            patternType: 'order_block_bull',
                            priceHigh: candles[i].high,
                            priceLow: candles[i].low,
                            timestamp: candles[i].timestamp,
                            endTimestamp: candles[bosIndex].timestamp,
                            metadata: {
                                candleIndex: i,
                            },
                        });
                        break;
                    }
                }
            }

            if (bos.patternType === 'bos_bear') {
                // Find last bullish candle before the impulsive bearish move
                for (let i = bosIndex - 1; i >= Math.max(0, bosIndex - 10); i--) {
                    if (candles[i].close > candles[i].open) {
                        orderBlocks.push({
                            patternType: 'order_block_bear',
                            priceHigh: candles[i].high,
                            priceLow: candles[i].low,
                            timestamp: candles[i].timestamp,
                            endTimestamp: candles[bosIndex].timestamp,
                            metadata: {
                                candleIndex: i,
                            },
                        });
                        break;
                    }
                }
            }
        }

        return orderBlocks;
    }

    /**
     * Detect Fair Value Gaps (FVG)
     * Bullish FVG: candle[i-2].high < candle[i].low (gap up)
     * Bearish FVG: candle[i-2].low > candle[i].high (gap down)
     */
    _detectFVG(candles) {
        const fvgPatterns = [];

        for (let i = 2; i < candles.length; i++) {
            const first = candles[i - 2];
            const middle = candles[i - 1];
            const third = candles[i];

            // Bullish FVG
            if (first.high < third.low) {
                fvgPatterns.push({
                    patternType: 'fvg_bull',
                    priceHigh: third.low,
                    priceLow: first.high,
                    timestamp: middle.timestamp,
                    metadata: {
                        candleIndex: i - 1,
                        gapSize: third.low - first.high,
                    },
                });
            }

            // Bearish FVG
            if (first.low > third.high) {
                fvgPatterns.push({
                    patternType: 'fvg_bear',
                    priceHigh: first.low,
                    priceLow: third.high,
                    timestamp: middle.timestamp,
                    metadata: {
                        candleIndex: i - 1,
                        gapSize: first.low - third.high,
                    },
                });
            }
        }

        return fvgPatterns;
    }

    /**
     * Detect Liquidity Sweeps
     * Price spikes above/below a swing point then reverses (long wick)
     */
    _detectLiquiditySweeps(candles, swings) {
        const sweeps = [];

        for (const swing of swings) {
            const startIdx = swing.index + 1;
            const endIdx = Math.min(swing.index + 30, candles.length);

            for (let i = startIdx; i < endIdx; i++) {
                const candle = candles[i];

                if (swing.type === 'high') {
                    // Price wicks above swing high but closes below
                    if (candle.high > swing.price && candle.close < swing.price) {
                        const wickSize = candle.high - Math.max(candle.open, candle.close);
                        const bodySize = Math.abs(candle.close - candle.open);
                        if (wickSize > bodySize * 1.5) {
                            sweeps.push({
                                patternType: 'liquidity_sweep_high',
                                priceHigh: candle.high,
                                priceLow: swing.price,
                                timestamp: candle.timestamp,
                                metadata: {
                                    swingHighPrice: swing.price,
                                    candleIndex: i,
                                },
                            });
                            break;
                        }
                    }
                }

                if (swing.type === 'low') {
                    // Price wicks below swing low but closes above
                    if (candle.low < swing.price && candle.close > swing.price) {
                        const wickSize = Math.min(candle.open, candle.close) - candle.low;
                        const bodySize = Math.abs(candle.close - candle.open);
                        if (wickSize > bodySize * 1.5) {
                            sweeps.push({
                                patternType: 'liquidity_sweep_low',
                                priceHigh: swing.price,
                                priceLow: candle.low,
                                timestamp: candle.timestamp,
                                metadata: {
                                    swingLowPrice: swing.price,
                                    candleIndex: i,
                                },
                            });
                            break;
                        }
                    }
                }
            }
        }

        return sweeps;
    }

    /**
     * Detect OTE (Optimal Trade Entry) zones
     * Fibonacci 61.8% - 78.6% retracement of the impulse leg
     */
    _detectOTE(candles, bosPatterns) {
        const oteZones = [];

        for (const bos of bosPatterns) {
            const bosIndex = bos.metadata.candleIndex;
            if (!bosIndex || bosIndex < 5) continue;

            // Find the impulse leg (from recent swing to BOS)
            let legStart = null;
            let legEnd = candles[bosIndex];

            if (bos.patternType === 'bos_bull') {
                // Find the swing low before the bullish impulse
                let lowestPrice = Infinity;
                let lowestIdx = bosIndex;
                for (let i = bosIndex - 1; i >= Math.max(0, bosIndex - 15); i--) {
                    if (candles[i].low < lowestPrice) {
                        lowestPrice = candles[i].low;
                        lowestIdx = i;
                    }
                }
                legStart = { price: lowestPrice, index: lowestIdx };

                const range = legEnd.high - legStart.price;
                const fib618 = legEnd.high - range * 0.618;
                const fib786 = legEnd.high - range * 0.786;

                oteZones.push({
                    patternType: 'ote_zone',
                    priceHigh: fib618,
                    priceLow: fib786,
                    timestamp: candles[lowestIdx].timestamp,
                    endTimestamp: legEnd.timestamp,
                    metadata: {
                        fibLevel: 0.618,
                        impulseLegSize: range,
                    },
                });
            }

            if (bos.patternType === 'bos_bear') {
                // Find the swing high before the bearish impulse
                let highestPrice = -Infinity;
                let highestIdx = bosIndex;
                for (let i = bosIndex - 1; i >= Math.max(0, bosIndex - 15); i--) {
                    if (candles[i].high > highestPrice) {
                        highestPrice = candles[i].high;
                        highestIdx = i;
                    }
                }
                legStart = { price: highestPrice, index: highestIdx };

                const range = legStart.price - legEnd.low;
                const fib618 = legEnd.low + range * 0.618;
                const fib786 = legEnd.low + range * 0.786;

                oteZones.push({
                    patternType: 'ote_zone',
                    priceHigh: fib786,
                    priceLow: fib618,
                    timestamp: candles[highestIdx].timestamp,
                    endTimestamp: legEnd.timestamp,
                    metadata: {
                        fibLevel: 0.618,
                        impulseLegSize: range,
                    },
                });
            }
        }

        return oteZones;
    }

    /**
     * Get Kill Zones (trading sessions)
     * London: 02:00-05:00 EST (07:00-10:00 UTC)
     * New York: 07:00-10:00 EST (12:00-15:00 UTC)
     * Asian: 20:00-00:00 EST (01:00-05:00 UTC)
     */
    _getKillZones(candles) {
        const killZones = [];

        for (const candle of candles) {
            const date = new Date(candle.timestamp * 1000 || candle.timestamp);
            const utcHour = date.getUTCHours();

            let zone = null;
            if (utcHour >= 7 && utcHour < 10) {
                zone = 'london';
            } else if (utcHour >= 12 && utcHour < 15) {
                zone = 'new_york';
            } else if (utcHour >= 1 && utcHour < 5) {
                zone = 'asian';
            }

            if (zone) {
                // Only add zone boundaries, not every candle
                const lastZone = killZones[killZones.length - 1];
                if (!lastZone || lastZone.zone !== zone || lastZone.patternType !== `kill_zone_${zone}`) {
                    killZones.push({
                        patternType: `kill_zone_${zone}`,
                        zone,
                        priceHigh: candle.high,
                        priceLow: candle.low,
                        timestamp: candle.timestamp,
                    });
                } else {
                    // Extend existing zone
                    lastZone.priceHigh = Math.max(lastZone.priceHigh, candle.high);
                    lastZone.priceLow = Math.min(lastZone.priceLow, candle.low);
                    lastZone.endTimestamp = candle.timestamp;
                }
            }
        }

        return killZones;
    }
}

module.exports = new SmcService();
