const express = require('express');
const { registerStudent, getStudents, loginStudent } = require('../controllers/studentController');
const validateToken = require('../middleware/validateToken');

const router = express.Router();

router.post('/register', registerStudent);
router.get('/', validateToken, getStudents); //route protected
router.post('/login', loginStudent);

module.exports = router;