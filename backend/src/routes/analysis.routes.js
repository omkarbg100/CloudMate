'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const { validateObjectId } = require('../middleware/validate.middleware');
const { analyzeRepository, generateArchitecture, getAnalysis } = require('../controllers/analysis.controller');

// Rate limit expensive AI endpoints — 10 requests per 10 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, error: { message: 'Too many AI requests, please slow down' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

router.post('/:id/analyze', validateObjectId('id'), aiLimiter, analyzeRepository);
router.post('/:id/architecture', validateObjectId('id'), aiLimiter, generateArchitecture);
router.get('/:id/analysis', validateObjectId('id'), getAnalysis);

module.exports = router;
