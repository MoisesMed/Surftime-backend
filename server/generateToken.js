const crypto = require('crypto');

// Generate a random 64-character secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('Generated JWT Secret:', jwtSecret);