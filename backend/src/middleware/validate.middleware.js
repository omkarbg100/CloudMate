'use strict';

const mongoose = require('mongoose');

/**
 * Creates an Express middleware that validates the request body against a schema.
 * schema: { fieldName: { required, type, maxLength, match, enum } }
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rules.type === 'email') {
          if (!/^\S+@\S+\.\S+$/.test(value)) {
            errors.push(`${field} must be a valid email address`);
          }
        }
        if (rules.maxLength && String(value).length > rules.maxLength) {
          errors.push(`${field} cannot exceed ${rules.maxLength} characters`);
        }
        if (rules.minLength && String(value).length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.match && !rules.match.test(value)) {
          errors.push(`${field} format is invalid`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: errors.join('. ') },
      });
    }

    next();
  };
}

/**
 * Validates that req.params.id is a valid MongoDB ObjectId
 */
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid ID format' },
      });
    }
    next();
  };
}

module.exports = { validate, validateObjectId };
