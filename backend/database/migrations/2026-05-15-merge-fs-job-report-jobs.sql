-- Merge fs-job-report-morning and fs-job-report-evening into a single fs-job-report job.

-- 1) Merge recipients into the new unified job id.
INSERT INTO scheduled_job_recipients (
  job_id,
  recipient_type,
  user_id,
  email,
  display_name,
  is_subscribed,
  is_assignee,
  notification_scope,
  active
)
SELECT
  'fs-job-report' AS job_id,
  r.recipient_type,
  r.user_id,
  r.email,
  r.display_name,
  r.is_subscribed,
  r.is_assignee,
  r.notification_scope,
  r.active
FROM scheduled_job_recipients r
WHERE r.job_id IN ('fs-job-report-morning', 'fs-job-report-evening')
  AND NOT EXISTS (
    SELECT 1
    FROM scheduled_job_recipients existing
    WHERE existing.job_id = 'fs-job-report'
      AND existing.recipient_type = r.recipient_type
      AND (
        (r.recipient_type = 'internal_user' AND existing.user_id = r.user_id)
        OR
        (
          r.recipient_type = 'external_email'
          AND LOWER(TRIM(COALESCE(existing.email, ''))) COLLATE utf8mb4_unicode_ci
            = LOWER(TRIM(COALESCE(r.email, ''))) COLLATE utf8mb4_unicode_ci
        )
      )
  );

-- 2) Disable legacy recipient rows to prevent accidental reuse if legacy IDs are invoked.
UPDATE scheduled_job_recipients
SET active = 0,
    updated_at = NOW()
WHERE job_id IN ('fs-job-report-morning', 'fs-job-report-evening');

-- 3) Create/refresh persisted config for the unified job.
SET @fs_job_report_active = COALESCE(
  (SELECT active FROM scheduled_jobs_config WHERE id = 'fs-job-report-morning' LIMIT 1),
  (SELECT active FROM scheduled_jobs_config WHERE id = 'fs-job-report-evening' LIMIT 1),
  0
);

SET @fs_job_report_note = COALESCE(
  (SELECT note FROM scheduled_jobs_config WHERE id = 'fs-job-report-morning' LIMIT 1),
  (SELECT note FROM scheduled_jobs_config WHERE id = 'fs-job-report-evening' LIMIT 1),
  'Sends Field Service scheduling reports at 4:00 AM and 5:00 PM (Mon-Fri) with CSV attachment.'
);

INSERT INTO scheduled_jobs_config (id, cron, active, note)
VALUES (
  'fs-job-report',
  '0 4,17 * * 1-5',
  @fs_job_report_active,
  @fs_job_report_note
)
ON DUPLICATE KEY UPDATE
  cron = VALUES(cron),
  active = VALUES(active),
  note = COALESCE(VALUES(note), scheduled_jobs_config.note);

-- 4) Remove legacy persisted config rows.
DELETE FROM scheduled_jobs_config
WHERE id IN ('fs-job-report-morning', 'fs-job-report-evening');
