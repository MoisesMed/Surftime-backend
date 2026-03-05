const express = require('express');
const { body, validationResult } = require('express-validator');
const {
    assignContractToStudent,
    getStudentLessonHistory,
    registerUser,
    getUsers,
    loginUser,
    validateEmail,
    requestPasswordReset,
    resetPassword,
    getAuthenticatedUserData,
    changeAuthenticatedUserPassword,
    editUserInfo,
    getActiveNonExperimentalContracts,
    countActiveNonExperimentalContracts
} = require('../controllers/userController');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Register a new user
router.post('/register', [
    body('fullName').isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('phoneNumber').isLength({ min: 10 }),
    body('birthday').isISO8601(),
    body('cpf').optional({ checkFalsy: true }).isLength({ min: 11 }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
], registerUser);

// Login user
router.post('/login', loginUser);

// Validate email
router.get('/validate-email', validateEmail);

// Request password reset
router.post('/request-password-reset', requestPasswordReset);

// Reset password
router.post('/reset-password', resetPassword);

// Get authenticated user data
router.get('/me', validateToken, getAuthenticatedUserData);
router.patch('/me/change-password', validateToken, changeAuthenticatedUserPassword);

// Get student lesson history
router.get('/lesson-history', validateToken, getStudentLessonHistory);

// Get all users (admin-only route)
router.get('/', validateToken, requireAdmin, getUsers);

// Edit user information (admin-only route)
router.put('/:userId', validateToken, requireAdmin, editUserInfo);

// Assign contract to student (admin-only route)
router.patch('/:userId/assign-contract', validateToken, requireAdmin, assignContractToStudent);

// Get active non-experimental contracts (admin-only route)
router.get('/active-contracts', validateToken, requireAdmin, getActiveNonExperimentalContracts);

// Get count of students with active non-experimental contracts (admin-only route)
router.get('/active-contracts/count', validateToken, requireAdmin, countActiveNonExperimentalContracts);

module.exports = router;
