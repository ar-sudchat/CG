require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors

const app = express();
const PORT = process.env.PORT || 5000;

// Import Routes
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const setupRoutes = require('./routes/setupRoutes');
const tradeRoutes = require('./routes/tradeRoutes');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors()); // Use cors middleware
app.use(express.json({ limit: '50mb' })); // Allow larger JSON bodies for images (if storing base64)

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/setups', setupRoutes);
app.use('/api/trades', tradeRoutes);

// Simple test route
app.get('/', (req, res) => {
    res.send('Trade Journal Pro Backend is running!');
});

// Error handling middleware (optional but good practice)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});