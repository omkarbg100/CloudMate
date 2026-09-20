'use strict';

const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const env = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function sendTokenResponse(res, user, statusCode = 200) {
  const token = signToken({ id: user._id });
  res
    .cookie('token', token, COOKIE_OPTIONS)
    .status(statusCode)
    .json({
      success: true,
      data: {
        token, // also return in body for clients that prefer Authorization header
        user: user.toSafeObject(),
      },
    });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'Email already registered' } });
    }

    const user = await User.create({ name, email, passwordHash: password });
    sendTokenResponse(res, user, 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
    }

    sendTokenResponse(res, user);
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
}

async function logout(req, res) {
  res.clearCookie('token', COOKIE_OPTIONS).json({ success: true, data: { message: 'Logged out' } });
}

module.exports = { register, login, me, logout };
