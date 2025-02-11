const express = require('express');
const { validatePhoneNumber } = require('../controllers/validatePhoneNumber');

const router = express.Router();

router.get('/validate-phone', validatePhoneNumber);

module.exports = router;