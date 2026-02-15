const prisma = require('../lib/prisma');
const priceService = require('./priceService');
const indicatorService = require('./indicatorService');
const historicalService = require('./historicalService');

class AlertService {
    constructor(io) {
        this.io = io;
        this.checkInterval = null;
    }

    start(intervalMs = 10000) {
        console.log('[AlertService] Started checking alerts every', intervalMs, 'ms');
        this.checkInterval = setInterval(() => this.checkAlerts(), intervalMs);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async checkAlerts() {
        try {
            const activeAlerts = await prisma.priceAlert.findMany({
                where: { isActive: true, isTriggered: false },
            });

            for (const alert of activeAlerts) {
                const triggered = await this.evaluateAlert(alert);
                if (triggered) {
                    await prisma.priceAlert.update({
                        where: { id: alert.id },
                        data: {
                            isTriggered: true,
                            triggeredAt: new Date(),
                            lastCheckedAt: new Date(),
                        },
                    });

                    // Push notification via Socket.io
                    if (this.io) {
                        this.io.to(`user:${alert.userId}`).emit('alert_triggered', {
                            alertId: alert.id,
                            symbol: alert.symbol,
                            displaySymbol: alert.displaySymbol,
                            alertType: alert.alertType,
                            message: this._buildMessage(alert),
                            triggeredAt: new Date(),
                        });
                    }

                    console.log(`[AlertService] Alert triggered: ${alert.displaySymbol} ${alert.alertType}`);
                } else {
                    await prisma.priceAlert.update({
                        where: { id: alert.id },
                        data: { lastCheckedAt: new Date() },
                    });
                }
            }
        } catch (error) {
            console.error('[AlertService] Error checking alerts:', error.message);
        }
    }

    async evaluateAlert(alert) {
        const currentPrice = priceService.getLatestPrice(alert.symbol);
        if (!currentPrice) return false;

        switch (alert.alertType) {
            case 'price_above':
                return currentPrice.price >= alert.targetPrice;

            case 'price_below':
                return currentPrice.price <= alert.targetPrice;

            case 'rsi_overbought':
            case 'rsi_oversold': {
                const candles = await historicalService.fetchCandles(alert.symbol, '60');
                if (candles.length < 20) return false;

                const rsi = indicatorService.calculateRSI(
                    candles.map(c => c.close),
                    alert.rsiPeriod || 14
                );
                if (rsi.length === 0) return false;

                const lastRsi = rsi[rsi.length - 1];
                if (alert.alertType === 'rsi_overbought') {
                    return lastRsi >= (alert.rsiThreshold || 70);
                }
                return lastRsi <= (alert.rsiThreshold || 30);
            }

            case 'ma_cross': {
                const candles = await historicalService.fetchCandles(alert.symbol, '60');
                if (candles.length < 60) return false;

                const closes = candles.map(c => c.close);
                const calcFn = alert.maType === 'EMA'
                    ? indicatorService.calculateEMA.bind(indicatorService)
                    : indicatorService.calculateSMA.bind(indicatorService);

                const fast = calcFn(closes, alert.maPeriodFast || 20);
                const slow = calcFn(closes, alert.maPeriodSlow || 50);

                if (fast.length < 2 || slow.length < 2) return false;

                const lastFast = fast[fast.length - 1];
                const prevFast = fast[fast.length - 2];
                const lastSlow = slow[slow.length - 1];
                const prevSlow = slow[slow.length - 2];

                if (alert.crossDirection === 'golden') {
                    return prevFast <= prevSlow && lastFast > lastSlow;
                }
                return prevFast >= prevSlow && lastFast < lastSlow;
            }

            default:
                return false;
        }
    }

    _buildMessage(alert) {
        const symbol = alert.displaySymbol || alert.symbol;
        switch (alert.alertType) {
            case 'price_above':
                return `${symbol} ราคาสูงกว่า ${alert.targetPrice}`;
            case 'price_below':
                return `${symbol} ราคาต่ำกว่า ${alert.targetPrice}`;
            case 'rsi_overbought':
                return `${symbol} RSI เข้าโซน Overbought (>${alert.rsiThreshold || 70})`;
            case 'rsi_oversold':
                return `${symbol} RSI เข้าโซน Oversold (<${alert.rsiThreshold || 30})`;
            case 'ma_cross':
                const crossType = alert.crossDirection === 'golden' ? 'Golden Cross' : 'Death Cross';
                return `${symbol} ${alert.maType} ${crossType} (${alert.maPeriodFast}/${alert.maPeriodSlow})`;
            default:
                return `${symbol} alert triggered`;
        }
    }
}

module.exports = AlertService;
