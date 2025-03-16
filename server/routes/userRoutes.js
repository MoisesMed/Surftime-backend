const express = require('express');
const { body, validationResult} = require('express-validator');
const { getStudentLessonHistory, registerUser, getUsers, loginUser, validateEmail, requestPasswordReset, resetPassword } = require('../controllers/userController');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');


const router = express.Router();

router.post('/register', [
    body('fullName').isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('phoneNumber').isLength({ min: 10 }),
    body('birthday').isISO8601(),
    body('cpf').isLength({ min: 11 }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
], registerUser);
router.get('/', validateToken, requireAdmin, getUsers); //route protected
router.post('/login', loginUser);
router.get('/validate-email', validateEmail);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/lesson-history', validateToken, getStudentLessonHistory);

module.exports = router;