const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const initSchema = require('./db/init');
require('dotenv').config();

const reportsRoutes = require('./routes/reports');
const routeRoutes = require('./routes/route');
const statisticsRoutes = require('./routes/statistics');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting (Basic)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Routes
app.use('/api/reports', reportsRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/stats', statisticsRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send({ status: 'ok', service: 'safety-map-backend' });
});

// Initialize DB and Start Server
initSchema().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
