const express = require('express');
const { registerProfessor, getProfessors } = require('../controllers/professorController');

const router = express.Router();

router.post('/register', registerProfessor);
router.get('/', getProfessors);

module.exports = router;