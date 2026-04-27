-- Migration: 2026-04-26-create-scheduled-job-run-table
-- Tracks every scheduled job execution (cron + manual) for observability.

CREATE TABLE IF NOT EXISTS `scheduled_job_run` (
  `id`            BIGINT        NOT NULL AUTO_INCREMENT,
  `job_name`      VARCHAR(150)  NOT NULL COMMENT 'Matches ScheduledJobDefinition.id',
  `trigger_type`  VARCHAR(20)   NOT NULL COMMENT 'cron | manual',
  `status`        VARCHAR(20)   NOT NULL COMMENT 'success | failure',
  `started_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at`   DATETIME      DEFAULT NULL,
  `duration_ms`   INT           DEFAULT NULL,
  `error_message` TEXT          DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sjr_job_name_started_at` (`job_name`, `started_at`),
  KEY `idx_sjr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
