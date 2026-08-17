import { pool } from '../config/db.js';

const DEFAULTS = {
  email_notifications: 1,
  sms_notifications: 0,
  marketing_notifications: 0,
  security_notifications: 1,
};

export const userPreferencesRepository = {
  async findByUserId(userId) {
    const [rows] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || { user_id: userId, ...DEFAULTS };
  },

  async upsert(userId, preferences) {
    const merged = { ...DEFAULTS, ...(await this.findByUserId(userId)), ...preferences };
    await pool.query(
      `INSERT INTO user_preferences
         (user_id, email_notifications, sms_notifications, marketing_notifications, security_notifications)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email_notifications = VALUES(email_notifications),
         sms_notifications = VALUES(sms_notifications),
         marketing_notifications = VALUES(marketing_notifications),
         security_notifications = VALUES(security_notifications)`,
      [
        userId,
        merged.email_notifications,
        merged.sms_notifications,
        merged.marketing_notifications,
        merged.security_notifications,
      ]
    );
    return this.findByUserId(userId);
  },
};
