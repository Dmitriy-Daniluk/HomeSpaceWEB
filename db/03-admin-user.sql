USE homespace_model;

-- HomeSpace admin bootstrap for manual server deployments.
-- Default credentials after import:
--   email:    admin@homespace.local
--   password: Admin123!
-- Change the password after first login.

SET @db_name = DATABASE();

SET @has_role_column = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
);

SET @alter_role_sql = IF(
  @has_role_column = 0,
  "ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER avatar_url",
  "SELECT 'users.role already exists'"
);

PREPARE stmt_role FROM @alter_role_sql;
EXECUTE stmt_role;
DEALLOCATE PREPARE stmt_role;

INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  has_subscription,
  subscription_until
)
VALUES (
  'admin@homespace.local',
  '$2a$10$kD8NvYSOTaBKpAfcdDSmM.KqdWAej.U2FdxY.DYQpdKx/f3p5D39W',
  'HomeSpace Admin',
  'admin',
  TRUE,
  DATE_ADD(NOW(), INTERVAL 10 YEAR)
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  role = 'admin',
  has_subscription = TRUE,
  subscription_until = GREATEST(COALESCE(subscription_until, NOW()), DATE_ADD(NOW(), INTERVAL 10 YEAR));
