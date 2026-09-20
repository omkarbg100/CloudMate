'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, me, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: { message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/register',
  authLimiter,
  validate({
    name: { required: true, maxLength: 80 },
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
  }),
  register
);

router.post(
  '/login',
  authLimiter,
  validate({
    email: { required: true, type: 'email' },
    password: { required: true },
  }),
  login
);

router.get('/me', protect, me);
router.post('/logout', protect, logout);

module.exports = router;
