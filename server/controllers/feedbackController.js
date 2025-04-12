const Feedback = require('../models/Feedback');
const Lesson = require('../models/Lesson');
const moment = require('moment-timezone');
const getSchoolObject = require('../utils/getSchoolObject');

// Submit feedback for a lesson
exports.submitFeedback = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { rating, comment, anonymous } = req.body; // Get rating, comment, and anonymity flag from request body
        const userId = req.user.id; // Get the student ID from the authenticated user
        const school = await getSchoolObject();
        const timeZone = school.settings.timeZone;

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Find the lesson
        const lesson = await Lesson.findById(lessonId);

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        const now = moment.tz(timeZone);
        const lessonEndTime = moment.tz(lesson.endTime, timeZone);

        // Check if the lesson has already ended
        if (lessonEndTime > now) {
            return res.status(400).json({ message: 'Feedback can only be submitted after the lesson has ended' });
        }

        // Check if feedback already exists for this lesson by this user
        const existingFeedback = await Feedback.findOne({ lesson: lessonId, user: userId });
        if (existingFeedback) {
            return res.status(400).json({ message: 'Feedback already submitted for this lesson' });
        }

        // Check if the user is enrolled in the lesson
        if (!lesson.students.includes(userId)) {
            return res.status(403).json({ message: 'You are not enrolled in this lesson' });
        }

        // Check if the lesson is in the past
        if (lessonEndTime <= now.clone().subtract(7, 'days')) {
            return res.status(400).json({ message: 'Feedback can only be submitted for lessons within the past 7 days' });
        }

        // Create a new feedback entry
        const feedback = new Feedback({
            lesson: lessonId,
            rating,
            comment,
            anonymous: anonymous !== undefined ? anonymous : true, // Default to true if not provided
            user: anonymous ? undefined : userId, // Link to user if not anonymous
        });

        // Save the feedback to the database
        await feedback.save();

        res.status(201).json({ message: 'Feedback submitted successfully', feedback });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get feedback by lesson
exports.getFeedbackByLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        // Find feedback for the specified lesson
        const feedbacks = await Feedback.find({ lesson: lessonId }).populate('user');

        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error('Error retrieving feedback by lesson:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get feedback by date of lessons
exports.getFeedbackByDate = async (req, res) => {
    try {
        const { date } = req.params;

        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const school = await getSchoolObject();
        const timeZone = school.settings.timeZone;

        // Get the start and end of the specified day in the specified time zone
        const startOfDay = moment.tz(date, 'YYYY-MM-DD', timeZone).startOf('day').toDate();
        const endOfDay = moment.tz(date, 'YYYY-MM-DD', timeZone).endOf('day').toDate();

        // Find lessons within the specified date range
        const lessons = await Lesson.find({
            startTime: { $gte: startOfDay, $lte: endOfDay },
        });

        // Extract lesson IDs
        const lessonIds = lessons.map(lesson => lesson._id);

        // Find feedback for the lessons on the specified date
        const feedbacks = await Feedback.find({ lesson: { $in: lessonIds } }).populate('user');

        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error('Error retrieving feedback by date:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get all feedbacks (admin-only)
exports.getAllFeedbacks = async (req, res) => {
    try {
        // Find all feedbacks
        const feedbacks = await Feedback.find().populate('user lesson');

        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error('Error retrieving all feedbacks:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get feedback by user (admin-only)
exports.getFeedbackByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find feedback submitted by the specified user
        const feedbacks = await Feedback.find({ user: userId }).populate('lesson', 'startTime endTime');

        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error('Error retrieving feedback by user:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get all feedbacks by the authenticated user
exports.getUserFeedbacks = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find feedback submitted by the authenticated user
        const feedbacks = await Feedback.find({ user: userId }).populate('lesson', 'startTime endTime');

        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error('Error retrieving user feedbacks:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};