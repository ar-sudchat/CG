const { SMA, EMA, RSI, MACD, BollingerBands } = require('technicalindicators');

class IndicatorService {
    calculateSMA(closes, period) {
        return SMA.calculate({ period, values: closes });
    }

    calculateEMA(closes, period) {
        return EMA.calculate({ period, values: closes });
    }

    calculateRSI(closes, period = 14) {
        return RSI.calculate({ period, values: closes });
    }

    calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        return MACD.calculate({
            values: closes,
            fastPeriod,
            slowPeriod,
            signalPeriod,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
        });
    }

    calculateBollingerBands(closes, period = 20, stdDev = 2) {
        return BollingerBands.calculate({ period, values: closes, stdDev });
    }

    calculatePivotPoints(high, low, close) {
        const pivot = (high + low + close) / 3;
        return {
            pivot,
            r1: 2 * pivot - low,
            r2: pivot + (high - low),
            r3: high + 2 * (pivot - low),
            s1: 2 * pivot - high,
            s2: pivot - (high - low),
            s3: low - 2 * (high - pivot),
        };
    }

    computeAll(candles, options = {}) {
        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);

        const result = {
            sma20: this.calculateSMA(closes, options.smaPeriod || 20),
            sma50: this.calculateSMA(closes, options.smaPeriod2 || 50),
            ema12: this.calculateEMA(closes, 12),
            ema26: this.calculateEMA(closes, 26),
            rsi: this.calculateRSI(closes, options.rsiPeriod || 14),
            macd: this.calculateMACD(closes),
            bollingerBands: this.calculateBollingerBands(closes),
        };

        if (highs.length > 0) {
            result.pivotPoints = this.calculatePivotPoints(
                highs[highs.length - 1],
                lows[lows.length - 1],
                closes[closes.length - 1]
            );
        }

        return result;
    }
}

module.exports = new IndicatorService();
