-- Per-user Material Request alert preferences.
CREATE TABLE IF NOT EXISTS `eyefidb`.`mr_alert_preferences` (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT(11) UNSIGNED NOT NULL,
  mr_alert_monitor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  mr_alert_enabled TINYINT(1) NOT NULL DEFAULT 1,
  mr_alert_sound_enabled TINYINT(1) NOT NULL DEFAULT 1,
  mr_alert_repeat_seconds INT NOT NULL DEFAULT 30,
  mr_alert_queues ENUM('both', 'picking', 'validation') NOT NULL DEFAULT 'both',
  mr_alert_quiet_hours_start TIME NULL,
  mr_alert_quiet_hours_end TIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mr_alert_preferences_user_id (user_id),
  CONSTRAINT fk_mr_alert_preferences_user_id FOREIGN KEY (user_id) REFERENCES `db`.`users`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
