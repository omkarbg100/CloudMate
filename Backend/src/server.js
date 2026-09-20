'use strict';

const { connectDB } = require('./config/db');
const env = require('./config/env');
const logger = require('./utils/logger');
const app = require('./app');

async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`DeployMate Backend running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`AI Service URL: ${env.aiServiceUrl}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
