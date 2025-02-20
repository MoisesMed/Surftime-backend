const Professor = require('../models/Professor');

exports.registerProfessor = async (req, res) => {
  try {
    const newProfessor = new Professor(req.body);
    await newProfessor.save();
    res.status(201).json({ message: 'Professor registered successfully', professor: newProfessor });
  } catch (error) {
    res.status(500).json({ message: 'Error registering professor', error: error.message });
  }
};

exports.getProfessors = async (req, res) => {
  try {
    const professors = await Professor.find();
    res.status(200).json(professors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching professors', error: error.message });
  }
};