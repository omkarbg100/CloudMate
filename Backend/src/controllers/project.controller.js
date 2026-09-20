'use strict';

const Project = require('../models/Project');
const Analysis = require('../models/Analysis');

async function createProject(req, res, next) {
  try {
    const { name, repoUrl, branch, region, requirements } = req.body;
    const project = await Project.create({
      userId: req.user._id,
      name,
      repoUrl,
      branch: branch || 'main',
      region: region || 'ap-south-1',
      requirements: requirements || '',
    });
    res.status(201).json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
}

async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { projects } });
  } catch (err) {
    next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }
    res.json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
}

async function updateProject(req, res, next) {
  try {
    const allowedFields = ['name', 'branch', 'region', 'requirements', 'status'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }

    res.json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }
    // Clean up associated analysis
    await Analysis.deleteOne({ projectId: req.params.id });
    res.json({ success: true, data: { message: 'Project deleted' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };
