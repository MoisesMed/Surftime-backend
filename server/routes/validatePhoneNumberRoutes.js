const express = require('express');
const { validatePhoneNumber } =  require('../controllers/validatePhoneNumberController');

const router = express.Router();

router.get('/', validatePhoneNumber);

module.exports = router;