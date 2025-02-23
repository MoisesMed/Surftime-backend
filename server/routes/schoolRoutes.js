const express = require('express');
const { createSchool, getSchoolUsers } = require('../controllers/schoolController');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.post('/create', validateToken, requireAdmin, createSchool);
router.get('/:schoolId/users', validateToken, getSchoolUsers);

module.exports = router;