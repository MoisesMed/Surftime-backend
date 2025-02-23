const express = require('express');
const { registerUser, getUsers, loginUser } = require('../controllers/userController');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.post('/register', registerUser);
router.get('/', validateToken, requireAdmin, getUsers); //route protected
router.post('/login', loginUser);

module.exports = router;