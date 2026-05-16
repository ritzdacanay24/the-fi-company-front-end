-- Backfill missing scheduled job recipients from safety_incident_config.
-- This migration is idempotent and handles:
-- 1) location values with casing/whitespace differences
-- 2) notification_emails containing comma/semicolon/newline separated values

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
  src.job_id,
  'internal_user' AS recipient_type,
  src.user_id,
  NULL AS email,
  NULL AS display_name,
  1 AS is_subscribed,
  0 AS is_assignee,
  'always' AS notification_scope,
  1 AS active
FROM (
  SELECT DISTINCT
    map.job_id,
    sic.user_id
  FROM safety_incident_config sic
  INNER JOIN (
    SELECT 'production_orders' AS location, 'completed-production-orders' AS job_id
    UNION ALL SELECT 'overdue_field_service_workorder', 'field-service-old-workorders'
    UNION ALL SELECT 'lnw_shipping_report_notification', 'lnw-delivery'
    UNION ALL SELECT 'lnw_shipping_report_notification_cc', 'lnw-delivery'
    UNION ALL SELECT 'forklift_and_vehicle_inspection_report', 'inspection-email'
    UNION ALL SELECT 'overdue_orders', 'overdue-orders'
    UNION ALL SELECT 'field_service_overdue_requests', 'past-due-field-service-requests'
    UNION ALL SELECT 'serial_stock_alert', 'serial-stock-alert'
    UNION ALL SELECT 'overdue_shipping_request_email', 'open-shipping-requests'
    UNION ALL SELECT 'vehicle_registration_email', 'vehicle-expiration-email'
    UNION ALL SELECT 'safety_incident_overdue_email', 'overdue-safety-incident'
    UNION ALL SELECT 'total_shipped_orders_report', 'total-shipped-orders'
    UNION ALL SELECT 'overdue_qir', 'overdue-qir'
    UNION ALL SELECT 'field_serivce_copy_of_report', 'fs-job-report-morning'
    UNION ALL SELECT 'field_serivce_copy_of_report', 'fs-job-report-evening'
    UNION ALL SELECT 'field_serivce_copy_of_report', 'fs-job-notice'
    UNION ALL SELECT 'open_checklist_instances_last_3_days', 'open-checklist-instances-last-3-days'
  ) map
    ON LOWER(TRIM(CONVERT(sic.location USING utf8mb4))) = LOWER(TRIM(CONVERT(map.location USING utf8mb4)))
  WHERE sic.user_id IS NOT NULL
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM scheduled_job_recipients existing
  WHERE LOWER(TRIM(CONVERT(existing.job_id USING utf8mb4))) = LOWER(TRIM(CONVERT(src.job_id USING utf8mb4)))
    AND LOWER(TRIM(CONVERT(existing.recipient_type USING utf8mb4))) = 'internal_user'
    AND existing.user_id = src.user_id
);

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
  src.job_id,
  'external_email' AS recipient_type,
  NULL AS user_id,
  src.email,
  NULL AS display_name,
  1 AS is_subscribed,
  0 AS is_assignee,
  'always' AS notification_scope,
  1 AS active
FROM (
  SELECT DISTINCT
    base.job_id,
    LOWER(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(base.email_list, ',', n.n), ',', -1))) AS email
  FROM (
    SELECT
      map.job_id,
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(CONVERT(COALESCE(sic.notification_emails, '') USING utf8mb4), ';', ','),
            CHAR(10), ','
          ),
          CHAR(13), ','
        ),
        ' ', ''
      ) AS email_list
    FROM safety_incident_config sic
    INNER JOIN (
      SELECT 'production_orders' AS location, 'completed-production-orders' AS job_id
      UNION ALL SELECT 'overdue_field_service_workorder', 'field-service-old-workorders'
      UNION ALL SELECT 'lnw_shipping_report_notification', 'lnw-delivery'
      UNION ALL SELECT 'lnw_shipping_report_notification_cc', 'lnw-delivery'
      UNION ALL SELECT 'forklift_and_vehicle_inspection_report', 'inspection-email'
      UNION ALL SELECT 'overdue_orders', 'overdue-orders'
      UNION ALL SELECT 'field_service_overdue_requests', 'past-due-field-service-requests'
      UNION ALL SELECT 'serial_stock_alert', 'serial-stock-alert'
      UNION ALL SELECT 'overdue_shipping_request_email', 'open-shipping-requests'
      UNION ALL SELECT 'vehicle_registration_email', 'vehicle-expiration-email'
      UNION ALL SELECT 'safety_incident_overdue_email', 'overdue-safety-incident'
      UNION ALL SELECT 'total_shipped_orders_report', 'total-shipped-orders'
      UNION ALL SELECT 'overdue_qir', 'overdue-qir'
      UNION ALL SELECT 'field_serivce_copy_of_report', 'fs-job-report-morning'
      UNION ALL SELECT 'field_serivce_copy_of_report', 'fs-job-report-evening'
      UNION ALL SELECT 'field_serivce_copy_of_report', 'fs-job-notice'
      UNION ALL SELECT 'open_checklist_instances_last_3_days', 'open-checklist-instances-last-3-days'
    ) map
      ON LOWER(TRIM(CONVERT(sic.location USING utf8mb4))) = LOWER(TRIM(CONVERT(map.location USING utf8mb4)))
    WHERE sic.user_id IS NULL
  ) base
  INNER JOIN (
    SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
  ) n ON n.n <= 1 + LENGTH(base.email_list) - LENGTH(REPLACE(base.email_list, ',', ''))
) src
WHERE src.email <> ''
  AND src.email LIKE '%@%'
  AND NOT EXISTS (
    SELECT 1
    FROM scheduled_job_recipients existing
    WHERE LOWER(TRIM(CONVERT(existing.job_id USING utf8mb4))) = LOWER(TRIM(CONVERT(src.job_id USING utf8mb4)))
      AND LOWER(TRIM(CONVERT(existing.recipient_type USING utf8mb4))) = 'external_email'
      AND LOWER(TRIM(CONVERT(COALESCE(existing.email, '') USING utf8mb4)))
          = LOWER(TRIM(CONVERT(src.email USING utf8mb4)))
  );
