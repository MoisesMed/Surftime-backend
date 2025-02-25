const express = require('express');
const { getStudentLessons, getAssignedLessonsByInstructor, createLesson, assignInstructor, bookLesson, cancelBooking, getSchoolLessons } = require('../controllers/lessonController');
const requireAuth = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Create a lesson (admin-only route)
router.post('/create', requireAdmin, requireAuth, createLesson);

// Assign an instructor to a lesson (admin-only route)
router.post('/:lessonId/assign-instructor', requireAdmin, requireAuth, assignInstructor);

// Book a lesson
router.post('/:lessonId/book', requireAuth, bookLesson);

// Get all lessons for a student
router.get('/student/:studentId', requireAuth, getStudentLessons);

// Cancel booking
router.get('/:lessonId/cancel-booking', requireAuth, cancelBooking);

// Get all lessons for an instructor
router.get('/instructor/:instructorId', requireAuth, getAssignedLessonsByInstructor);

//Get school lessons
router.get('/school/:schoolId', requireAuth, getSchoolLessons);

module.exports = router;
