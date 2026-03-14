async function writeAuditLog(req, payload) {
  try {
    const { AuditLog } = req.models || {};
    if (!AuditLog) return;

    const actor = {
      userId: req.user?.id || null,
      role: req.user?.role || null,
      isAdmin: Boolean(req.user?.isAdmin),
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };

    const requestData = {
      method: req.method,
      path: req.originalUrl || req.path,
      requestId: req.requestId || req.headers['x-request-id'] || null,
    };

    await AuditLog.create({
      ...payload,
      actor,
      request: requestData,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[AUDIT_LOG_WRITE_ERROR]', error.message);
  }
}

module.exports = { writeAuditLog };
