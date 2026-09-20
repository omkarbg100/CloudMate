'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { validateObjectId, validate } = require('../middleware/validate.middleware');
const {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} = require('../controllers/project.controller');

router.use(protect);

router.get('/', listProjects);

router.post(
  '/',
  validate({
    name: { required: true, maxLength: 120 },
    repoUrl: { required: true, match: /^https?:\/\/.+/ },
  }),
  createProject
);

router.get('/:id', validateObjectId('id'), getProject);
router.patch('/:id', validateObjectId('id'), updateProject);
router.delete('/:id', validateObjectId('id'), deleteProject);

module.exports = router;
