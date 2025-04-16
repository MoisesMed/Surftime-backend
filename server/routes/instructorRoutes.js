const express = require('express');
const { assignInstructorRole, getInstructorLessons, getAllInstructors } = require('../controllers/instructorController');
const authenticateToken = require('../middleware/validateToken');
const authorizeAdmin = require('../middleware/requireAdmin');

const router = express.Router();

//Get all instructors
router.get('/', authenticateToken, authorizeAdmin, getAllInstructors);

// Assign instructor role and create profile (admin-only route)
router.patch('/:instructorId/assign-role', authenticateToken, authorizeAdmin, assignInstructorRole);

// Get all lessons assigned to an instructor
router.get('/:instructorId/lessons', authenticateToken, getInstructorLessons);

module.exports = router;