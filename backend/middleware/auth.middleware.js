/**
 * auth.middleware.js — NeprasPro Security & RBAC Middleware
 * Provides Token Verification, Role Enforcement, and Fine-Grained Permission Guards.
 */

const crypto = require('crypto');
const db = require('../config/db');

// Secret key for signature generation (persistent fallback)
const JWT_SECRET = process.env.NEPRAS_JWT_SECRET || 'nepras-pro-security-enterprise-token-2026';

/**
 * Generate a signed session token
 * Payload format: { userId, username, roles, permissions, roleScopes, exp }
 */
function generateToken(payload, expiresInHours = 24) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + (expiresInHours * 3600);
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h64 = encode(header);
  const p64 = encode(fullPayload);

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${h64}.${p64}`)
    .digest('base64url');

  return `${h64}.${p64}.${signature}`;
}

/**
 * Verify and decode session token
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${h64}.${p64}`)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (_) {
    return null;
  }
}

/**
 * Extract token from request
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }
  return null;
}

/**
 * requireAuth middleware
 */
const requireAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'غير مصرح بالدخول. يرجى تسجيل الدخول أولاً.',
      code: 'AUTH_REQUIRED'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'انتهت صلاحية الجلسة أو رمز الدخول غير صالح.',
      code: 'TOKEN_INVALID'
    });
  }

  req.user = decoded;
  next();
};

/**
 * Optional Auth middleware (attaches req.user if token present, does not block)
 */
const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
};

/**
 * requirePermission middleware guard
 * @param {string} permKey - Required permission key (e.g. 'students.create', 'control.input_marks')
 */
const requirePermission = (permKey) => {
  return (req, res, next) => {
    // Allow super_admin or admin username
    if (req.user?.username === 'admin' || req.user?.roles?.includes('super_admin')) {
      return next();
    }

    const perms = req.user?.permissions || [];
    if (perms.includes(permKey)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `عفواً، لا تملك الصلاحية المطلوبة لتنفيذ هذا الإجراء (${permKey}).`,
      code: 'PERMISSION_DENIED',
      requiredPermission: permKey
    });
  };
};

/**
 * requireRole middleware guard
 * @param {string|string[]} roles - Role name or array of role names
 */
const requireRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (req.user?.username === 'admin' || req.user?.roles?.includes('super_admin')) {
      return next();
    }

    const userRoles = req.user?.roles || [];
    const hasRole = allowed.some(r => userRoles.includes(r));

    if (hasRole) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'عفواً، ليس لديك الدور الوظيفي المصرح له بدخول هذا القطاع.',
      code: 'ROLE_DENIED'
    });
  };
};

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requirePermission,
  requireRole
};
