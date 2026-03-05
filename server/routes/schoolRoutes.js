const express = require('express');
const multer = require('multer');
const { createSchool, getSchoolUsers, getSchoolData, updateSchool, createContracts, getSchoolDataForUser, getDefaultData, getAboutUs, updateAboutUs, provisionSchool } = require('../controllers/schoolController');
const validateToken = require('../middleware/validateToken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files

// Create a new school (admin-only route)
router.post('/create', validateToken, requireAdmin, createSchool);

// Provision a new school and database (protected by PROVISION_KEY)
router.post('/provision', provisionSchool);

// Get school data (admin-only route)
router.get('/', validateToken, requireAdmin, getSchoolData);

// Update school data (admin-only route)
router.patch('/', validateToken, requireAdmin, upload.single('logo'), updateSchool);

// Get school data for a specific user
router.get('/user', getSchoolDataForUser);

// Get users of a specific school
router.get('/users', validateToken, requireAdmin, getSchoolUsers);

// Create contracts (admin-only route)
router.post('/contracts', validateToken, requireAdmin, createContracts);

// Get default lesson times
router.get('/defaultData', validateToken, requireAdmin, getDefaultData);

router.get('/about', validateToken, getAboutUs);

router.post('/about', validateToken, requireAdmin, updateAboutUs);

module.exports = router;
