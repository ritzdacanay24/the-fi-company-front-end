-- Add monitor-enabled preference for MR alerts.
-- When disabled, the frontend should not subscribe to MR websocket updates.

SET @schema_name = DATABASE();

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'mr_alert_preferences'
    AND COLUMN_NAME = 'mr_alert_monitor_enabled'
);

SET @ddl = IF(
  @column_exists = 0,
  'ALTER TABLE mr_alert_preferences ADD COLUMN mr_alert_monitor_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
