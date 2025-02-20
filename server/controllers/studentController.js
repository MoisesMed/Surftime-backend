const Student = require('../models/Student');

exports.registerStudent = async (req, res) => {
  try {
    const newStudent = new Student(req.body);
    await newStudent.save();
    res.status(201).json({ message: 'Student registered successfully', student: newStudent });
  } catch (error) {
    res.status(500).json({ message: 'Error registering student', error: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
};