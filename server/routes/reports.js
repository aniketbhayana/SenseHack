const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// GET /api/reports?bbox=x,y,x,y
router.get('/', reportsController.getReports);

// POST /api/reports
router.post('/', reportsController.createReport);

// GET /api/reports/categories
router.get('/categories', reportsController.getCategories);

// GET /api/reports/stats
router.get('/stats', reportsController.getStats);

module.exports = router;
