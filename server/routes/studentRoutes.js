const express = require('express');
const { registerStudent, getStudents } = require('../controllers/studentController');

const router = express.Router();

router.post('/register', registerStudent);
router.get('/', getStudents);

module.exports = router;