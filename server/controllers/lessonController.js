const Lesson = require('../models/Lesson');
const User = require('../models/User');

exports.createLesson = async (req, res) => {
  try {
    const { date, timeSlot, location, studentLimit, schoolId } = req.body;

    if (!date || !timeSlot || !location || !studentLimit || !surfSchoolId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newLesson = new Lesson({
      date,
      timeSlot,
      location,
      studentLimit,
      schoolId,
    });

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

    if (!instructorId) {
      return res.status(400).json({ message: 'Instructor ID is required' });
    }

    // Assign the instructor to the lesson
    const lesson = await Lesson.findByIdAndUpdate(lessonId, { instructor: instructorId }, { new: true });

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
    const { studentId } = req.params;

    const lessons = await Lesson.find({ students: studentId }).populate('students');

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.getAssignedLessonsByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    const lessons = await Lesson.find({ instructors: instructorId }).populate('instructors');

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

exports.getSchoolLessons = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const lessons = await Lesson.find({ school: schoolId }).populate('school');

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}