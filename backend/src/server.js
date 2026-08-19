import { app } from './app.js';
import { env } from './config/env.js';
import { assertDbConnection, pool } from './config/db.js';
import { logger } from './utils/logger.js';
import { smsProvider } from './services/providers/smsProvider.js';
import { whatsappProvider } from './services/providers/whatsappProvider.js';

let server;

/**
 * Logs, once at boot, exactly which delivery providers are active and —
 * if not — exactly which env var is missing. Never logs credential
 * values. This exists because "SMS delivery unavailable" during a real
 * send attempt gave no way to tell "all three Beem vars are empty" apart
 * from "just BEEM_SENDER_ID is empty" — a real support case where the
 * key pair was correct but the sender ID alone was unset. Check this log
 * (`pm2 logs` right after a restart) before troubleshooting anything else.
 */
function logProviderStatus() {
  if (smsProvider.isConfigured) {
    logger.info('SMS provider (Beem) is configured and active');
  } else {
    logger.warn('SMS provider (Beem) is NOT configured — sends will report "unavailable"', {
      missingEnvVars: smsProvider.missingFields.map((f) => (f === 'apiKey' ? 'BEEM_API_KEY' : f === 'secretKey' ? 'BEEM_SECRET_KEY' : 'BEEM_SENDER_ID')),
    });
  }

  if (whatsappProvider.isConfigured) {
    logger.info(`WhatsApp provider (${whatsappProvider.providerName}) is configured and active`);
  } else {
    logger.warn('WhatsApp provider is NOT configured — sends will report "unavailable"', {
      selectedProvider: env.whatsapp.provider || '(none set)',
      missingEnvVars: whatsappProvider.missingFields,
    });
  }
}

async function start() {
  try {
    await assertDbConnection();
    logger.info('Database connection established');
  } catch (error) {
    logger.warn('Starting without a verified database connection', { message: error.message });
  }

  logProviderStatus();

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
