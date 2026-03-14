const crypto = require('crypto');

function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    const payload = {
      type: 'http_request',
      at: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: Number(elapsedMs.toFixed(2)),
      userId: req.user?.id || null,
      tenant: req.tenant?.dbName || null,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
    };

    const line = JSON.stringify(payload);
    if (res.statusCode >= 500) {
      console.error(line);
      return;
    }
    if (res.statusCode >= 400) {
      console.warn(line);
      return;
    }
    console.log(line);
  });

  next();
}

module.exports = requestLogger;
