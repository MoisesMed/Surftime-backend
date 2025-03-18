const express = require('express');
const multer = require('multer');
const { createSchool, getSchoolUsers, getSchoolData, updateSchool } = require('../controllers/schoolController');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files

router.get('/', validateToken, requireAdmin, getSchoolData);
router.patch('/', validateToken, requireAdmin, upload.single('logo'), updateSchool);
router.post('/create', validateToken, requireAdmin, createSchool);
router.get('/:schoolId/users', validateToken, getSchoolUsers);

module.exports = router;