require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const setupRoutes = require('./routes/setupRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const priceRoutes = require('./routes/priceRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const documentRoutes = require('./routes/documentRoutes');

// Import Services
const priceService = require('./services/priceService');
const AlertService = require('./services/alertService');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/setups', setupRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/documents', documentRoutes);

// Simple test route
app.get('/', (req, res) => {
    res.send('Trade Journal Pro Backend is running! (PostgreSQL + Real-time Forex & SMC/ICT Analysis)');
});

// ==========================================
// Socket.io Authentication Middleware
// ==========================================
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

// ==========================================
// Socket.io Connection Handler
// ==========================================
io.on('connection', (socket) => {
    console.log(`[Socket.io] User connected: ${socket.userId}`);

    // Join user-specific room for alerts
    socket.join(`user:${socket.userId}`);

    // Subscribe to a forex pair
    socket.on('subscribe_pair', (symbol) => {
        socket.join(`pair:${symbol}`);
        priceService.subscribe(symbol);

        // Send latest cached price immediately
        const latest = priceService.getLatestPrice(symbol);
        if (latest) {
            socket.emit('price_update', latest);
        }
        console.log(`[Socket.io] ${socket.userId} subscribed to ${symbol}`);
    });

    // Unsubscribe from a forex pair
    socket.on('unsubscribe_pair', (symbol) => {
        socket.leave(`pair:${symbol}`);
        console.log(`[Socket.io] ${socket.userId} unsubscribed from ${symbol}`);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.io] User disconnected: ${socket.userId}`);
    });
});

// ==========================================
// Price Service -> Socket.io Bridge
// ==========================================
priceService.on('price_update', (data) => {
    io.to(`pair:${data.symbol}`).emit('price_update', data);
});

// ==========================================
// Start Services
// ==========================================
if (process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'your_finnhub_api_key_here') {
    priceService.connect();
    console.log('[Server] Price service started');
} else {
    console.warn('[Server] FINNHUB_API_KEY not set - price service disabled');
}

// Start Alert Engine
const alertService = new AlertService(io);
alertService.start(10000);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
async function main() {
    try {
        await prisma.$connect();
        console.log('PostgreSQL connected successfully (Neon)');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Socket.io ready for connections`);
        });
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
