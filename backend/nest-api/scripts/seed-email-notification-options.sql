-- Backfill missing email notification option keys used by existing records.
-- Safe to run multiple times.

-- 1) Ensure Parts Order keys exist in option master.
INSERT INTO email_notification_access_options (category, name, value)
SELECT 'Field Service', 'Parts Order (On Create)', 'create_parts_order'
WHERE NOT EXISTS (
  SELECT 1
  FROM email_notification_access_options
  WHERE TRIM(value) = 'create_parts_order'
);

INSERT INTO email_notification_access_options (category, name, value)
SELECT 'Field Service', 'Parts Order (On Update)', 'update_parts_order'
WHERE NOT EXISTS (
  SELECT 1
  FROM email_notification_access_options
  WHERE TRIM(value) = 'update_parts_order'
);

-- 2) Backfill any missing option values already referenced by saved notification rows.
-- This is what resolves blank Notification Group for legacy rows.
INSERT INTO email_notification_access_options (category, name, value)
SELECT
  'Backfilled',
  CONCAT('Backfilled - ', REPLACE(TRIM(s.location), '_', ' ')),
  TRIM(s.location)
FROM (
  SELECT DISTINCT TRIM(location) AS location
  FROM safety_incident_config
  WHERE location IS NOT NULL
    AND TRIM(location) <> ''
) s
LEFT JOIN email_notification_access_options o
  ON TRIM(o.value) = s.location
WHERE o.id IS NULL;
