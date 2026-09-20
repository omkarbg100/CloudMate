'use strict';

const Project = require('../models/Project');
const Analysis = require('../models/Analysis');

async function getProjectWithAnalysis(projectId, userId) {
  const [project, analysis] = await Promise.all([
    Project.findOne({ _id: projectId, userId }),
    Analysis.findOne({ projectId }),
  ]);
  return { project, analysis };
}

async function getUserStats(userId) {
  const [totalProjects, analyzedProjects, architectureProjects] = await Promise.all([
    Project.countDocuments({ userId }),
    Project.countDocuments({ userId, status: { $in: ['analyzed', 'architecture_generated', 'deployment_ready', 'deployed'] } }),
    Project.countDocuments({ userId, status: { $in: ['architecture_generated', 'deployment_ready', 'deployed'] } }),
  ]);
  return { totalProjects, analyzedProjects, architectureProjects };
}

module.exports = { getProjectWithAnalysis, getUserStats };
