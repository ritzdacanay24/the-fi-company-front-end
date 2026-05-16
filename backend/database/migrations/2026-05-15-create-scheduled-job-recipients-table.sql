CREATE TABLE IF NOT EXISTS scheduled_job_recipients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id VARCHAR(128) NOT NULL,
  recipient_type ENUM('internal_user', 'external_email') NOT NULL,
  user_id INT NULL,
  email VARCHAR(255) NULL,
  display_name VARCHAR(255) NULL,
  is_subscribed TINYINT(1) NOT NULL DEFAULT 1,
  is_assignee TINYINT(1) NOT NULL DEFAULT 0,
  notification_scope ENUM('always', 'on_failure') NOT NULL DEFAULT 'always',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sjr_job_id (job_id),
  INDEX idx_sjr_user_id (user_id),
  INDEX idx_sjr_active (job_id, active, is_subscribed),
  CONSTRAINT chk_sjr_contact CHECK (
    (recipient_type = 'internal_user' AND user_id IS NOT NULL)
    OR
    (recipient_type = 'external_email' AND email IS NOT NULL AND email <> '')
  )
);

ALTER TABLE scheduled_job_recipients
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT INTO scheduled_job_recipients (
  job_id,
  recipient_type,
  email,
  display_name,
  is_subscribed,
  is_assignee,
  notification_scope,
  active
)
SELECT
  'open-checklist-instances-last-3-days',
  'external_email',
  seed.email,
  seed.display_name,
  1,
  1,
  'always',
  1
FROM (
  SELECT 'temenuga@eyefi.com' AS email, 'Temenuga' AS display_name
  UNION ALL
  SELECT 'malcolm@eyefi.com' AS email, 'Malcolm' AS display_name
) AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM scheduled_job_recipients existing
  WHERE existing.job_id = 'open-checklist-instances-last-3-days'
    AND existing.recipient_type = 'external_email'
    AND existing.email COLLATE utf8mb4_unicode_ci = seed.email COLLATE utf8mb4_unicode_ci
);
