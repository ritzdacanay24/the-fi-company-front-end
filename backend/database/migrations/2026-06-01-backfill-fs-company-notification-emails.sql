-- Backfill fs_company_det.notification_emails from historical fs_request email data.
-- Only fills rows where notification_emails is currently blank.
-- Uses single-email request rows to avoid polluting with already-delimited freeform lists.

UPDATE eyefidb.fs_company_det c
JOIN (
  SELECT
    customer_key,
    GROUP_CONCAT(DISTINCT email ORDER BY email SEPARATOR ', ') AS notification_emails
  FROM (
    SELECT
      LOWER(TRIM(customer)) AS customer_key,
      LOWER(TRIM(email)) AS email
    FROM eyefidb.fs_request
    WHERE TRIM(COALESCE(customer, '')) <> ''
      AND TRIM(COALESCE(email, '')) <> ''
      AND LOWER(TRIM(email)) LIKE '%@%'
      AND TRIM(email) NOT LIKE '%,%'
      AND TRIM(email) NOT LIKE '%;%'
      AND TRIM(email) NOT LIKE '%\n%'
      AND TRIM(email) NOT LIKE '%\r%'
  ) src
  GROUP BY customer_key
) backfill
  ON LOWER(TRIM(c.name)) = backfill.customer_key
SET c.notification_emails = backfill.notification_emails
WHERE TRIM(COALESCE(c.notification_emails, '')) = '';
