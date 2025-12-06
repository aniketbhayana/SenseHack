const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

// POST /api/route
router.post('/', routeController.getRoute);

module.exports = router;
