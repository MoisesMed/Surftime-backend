const express = require('express');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');
const { getAdminDashboard, getAuditLogs } = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard', validateToken, requireAdmin, getAdminDashboard);
router.get('/audit-logs', validateToken, requireAdmin, getAuditLogs);

module.exports = router;
