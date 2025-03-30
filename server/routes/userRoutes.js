const express = require('express');
const { body, validationResult} = require('express-validator');
const { assignContractToStudent, getStudentLessonHistory, registerUser, getUsers, loginUser, validateEmail, requestPasswordReset, resetPassword, getAuthenticatedUserData, editUserInfo, getActiveNonExperimentalContracts } = require('../controllers/userController');
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
router.get('/me', validateToken, getAuthenticatedUserData);
// Edit user information (admin-only route)
router.put('/:userId', validateToken, requireAdmin, editUserInfo);
router.patch('/:userId/assign-contract', validateToken, requireAdmin, assignContractToStudent);
// router.patch('/:userId/remove-contract', validateToken, requireAdmin, removeContractFromStudent);
// Get count of students with active non-experimental contracts (admin-only route)
router.get('/active-contracts', validateToken, requireAdmin, getActiveNonExperimentalContracts);


module.exports = router;