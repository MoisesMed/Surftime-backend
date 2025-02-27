const Lesson = require('../models/Lesson');
const User = require('../models/User');
const getSchoolObject = require('../utils/getSchoolObject');

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
  try {
    const { lessonId } = req.params;
    const studentId = req.user.id; //authenticated user 

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check if the student is already booked
    if (lesson.students.includes(studentId)) {
      return res.status(400).json({ message: 'Student is already booked for this lesson' });
    }

    // Check if the lesson has reached the student limit
    if (lesson.students.length >= lesson.studentLimit) {
      return res.status(400).json({ message: 'Lesson is full' });
    }

    // Add the student to the lesson
    lesson.students.push(studentId);
    await lesson.save();

    res.status(200).json({ message: 'Lesson booked successfully', lesson });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
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
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}