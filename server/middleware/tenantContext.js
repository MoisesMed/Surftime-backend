const mongoose = require('mongoose');
const { getModels } = require('../models');

const connectionCache = new Map();
const schoolExistsCache = new Map();

function parseSubdomain(host) {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();
  if (hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }

  return null;
}

function isLocalHost(host) {
  if (!host) return false;
  const hostname = host.split(':')[0].toLowerCase();
  return hostname === 'localhost' || hostname.endsWith('.localhost') || /^[0-9.]+$/.test(hostname);
}

async function getConnection(baseUri, dbName) {
  const cacheKey = dbName.toLowerCase();
  if (connectionCache.has(cacheKey)) {
    return connectionCache.get(cacheKey);
  }

  const conn = await mongoose
    .createConnection(baseUri, { dbName })
    .asPromise();
  connectionCache.set(cacheKey, conn);
  return conn;
}

async function hasSchool(conn) {
  const cacheKey = conn.name || conn.db?.databaseName;
  if (cacheKey && schoolExistsCache.has(cacheKey)) {
    return schoolExistsCache.get(cacheKey);
  }

  const { School } = getModels(conn);
  const exists = !!(await School.exists({}));
  if (cacheKey) {
    schoolExistsCache.set(cacheKey, exists);
  }
  return exists;
}

module.exports = async function tenantContext(req, res, next) {
  try {
    // Allow provisioning and public catalog without tenant context
    if (
      req.path === '/api/school/provision' ||
      req.path === '/api/schools'
    ) {
      return next();
    }

    const baseUri =
      process.env.MONGODB_BASE_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI;

    if (!baseUri) {
      return res
        .status(500)
        .json({ message: 'MONGODB_BASE_URI is not configured' });
    }

    const requestedSubdomain = parseSubdomain(req.headers.host);
    const localHost = isLocalHost(req.headers.host);
    const fallbackSubdomain =
      process.env.DEFAULT_SUBDOMAIN || (localHost ? 'dosanjos' : null);
    const tenantCandidates = [
      requestedSubdomain,
      fallbackSubdomain,
    ].filter(Boolean);
    console.log('[tenantContext]', {
      host: req.headers.host,
      requestedSubdomain,
      fallbackSubdomain,
      tenantCandidates,
    });

    if (!tenantCandidates.length) {
      return res.status(404).json({
        message: 'School not found',
        code: 'SCHOOL_NOT_FOUND',
      });
    }

    let conn = null;
    let activeSubdomain = null;
    let tenantDbName = null;

    for (const candidate of [...new Set(tenantCandidates)]) {
      const candidateConn = await getConnection(baseUri, candidate);
      const exists = await hasSchool(candidateConn);
      if (exists) {
        conn = candidateConn;
        activeSubdomain = candidate;
        tenantDbName = candidate;
        break;
      }
    }

    if (!conn) {
      return res.status(404).json({
        message: 'School not found',
        code: 'SCHOOL_NOT_FOUND',
      });
    }

    req.tenant = {
      subdomain: activeSubdomain,
      dbName: tenantDbName,
    };
    req.models = getModels(conn);
    next();
  } catch (error) {
    next(error);
  }
};
