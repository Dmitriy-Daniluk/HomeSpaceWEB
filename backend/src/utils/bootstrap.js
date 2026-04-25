const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const logger = require('./logger');
const { normalizeUploadFileName } = require('./fileName');

const getConfiguredAdminEmails = () => {
  const primaryEmail = process.env.ADMIN_EMAIL || 'admin@homespace.local';
  const adminEmails = (process.env.ADMIN_EMAILS || primaryEmail)
    .split(',')
    .concat(primaryEmail)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(adminEmails)];
};

const ensureUserRoleColumn = async () => {
  const [columns] = await pool.query('SHOW COLUMNS FROM users LIKE ?', ['role']);
  if (columns.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER avatar_url");
  }
};

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

const ensureFamilyCustomRolesSupport = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS family_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      family_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY family_roles_family_name_unique (family_id, name),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX (family_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS family_role_permissions (
      family_role_id INT NOT NULL,
      permission VARCHAR(80) NOT NULL,
      PRIMARY KEY (family_role_id, permission),
      FOREIGN KEY (family_role_id) REFERENCES family_roles(id) ON DELETE CASCADE,
      INDEX (permission)
    )
  `);

  const [columns] = await pool.query('SHOW COLUMNS FROM family_members LIKE ?', ['custom_role_id']);
  if (columns.length === 0) {
    await pool.query('ALTER TABLE family_members ADD COLUMN custom_role_id INT NULL AFTER role');
    await pool.query('CREATE INDEX family_members_custom_role_id_idx ON family_members (custom_role_id)');
  }
};

const ensureAttachmentFileNamesNormalized = async () => {
  const [attachments] = await pool.query(
    'SELECT id, file_name FROM attachments WHERE file_name IS NOT NULL AND file_name != ""'
  );

  let updatedCount = 0;

  for (const attachment of attachments) {
    const normalizedName = normalizeUploadFileName(attachment.file_name);
    if (!normalizedName || normalizedName === attachment.file_name) {
      continue;
    }

    await pool.query('UPDATE attachments SET file_name = ? WHERE id = ?', [normalizedName, attachment.id]);
    updatedCount += 1;
  }

  if (updatedCount > 0) {
    logger.info(`Normalized attachment file names: ${updatedCount}`);
  }
};

exports.ensureAdminUser = async () => {
  await ensureUserRoleColumn();
  await ensureSubscriptionPaymentsTable();
  await ensureAdminAuditLogsTable();
  await ensurePersonalAttachmentsSupport();
  await ensureFeedbackContactColumns();
  await ensureFamilyCustomRolesSupport();
  await ensureAttachmentFileNamesNormalized();

  const uniqueAdminEmails = getConfiguredAdminEmails();
  for (const email of uniqueAdminEmails) {
    await pool.query('UPDATE users SET role = ? WHERE LOWER(email) = ?', ['admin', email]);
  }

  if (process.env.SEED_ADMIN_USER !== 'true') return;

  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || 'HomeSpace Admin';

  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD is required when SEED_ADMIN_USER=true');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  for (const email of uniqueAdminEmails) {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      logger.info(`Admin seed skipped: ${email} already exists`);
      continue;
    }

    await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [email, passwordHash, fullName, 'admin']
    );

    logger.info(`Admin seed created: ${email}`);
  }
};
