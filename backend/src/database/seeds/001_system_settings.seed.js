/**
 * DEVELOPMENT SEED DATA — baseline application configuration only.
 * Contains no fake customers, events, or business records.
 */
import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const BASELINE_SETTINGS = [
  { key: 'site_name', value: 'CardHub', type: 'string', description: 'Public-facing product name' },
  { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Toggle to take the platform offline' },
  { key: 'default_language', value: 'en', type: 'string', description: 'Default locale for new accounts' },
];

async function seedSystemSettings(connection) {
  for (const setting of BASELINE_SETTINGS) {
    await connection.query(
      `INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [setting.key, setting.value, setting.type, setting.description]
    );
  }
  logger.info(`Seeded ${BASELINE_SETTINGS.length} system_settings rows`);
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
  });

  try {
    await seedSystemSettings(connection);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  logger.error('Seeding failed', { message: error.message });
  process.exit(1);
});
