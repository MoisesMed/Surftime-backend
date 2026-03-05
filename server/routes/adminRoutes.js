const express = require('express');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');
const { getAdminDashboard } = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard', validateToken, requireAdmin, getAdminDashboard);

module.exports = router;
