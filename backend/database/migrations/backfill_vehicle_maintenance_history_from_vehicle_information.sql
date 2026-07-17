INSERT INTO vehicle_maintenance_history (
  vehicle_id,
  service_date,
  mileage,
  service_type,
  description,
  created_by,
  created_date,
  active
)
SELECT
  v.id AS vehicle_id,
  COALESCE(
    NULLIF(TRIM(v.lastServiceDate), ''),
    DATE_FORMAT(v.createdDate, '%Y-%m-%d'),
    DATE_FORMAT(NOW(), '%Y-%m-%d')
  ) AS service_date,
  v.mileage,
  COALESCE(NULLIF(TRIM(v.typeOfService), ''), 'Initial maintenance backfill') AS service_type,
  CONCAT(
    'Backfilled from vehicleInformation. ',
    'Legacy lastServiceDate="', COALESCE(v.lastServiceDate, ''), '", ',
    'legacy typeOfService="', COALESCE(v.typeOfService, ''), '"'
  ) AS description,
  COALESCE(v.createdBy, 0) AS created_by,
  COALESCE(v.createdDate, NOW()) AS created_date,
  COALESCE(v.active, 1) AS active
FROM vehicleInformation v
WHERE NOT EXISTS (
  SELECT 1
  FROM vehicle_maintenance_history m
  WHERE m.vehicle_id = v.id
);
