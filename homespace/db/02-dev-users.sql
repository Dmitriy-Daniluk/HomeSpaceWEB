CREATE USER IF NOT EXISTS 'homespace_viewer'@'%' IDENTIFIED WITH mysql_native_password BY 'homespace_viewer_pass';
GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW ON homespace_model.* TO 'homespace_viewer'@'%';
FLUSH PRIVILEGES;
