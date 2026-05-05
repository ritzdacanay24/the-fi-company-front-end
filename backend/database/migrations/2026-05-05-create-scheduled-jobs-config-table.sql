-- Create table for persisting scheduled job configurations
CREATE TABLE IF NOT EXISTS scheduled_jobs_config (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Job ID from definitions',
  cron VARCHAR(255) NOT NULL COMMENT 'Cron expression',
  active BOOLEAN NOT NULL DEFAULT true COMMENT 'Whether job is enabled',
  note TEXT COMMENT 'Notes about the job',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (active),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Persisted configuration for scheduled jobs';
