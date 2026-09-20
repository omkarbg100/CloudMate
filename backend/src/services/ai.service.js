'use strict';

const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

const client = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: 300_000, // 5 minutes — repo cloning + LLM can be slow
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Checks if the AI service is reachable
 */
async function healthCheck() {
  const { data } = await client.get('/health');
  return data;
}

/**
 * Analyzes a GitHub repository by sending it to the FastAPI /process endpoint.
 * @param {string} repoUrl - GitHub repository URL
 * @param {string} region - AWS region (passed along for context)
 * @returns {{ summary: string }}
 */
async function analyzeRepository(repoUrl, region = 'ap-south-1') {
  logger.info(`[ai.service] analyze → ${repoUrl}`);
  const { data } = await client.post('/process', {
    action: 'analyze',
    repo_url: repoUrl,
    region,
  });
  // data.result.summary is the raw analysis string
  return data.result;
}

/**
 * Generates AWS architecture from repository analysis.
 * @param {string} analysis - Repository analysis summary
 * @param {string} requirements - User deployment requirements
 * @param {string} region - AWS region
 * @returns {string} - Raw JSON string from LLM
 */
async function generateArchitecture(analysis, requirements = '', region = 'ap-south-1') {
  logger.info(`[ai.service] architecture → region=${region}`);
  const { data } = await client.post('/process', {
    action: 'architecture',
    analysis,
    requirements,
    region,
  });
  // data.result.architecture is the raw LLM string
  return data.result.architecture;
}

module.exports = { healthCheck, analyzeRepository, generateArchitecture };
