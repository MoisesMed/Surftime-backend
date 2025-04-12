const express = require('express');
const { submitFeedback, getFeedbackByLesson, getFeedbackByDate, getAllFeedbacks, getFeedbackByUser, getUserFeedbacks } = require('../controllers/feedbackController');
const authenticateToken = require('../middleware/validateToken');
const authorizeAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Submit feedback for a lesson
router.post('/:lessonId', authenticateToken, submitFeedback);

// Get feedback by lesson
router.get('/lesson/:lessonId', authenticateToken, authorizeAdmin, getFeedbackByLesson);

// Get all feedbacks (admin-only route)
router.get('/all', authenticateToken, authorizeAdmin, getAllFeedbacks);

// Get all feedbacks by the authenticated user
router.get('/my-feedbacks', authenticateToken, getUserFeedbacks);

// Get feedback by user (admin-only route)
router.get('/user/:userId', authenticateToken, authorizeAdmin, getFeedbackByUser);

// Get feedback by date of lessons
router.get('/:date', authenticateToken, authorizeAdmin, getFeedbackByDate);





module.exports = router;