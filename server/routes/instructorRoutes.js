const express = require('express');
const { assignInstructorRole, getInstructorLessons } = require('../controllers/instructorController');
const authenticateToken = require('../middleware/validateToken');
const authorizeAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Assign instructor role and create profile (admin-only route)
router.patch('/:instructorId/assign-role', authenticateToken, authorizeAdmin, assignInstructorRole);

// Get all lessons assigned to an instructor
router.get('/:instructorId/lessons', authenticateToken, getInstructorLessons);

module.exports = router;