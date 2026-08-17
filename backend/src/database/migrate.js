import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function splitUpDown(sql) {
  const upMatch = sql.match(/-- \+up([\s\S]*?)(?:-- \+down|$)/i);
  const downMatch = sql.match(/-- \+down([\s\S]*)$/i);
  return {
    up: upMatch ? upMatch[1].trim() : '',
    down: downMatch ? downMatch[1].trim() : '',
  };
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query('SELECT name FROM schema_migrations ORDER BY id ASC');
  return rows.map((row) => row.name);
}

async function loadMigrationFiles() {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((file) => file.endsWith('.sql')).sort();
}

async function runUp(connection) {
  await ensureMigrationsTable(connection);
  const applied = new Set(await getAppliedMigrations(connection));
  const files = await loadMigrationFiles();

  const pending = files.filter((file) => !applied.has(file));
  if (!pending.length) {
    logger.info('No pending migrations');
    return;
  }

  for (const file of pending) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const { up } = splitUpDown(sql);
    if (!up) {
      logger.warn(`Migration ${file} has no +up section — skipping`);
      continue;
    }
    await connection.query(up);
    await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    logger.info(`Applied migration: ${file}`);
  }
}

async function runDown(connection) {
  await ensureMigrationsTable(connection);
  const applied = await getAppliedMigrations(connection);
  const last = applied[applied.length - 1];

  if (!last) {
    logger.info('No migrations to roll back');
    return;
  }

  const sql = await readFile(path.join(MIGRATIONS_DIR, last), 'utf-8');
  const { down } = splitUpDown(sql);
  if (!down) {
    throw new Error(`Migration ${last} has no +down section — cannot roll back`);
  }
  await connection.query(down);
  await connection.query('DELETE FROM schema_migrations WHERE name = ?', [last]);
  logger.info(`Rolled back migration: ${last}`);
}

async function main() {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    if (direction === 'up') {
      await runUp(connection);
    } else {
      await runDown(connection);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  logger.error('Migration failed', { message: error.message });
  process.exit(1);
});
