const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const getSchoolObject = require('../utils/getSchoolObject');
const messages = require('../resources/messages');
const moment = require('moment-timezone');

// Get all lessons by date
exports.getLessonsByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if(!date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const school = await getSchoolObject();
    const schoolId = school._id;

    // Validate required fields
    if (!date  || !schoolId) {
      return res.status(400).json({ message: messages.pt.allFieldsRequired });
    }

    const { timeZone } = school.settings;

    // Create moment objects for the start and end of the day in the specified time zone
    const startOfDay = moment.tz(date, 'YYYY-MM-DD', timeZone).startOf('day');
    const endOfDay = moment.tz(date, 'YYYY-MM-DD', timeZone).endOf('day');

    // Find lessons for the specified day
    const lessons = await Lesson.find({
      startTime: { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() },
    }).populate('instructors students');

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { lessonId } = req.params;
    const studentId = req.user.id; //authenticated user 

    const lesson = await Lesson.findById(lessonId).session(session);

    if (!lesson) {
      return res.status(404).json({ message: messages.pt.lessonNotFound });
    }

    // Retrieve the school's time zone from the lesson
    const school = await getSchoolObject();
    const timeZone = school.settings.timeZone;

    // Check if the cancellation is less than 12 hours before the lesson starts
    const now = moment.tz(timeZone);
    const lessonStartTime = moment.tz(lesson.startTime, timeZone);
    const hoursDifference = lessonStartTime.diff(now, 'hours');
    if (hoursDifference < 12) {
      return res.status(400).json({ message: messages.pt.lessonCannotCancel });
    }

    // Remove the student from the lesson
    lesson.students = lesson.students.filter(student => student.toString() !== studentId);
    await lesson.save({ session });

    // Update the student's lesson history and lesson counts
    const user = await User.findById(studentId).populate('studentProfile').session(session);
   
    if (!user.studentProfile) {
      return res.status(400).json({ message: 'Student profile not found' });
    }

    user.studentProfile.lessonHistory = user.studentProfile.lessonHistory.filter(lesson => lesson.toString() !== lessonId);
    user.studentProfile.lessonsBooked -= 1;
    user.studentProfile.lessonsRemaining += 1;
    await user.studentProfile.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Booking cancelled successfully', lesson });
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
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


//Admin
// Create all lessons for a specific day (admin-only)
exports.createLessonsForDay = async (req, res) => {
  try {

    const { date, location, studentLimit } = req.body;

    const school = await getSchoolObject();
    const schoolId = school._id;

    // Validate required fields
    if (!date || !location || !studentLimit || !schoolId) {
      return res.status(400).json({ message: messages.pt.allFieldsRequired });
    }

    const { lessonDuration, timeZone } = school.settings;
    
    const startTimes = ['06:00', '07:00', '08:00', '09:00', '14:00', '15:00', '16:00'];

    // Create lessons for each start time
    const lessons = [];
    for (const startTimeStr of startTimes) {
      // Create a moment object for the start time in the specified time zone
      const startTime = moment.tz(`${date} ${startTimeStr}`, timeZone);
      // Calculate end time based on duration
      const endTime = startTime.clone().add(lessonDuration, 'minutes');

      const newLesson = new Lesson({
        startTime: startTime.toDate(),
        endTime: endTime.toDate(),
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
    const {startTime, location, studentLimit } = req.body;

    const school = await getSchoolObject();
    const schoolId = school._id;

    if (!startTime || !location || !studentLimit || !schoolId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const { lessonDuration, timeZone } = school.settings;

    // Create a moment object for the start time in the specified time zone
    const lessonStartTime = moment.tz(`${startTime}`, timeZone);

    // Calculate end time based on duration
    const lessonEndTime = lessonStartTime.clone().add(lessonDuration, 'minutes');

    // Create a new lesson
    const newLesson = new Lesson({
      startTime: lessonStartTime,
      endTime: lessonEndTime,
      location,
      studentLimit,
      school: schoolId,
    });

    await newLesson.save();
    res.status(201).json({ message: 'Lesson created successfully', lesson: newLesson });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.getBookedLessonsPerStudent = async (req, res) => {
  try {
    const studentId = req.user.id; // Get the student ID from the authenticated user

    // Find lessons where the authenticated user is booked
    const lessons = await Lesson.find({
      students: studentId,
    });

    res.status(200).json({ lessons });
  } catch (error) {
    console.error('Error retrieving booked lessons per student:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
