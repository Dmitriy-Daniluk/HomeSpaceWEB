const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const logger = require('./logger');

const ensureSubscriptionPaymentsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      plan ENUM('month', 'year') NOT NULL DEFAULT 'month',
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
      payment_method VARCHAR(50) NOT NULL DEFAULT 'mock_sbp',
      status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'paid',
      provider_payment_id VARCHAR(120) UNIQUE,
      paid_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      metadata JSON NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX (created_at),
      INDEX (status),
      INDEX (plan)
    )
  `);
};

const ensureAdminAuditLogsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_user_id INT NULL,
      action VARCHAR(80) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INT NULL,
      details JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX (admin_user_id),
      INDEX (entity_type, entity_id),
      INDEX (created_at)
    )
  `);
};

const ensurePersonalAttachmentsSupport = async () => {
  await pool.query('ALTER TABLE attachments MODIFY family_id INT NULL');
};

const ensureFeedbackContactColumns = async () => {
  const ensureColumn = async (columnName, definition) => {
    const [columns] = await pool.query('SHOW COLUMNS FROM feedback LIKE ?', [columnName]);
    if (columns.length === 0) {
      await pool.query(`ALTER TABLE feedback ADD COLUMN ${columnName} ${definition}`);
    }
  };

  await ensureColumn('contact_name', 'VARCHAR(255) NULL AFTER user_id');
  await ensureColumn('contact_email', 'VARCHAR(255) NULL AFTER contact_name');
};

exports.ensureAdminUser = async () => {
  await ensureSubscriptionPaymentsTable();
  await ensureAdminAuditLogsTable();
  await ensurePersonalAttachmentsSupport();
  await ensureFeedbackContactColumns();

  if (process.env.SEED_ADMIN_USER !== 'true') return;

  const primaryEmail = process.env.ADMIN_EMAIL || 'admin@homespace.local';
  const adminEmails = (process.env.ADMIN_EMAILS || primaryEmail)
    .split(',')
    .concat(primaryEmail)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const uniqueAdminEmails = [...new Set(adminEmails)];
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const fullName = process.env.ADMIN_FULL_NAME || 'HomeSpace Admin';
  const passwordHash = await bcrypt.hash(password, 10);

  for (const email of uniqueAdminEmails) {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      logger.info(`Admin seed skipped: ${email} already exists`);
      continue;
    }

    await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
      [email, passwordHash, fullName]
    );

    logger.info(`Admin seed created: ${email}`);
  }
};
