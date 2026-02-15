const WebSocket = require('ws');
const EventEmitter = require('events');

const FOREX_PAIRS = [
    { symbol: 'OANDA:XAU_USD', display: 'XAU/USD' },
    { symbol: 'OANDA:EUR_USD', display: 'EUR/USD' },
    { symbol: 'OANDA:GBP_USD', display: 'GBP/USD' },
    { symbol: 'OANDA:USD_JPY', display: 'USD/JPY' },
    { symbol: 'OANDA:GBP_JPY', display: 'GBP/JPY' },
    { symbol: 'OANDA:EUR_GBP', display: 'EUR/GBP' },
    { symbol: 'OANDA:AUD_USD', display: 'AUD/USD' },
    { symbol: 'OANDA:USD_CHF', display: 'USD/CHF' },
    { symbol: 'OANDA:NZD_USD', display: 'NZD/USD' },
    { symbol: 'OANDA:EUR_JPY', display: 'EUR/JPY' },
    { symbol: 'OANDA:USD_CAD', display: 'USD/CAD' },
];

class PriceService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.subscribedSymbols = new Set();
        this.latestPrices = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;
        this.isConnected = false;
    }

    connect() {
        const wsUrl = `${process.env.FINNHUB_WS_URL || 'wss://ws.finnhub.io'}?token=${process.env.FINNHUB_API_KEY}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
            console.log('[PriceService] Connected to Finnhub WebSocket');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Resubscribe all symbols after reconnect
            for (const symbol of this.subscribedSymbols) {
                this._sendSubscribe(symbol);
            }
        });

        this.ws.on('message', (data) => {
            try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'trade' && parsed.data) {
                    for (const tick of parsed.data) {
                        const symbol = tick.s;
                        const pairInfo = FOREX_PAIRS.find(p => p.symbol === symbol);

                        const priceData = {
                            symbol,
                            displaySymbol: pairInfo ? pairInfo.display : symbol,
                            price: tick.p,
                            volume: tick.v,
                            timestamp: new Date(tick.t),
                        };

                        // Calculate bid/ask/spread from price (varies by instrument)
                        let spreadPips = 0.00015; // default for major forex pairs
                        if (symbol.includes('XAU')) spreadPips = 0.30;
                        else if (symbol.includes('JPY')) spreadPips = 0.015;
                        priceData.bid = tick.p - spreadPips / 2;
                        priceData.ask = tick.p + spreadPips / 2;
                        priceData.spread = spreadPips;

                        // Update previous price for change calculation
                        const prevPrice = this.latestPrices.get(symbol);
                        if (prevPrice) {
                            priceData.change = priceData.price - prevPrice.price;
                            priceData.changePercent = ((priceData.change / prevPrice.price) * 100);
                        } else {
                            priceData.change = 0;
                            priceData.changePercent = 0;
                        }

                        this.latestPrices.set(symbol, priceData);
                        this.emit('price_update', priceData);
                    }
                }

                if (parsed.type === 'ping') {
                    // Finnhub sends pings to keep connection alive
                }
            } catch (err) {
                console.error('[PriceService] Parse error:', err.message);
            }
        });

        this.ws.on('close', () => {
            console.log('[PriceService] WebSocket disconnected');
            this.isConnected = false;
            this._reconnect();
        });

        this.ws.on('error', (err) => {
            console.error('[PriceService] WebSocket error:', err.message);
            this.isConnected = false;
        });
    }

    _reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[PriceService] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        console.log(`[PriceService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    _sendSubscribe(symbol) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        }
    }

    _sendUnsubscribe(symbol) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
        }
    }

    subscribe(symbol) {
        if (!this.subscribedSymbols.has(symbol)) {
            this.subscribedSymbols.add(symbol);
            this._sendSubscribe(symbol);
            console.log(`[PriceService] Subscribed to ${symbol}`);
        }
    }

    unsubscribe(symbol) {
        if (this.subscribedSymbols.has(symbol)) {
            this.subscribedSymbols.delete(symbol);
            this._sendUnsubscribe(symbol);
            console.log(`[PriceService] Unsubscribed from ${symbol}`);
        }
    }

    getLatestPrice(symbol) {
        return this.latestPrices.get(symbol) || null;
    }

    getAllPrices() {
        return this.latestPrices;
    }

    getSupportedPairs() {
        return FOREX_PAIRS;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

module.exports = new PriceService();
