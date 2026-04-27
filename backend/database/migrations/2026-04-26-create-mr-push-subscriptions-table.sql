CREATE TABLE IF NOT EXISTS `mr_push_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) UNSIGNED NOT NULL,
  `endpoint_hash` CHAR(64) NOT NULL,
  `endpoint` TEXT NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth_key` VARCHAR(255) NOT NULL,
  `expiration_time` BIGINT NULL,
  `user_agent` VARCHAR(512) NULL,
  `last_used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mr_push_subscriptions_endpoint_hash` (`endpoint_hash`),
  KEY `idx_mr_push_subscriptions_user_id` (`user_id`),
  CONSTRAINT `fk_mr_push_subscriptions_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `db`.`users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;