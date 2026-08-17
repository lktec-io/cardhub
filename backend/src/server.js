import { app } from './app.js';
import { env } from './config/env.js';
import { assertDbConnection, pool } from './config/db.js';
import { logger } from './utils/logger.js';

let server;

async function start() {
  try {
    await assertDbConnection();
    logger.info('Database connection established');
  } catch (error) {
    logger.warn('Starting without a verified database connection', { message: error.message });
  }

  server = app.listen(env.port, () => {
    logger.info(`CardHub API listening on port ${env.port}`, { env: env.nodeEnv });
  });
}

function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server?.close(async () => {
    await pool.end();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

start();
