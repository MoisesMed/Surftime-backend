const mongoose = require('mongoose');
const StudentProfile = require('../models/StudentProfile');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const getSchoolObject = require('../utils/getSchoolObject');
const messages = require('../resources/messages');

// Get all lessons by date
exports.getLessonsByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if(!date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Convert the date string to a Date object and set the time to 00:00:00
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    // Set the end date to the next day at 00:00:00
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Find lessons within the specified date range
    const lessons = await Lesson.find({
      date: { $gte: startDate, $lt: endDate },
    }).populate('students instructors');

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
}

// Create all lessons for a specific day (admin-only)
exports.createLessonsForDay = async (req, res) => {
  try {

    const { date, location, studentLimit } = req.body;

    const school = await getSchoolObject();
    const schoolId = school._id;
    console.log(schoolId);

    // Validate required fields
    if (!date || !location || !studentLimit || !schoolId) {
      return res.status(400).json({ message: messages.pt.allFieldsRequired });
    }

    // Define the usual time slots
    const timeSlots = [
      { start: '06:00', end: '07:00' },
      { start: '07:00', end: '08:00' },
      { start: '08:00', end: '09:00' },
      { start: '09:00', end: '10:00' },
      { start: '14:00', end: '15:00' },
      { start: '15:00', end: '16:00' },
      { start: '16:00', end: '17:00' },
    ];

    // Create lessons for each time slot
    const lessons = [];
    for (const timeSlot of timeSlots) {
      const newLesson = new Lesson({
        date: new Date(date),
        timeSlot,
        location,
        studentLimit,
        school: schoolId,
      });
      lessons.push(newLesson);
    }

    // Save all lessons to the database
    await Lesson.insertMany(lessons);

    res.status(201).json({ message: 'Lessons created successfully', lessons });
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const { date, timeSlot, location, studentLimit } = req.body;

    const school = await getSchoolObject();
    const schoolId = school._id;

    if (!date || !timeSlot || !location || !studentLimit || !schoolId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newLesson = new Lesson({
      date: new Date(date),
      timeSlot,
      location,
      studentLimit,
      school: schoolId,
    });
    console.log(newLesson);
    await newLesson.save();
    res.status(201).json({ message: 'Lesson created successfully', lesson: newLesson });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.assignInstructor = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { instructorId } = req.body;

    const lessonObj = await Lesson.findById(lessonId);
    if (!lessonObj) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const instructorObj = await User.findById(instructorId);
    if (!instructorObj || instructorObj.role !== 'instructor') {
      return res.status(400).json({ message: 'Invalid instructor ID' });
    }

    // Assign the instructor to the lesson
    const lesson = await Lesson.findByIdAndUpdate(lessonObj, { instructors: instructorObj }, { new: true });

    res.status(200).json({ message: 'Instructor assigned successfully', lesson });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.bookLesson = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { lessonId } = req.params;
    const studentId = req.user.id; //authenticated user 

    const lesson = await Lesson.findById(lessonId).session(session);

    if (!lesson) {
      return res.status(404).json({ message: messages.pt.lessonNotFound });
    }

    // Check if the student is already booked
    if (lesson.students.includes(studentId)) {
      return res.status(400).json({ message: messages.pt.lessonAlreadyBooked });
    }

    // Check if the lesson has reached the student limit
    if (lesson.students.length >= lesson.studentLimit) {
      return res.status(400).json({ message: messages.pt.lessonFull });
    }

    // Retrieve the user's profile with the studentProfile populated
    const user = await User.findById(studentId).populate('studentProfile').session(session);

    if (!user.studentProfile) {
      return res.status(400).json({ message: 'Student profile not found' });
    }

    // Check if the student has remaining lessons
    if (user.studentProfile.lessonsRemaining <= 0) {
      return res.status(400).json({ message: messages.pt.lessonCannotBook });
    }
    
    // Add the student to the lesson
    lesson.students.push(studentId);
    
    await lesson.save({ session });

    // Update the student's lesson history and lesson counts
    user.studentProfile.lessonHistory.push(lessonId);
    user.studentProfile.lessonsBooked += 1;
    user.studentProfile.lessonsRemaining -= 1;
    await user.studentProfile.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: messages.pt.lessonBooked, lesson });
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
}

exports.cancelBooking = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.user.id; //authenticated user 

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Remove the student from the lesson
    lesson.students = lesson.students.filter(student => student.toString() !== studentId);
    await lesson.save();

    res.status(200).json({ message: 'Booking cancelled successfully', lesson });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.getStudentLessons = async (req, res) => {
  try {
    const studentId = req.user.id; //authenticated user 

    const lessons = await Lesson.find({ students: studentId }).populate('students');

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.getAssignedLessonsByInstructor = async (req, res) => {
  try {
    const instructorId = req.user.id; //authenticated user 

    if (req.user.role !== 'instructor') {
      return res.status(400).json({ message: 'Invalid instructor' });
    }

    const lessons = await Lesson.find({ instructors: instructorId }).populate('instructors');

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.getSchoolLessons = async (req, res) => {
  try {
    const school = await getSchoolObject();
    const schoolId = school._id;
    
    const lessons = await Lesson.find({ school: schoolId });

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
}