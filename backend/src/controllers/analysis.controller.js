'use strict';

const Project = require('../models/Project');
const Analysis = require('../models/Analysis');
const aiService = require('../services/ai.service');
const logger = require('../utils/logger');

/**
 * POST /api/projects/:id/analyze
 * Runs repository analysis via the FastAPI AI service and persists results.
 */
async function analyzeRepository(req, res, next) {
  let project;
  try {
    project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }

    // Mark project as analyzing
    project.status = 'analyzing';
    await project.save();

    logger.info(`[analysis] Starting repo analysis for project ${project._id}: ${project.repoUrl}`);

    const analysisResult = await aiService.analyzeRepository(project.repoUrl, project.region);

    // Persist analysis
    const analysis = await Analysis.findOneAndUpdate(
      { projectId: project._id },
      {
        projectId: project._id,
        userId: req.user._id,
        repositoryAnalysis: analysisResult.summary,
        region: project.region,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update project status
    project.status = 'analyzed';
    await project.save();

    logger.info(`[analysis] Completed for project ${project._id}`);

    res.json({
      success: true,
      data: {
        project,
        analysis: {
          summary: analysis.repositoryAnalysis,
          region: analysis.region,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt,
        },
      },
    });
  } catch (err) {
    logger.error(`[analysis] Failed for project ${req.params.id}:`, err.message);
    // Mark project as failed
    if (project) {
      project.status = 'failed';
      await project.save().catch(() => {});
    }

    const statusCode = err.response?.status || 502;
    const message = err.response?.data?.detail || err.message || 'Analysis failed';
    return res.status(statusCode).json({ success: false, error: { message } });
  }
}

/**
 * POST /api/projects/:id/architecture
 * Generates AWS architecture from stored analysis via the FastAPI AI service.
 */
async function generateArchitecture(req, res, next) {
  let project;
  try {
    project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }

    // Get stored analysis
    const existingAnalysis = await Analysis.findOne({ projectId: project._id });
    if (!existingAnalysis || !existingAnalysis.repositoryAnalysis) {
      return res.status(400).json({
        success: false,
        error: { message: 'Repository must be analyzed before generating architecture' },
      });
    }

    // Allow overriding requirements and region
    const requirements = req.body.requirements || project.requirements || '';
    const region = req.body.region || project.region || 'ap-south-1';

    logger.info(`[architecture] Generating for project ${project._id}`);

    const architectureRaw = await aiService.generateArchitecture(
      existingAnalysis.repositoryAnalysis,
      requirements,
      region
    );

    // Safe parse of LLM JSON output
    let architectureParsed;
    try {
      // LLM may return markdown-fenced JSON, strip it
      const cleaned = architectureRaw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      architectureParsed = JSON.parse(cleaned);
    } catch {
      logger.warn('[architecture] Could not parse JSON — storing raw string');
      architectureParsed = { raw: architectureRaw };
    }

    // Persist
    const analysis = await Analysis.findOneAndUpdate(
      { projectId: project._id },
      {
        architecture: architectureParsed,
        requirements,
        region,
      },
      { new: true }
    );

    // Update project status and requirements
    project.status = 'architecture_generated';
    if (req.body.requirements) project.requirements = requirements;
    if (req.body.region) project.region = region;
    await project.save();

    logger.info(`[architecture] Completed for project ${project._id}`);

    res.json({
      success: true,
      data: {
        project,
        architecture: analysis.architecture,
      },
    });
  } catch (err) {
    logger.error(`[architecture] Failed for project ${req.params.id}:`, err.message);
    if (project) {
      project.status = 'failed';
      await project.save().catch(() => {});
    }

    const statusCode = err.response?.status || 502;
    const message = err.response?.data?.detail || err.message || 'Architecture generation failed';
    return res.status(statusCode).json({ success: false, error: { message } });
  }
}

/**
 * GET /api/projects/:id/analysis
 * Returns stored analysis and architecture for a project.
 */
async function getAnalysis(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }

    const analysis = await Analysis.findOne({ projectId: project._id });
    if (!analysis) {
      return res.json({
        success: true,
        data: {
          project,
          analysis: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        project,
        analysis: {
          summary: analysis.repositoryAnalysis,
          architecture: analysis.architecture,
          requirements: analysis.requirements,
          region: analysis.region,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeRepository, generateArchitecture, getAnalysis };
