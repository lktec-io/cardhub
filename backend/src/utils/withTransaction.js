import { pool } from '../config/db.js';

/**
 * Runs `fn(connection)` inside a single MySQL transaction — committed if
 * it resolves, rolled back if it throws. Used where several writes must
 * succeed or fail together (e.g. reserving ticket inventory + creating the
 * order + its payment row). Repositories accept this connection as an
 * optional last argument and otherwise fall back to the shared pool.
 */
export async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
