import crypto from 'node:crypto';

// Default admin password for local / campaign deployment
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sncf2026';

// In-memory active session tokens (token -> expiry timestamp)
const activeSessions = new Map();

/**
 * Cleanup expired sessions every 10 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of activeSessions.entries()) {
    if (expiry < now) {
      activeSessions.delete(token);
    }
  }
}, 10 * 60 * 1000);

export function authenticateAdmin(password) {
  if (!password || typeof password !== 'string') {
    return { success: false, message: 'Password is required.' };
  }

  if (password.trim() === ADMIN_PASSWORD.trim()) {
    const token = crypto.randomBytes(32).toString('hex');
    // Session valid for 12 hours
    const expiry = Date.now() + 12 * 60 * 60 * 1000;
    activeSessions.set(token, expiry);
    return { success: true, token };
  }

  return { success: false, message: 'Invalid admin credentials.' };
}

export function verifySessionToken(token) {
  if (!token) return false;
  const expiry = activeSessions.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

export function invalidateToken(token) {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Express middleware to protect admin routes
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || !verifySessionToken(token)) {
    return res.status(401).json({ message: 'Unauthorized. Admin authentication required.' });
  }

  next();
}
