const express = require('express');
const { getTodaysLessonsByStudent, getBookedLessonsPerStudent, getAssignedLessonsByInstructor, createLesson, assignInstructor, assignInstructorToLessons, removeInstructorFromLesson, getLessonsByInstructor, bookLesson, cancelBooking, getSchoolLessons, getLessonsByDate, createLessonsForDay, getNextLessonByStudent } = require('../controllers/lessonController');
const requireAuth = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

//Get school lessons
router.get('/', requireAuth, getSchoolLessons);

// Get today's lessons booked by the authenticated student
router.get('/today', requireAuth, getTodaysLessonsByStudent);

//Get the next lesson booked by authenticated student
router.get('/next', requireAuth, getNextLessonByStudent);

// Get all lessons for an instructor
router.get('/instructor', requireAuth, getAssignedLessonsByInstructor);

//Get lessons by date
router.get('/:date', requireAuth, getLessonsByDate);

// Create all lessons for a specific day (admin-only route)
router.post('/create-by-date', requireAuth, requireAdmin, createLessonsForDay);

// Create a lesson (admin-only route)
router.post('/create', requireAuth, requireAdmin, createLesson);

// Assign an instructor to a lesson (admin-only route)
router.post('/:lessonId/assign-instructor', requireAuth, requireAdmin, assignInstructor);

router.patch('/assign-instructor', requireAuth, requireAdmin, assignInstructorToLessons);

// Remove an instructor from a lesson (admin-only route)
router.patch('/:lessonId/remove-instructor', requireAuth, requireAdmin, removeInstructorFromLesson);

// Get all lessons for a specific instructor
router.get('/instructor/:instructorId', requireAuth, getLessonsByInstructor);

// Book a lesson
router.post('/:lessonId/book', requireAuth, bookLesson);

// Cancel booking
router.post('/:lessonId/cancel-booking', requireAuth, cancelBooking);

// Get all booked lessons for a student
router.get('/student/booked', requireAuth, getBookedLessonsPerStudent);



module.exports = router;
