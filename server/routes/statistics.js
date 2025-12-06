const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

// Get all divisions
router.get('/divisions', statisticsController.getAllDivisions);

// Get specific division statistics
router.get('/divisions/:division', statisticsController.getDivisionStats);

// Get nearby infrastructure
router.get('/infrastructure/nearby', statisticsController.getNearbyInfrastructure);

// Get heatmap data
router.get('/heatmap', statisticsController.getHeatmapData);

// Get city-wide trends
router.get('/trends', statisticsController.getCityTrends);

module.exports = router;
