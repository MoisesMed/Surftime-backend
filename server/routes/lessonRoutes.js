const express = require('express');
const { getStudentLessons, getAssignedLessonsByInstructor, createLesson, assignInstructor, bookLesson, cancelBooking, getSchoolLessons, getLessonsByDate, createLessonsForDay } = require('../controllers/lessonController');
const requireAuth = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

//Get school lessons
router.get('/', requireAuth, getSchoolLessons);

//Get lessons by date
router.get('/:date', requireAuth, getLessonsByDate);

// Create all lessons for a specific day (admin-only route)
router.post('/create-by-date', requireAuth, requireAdmin, createLessonsForDay);

// Create a lesson (admin-only route)
router.post('/create', requireAuth, requireAdmin, createLesson);

// Assign an instructor to a lesson (admin-only route)
router.post('/:lessonId/assign-instructor', requireAuth, requireAdmin, assignInstructor);

// Book a lesson
router.post('/:lessonId/book', requireAuth, bookLesson);

// Get all lessons for a student
router.get('/student', requireAuth, getStudentLessons);

// Cancel booking
router.get('/:lessonId/cancel-booking', requireAuth, cancelBooking);

// Get all lessons for an instructor
router.get('/instructor', requireAuth, getAssignedLessonsByInstructor);

module.exports = router;
