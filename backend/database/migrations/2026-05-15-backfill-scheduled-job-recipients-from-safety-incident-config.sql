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
  src.recipient_type,
  src.user_id,
  src.email,
  NULL AS display_name,
  1 AS is_subscribed,
  0 AS is_assignee,
  'always' AS notification_scope,
  1 AS active
FROM (
  SELECT
    map.job_id,
    CASE
      WHEN sic.user_id IS NOT NULL THEN 'internal_user'
      ELSE 'external_email'
    END AS recipient_type,
    sic.user_id,
    CASE
      WHEN sic.user_id IS NOT NULL THEN NULL
      ELSE NULLIF(LOWER(TRIM(COALESCE(sic.notification_emails, ''))), '')
    END AS email
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
    ON CONVERT(sic.location USING utf8mb4) COLLATE utf8mb4_unicode_ci
    = CONVERT(map.location USING utf8mb4) COLLATE utf8mb4_unicode_ci
) src
WHERE (
  (src.recipient_type = 'internal_user' AND src.user_id IS NOT NULL)
  OR
  (src.recipient_type = 'external_email' AND src.email IS NOT NULL)
)
AND NOT EXISTS (
  SELECT 1
  FROM scheduled_job_recipients existing
  WHERE CONVERT(existing.job_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
        = CONVERT(src.job_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
    AND CONVERT(existing.recipient_type USING utf8mb4) COLLATE utf8mb4_unicode_ci
        = CONVERT(src.recipient_type USING utf8mb4) COLLATE utf8mb4_unicode_ci
    AND (
      (src.recipient_type = 'internal_user' AND existing.user_id = src.user_id)
      OR
      (
        src.recipient_type = 'external_email'
        AND CONVERT(existing.email USING utf8mb4) COLLATE utf8mb4_unicode_ci
            = CONVERT(src.email USING utf8mb4) COLLATE utf8mb4_unicode_ci
      )
    )
);
