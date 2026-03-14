function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    type: 'unhandled_error',
    at: new Date().toISOString(),
    requestId: req.requestId || req.headers['x-request-id'] || null,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: status,
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    userId: req.user?.id || null,
    tenant: req.tenant?.dbName || null,
  };

  console.error(JSON.stringify(payload));

  if (res.headersSent) {
    return next(err);
  }

  return res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
    requestId: payload.requestId,
  });
}

module.exports = errorHandler;
