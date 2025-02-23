const express = require('express');
const { createSurfSession} = require('../controllers/surfSessionController');
const requireAuth = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// This is a protected and admin-only route)
// requireAuth middleware will ensure that the user is authenticated
// requireAdmin middleware will ensure that the user is an admin
// createSurfSession controller will handle the creation of a new surf session
router.post('/create', requireAuth, requireAdmin, createSurfSession);

module.exports = router;
