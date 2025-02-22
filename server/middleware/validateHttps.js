function validateHttps(req, res, next) {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    res.redirect(`https://${req.headers.host}${req.url}`);
  }
  
  module.exports = validateHttps;