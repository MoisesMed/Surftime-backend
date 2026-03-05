const express = require('express');
const {
  assignInstructorRole,
  removeInstructorRole,
  getInstructorLessons,
  getAllInstructors,
  getPublicInstructors,
} = require('../controllers/instructorController');
const authenticateToken = require('../middleware/validateToken');
const authorizeAdmin = require('../middleware/requireAdmin');

const router = express.Router();

//Get all instructors
router.get('/', authenticateToken, authorizeAdmin, getAllInstructors);
router.get('/public', authenticateToken, getPublicInstructors);

// Assign instructor role and create profile (admin-only route)
router.patch('/:instructorId/assign-role', authenticateToken, authorizeAdmin, assignInstructorRole);
// Remove instructor role and profile (admin-only route)
router.patch('/:instructorId/remove-role', authenticateToken, authorizeAdmin, removeInstructorRole);

// Get all lessons assigned to an instructor
router.get('/:instructorId/lessons', authenticateToken, getInstructorLessons);

module.exports = router;
