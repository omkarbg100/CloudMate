'use strict';

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Extracts JWT from either:
 *   1. Authorization: Bearer <token> header
 *   2. HTTP-only cookie: token=<token>
 */
function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7);
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

async function protect(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'User not found' } });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: { message: 'Session expired, please log in again' } });
    }
    return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
  }
}

module.exports = { protect };
