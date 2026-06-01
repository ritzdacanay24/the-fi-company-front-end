-- Create normalized customer notification recipients table with active flag.
CREATE TABLE IF NOT EXISTS eyefidb.fs_company_notification_recipients (
  id INT(11) NOT NULL AUTO_INCREMENT,
  fs_company_id INT(11) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fs_company_notification_email (fs_company_id, email),
  KEY idx_fs_company_notification_company (fs_company_id),
  KEY idx_fs_company_notification_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill from legacy fs_company_det.notification_emails.
INSERT INTO eyefidb.fs_company_notification_recipients (
  fs_company_id,
  email,
  is_active,
  created_date,
  updated_date
)
SELECT
  src.fs_company_id,
  src.email,
  1 AS is_active,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT
    c.id AS fs_company_id,
    LOWER(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(parsed.email_list, ',', nums.n), ',', -1))) AS email
  FROM eyefidb.fs_company_det c
  JOIN (
    SELECT
      id,
      REPLACE(
        REPLACE(
          REPLACE(CONVERT(COALESCE(notification_emails, '') USING utf8mb4), ';', ','),
          CHAR(10), ','
        ),
        CHAR(13), ','
      ) AS email_list
    FROM eyefidb.fs_company_det
    WHERE TRIM(COALESCE(notification_emails, '')) <> ''
  ) parsed ON parsed.id = c.id
  JOIN (
    SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
    UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
    UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
  ) nums ON nums.n <= 1 + LENGTH(parsed.email_list) - LENGTH(REPLACE(parsed.email_list, ',', ''))
) src
WHERE src.email <> ''
  AND src.email LIKE '%@%'
ON DUPLICATE KEY UPDATE
  updated_date = VALUES(updated_date);
