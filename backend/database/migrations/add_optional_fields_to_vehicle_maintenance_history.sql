SET @db_name = DATABASE();

SET @sql = IF (
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'vehicle_maintenance_history'
      AND COLUMN_NAME = 'vendor_name'
  ),
  'SELECT 1',
  'ALTER TABLE vehicle_maintenance_history ADD COLUMN vendor_name varchar(255) DEFAULT NULL AFTER description'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF (
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'vehicle_maintenance_history'
      AND COLUMN_NAME = 'cost'
  ),
  'SELECT 1',
  'ALTER TABLE vehicle_maintenance_history ADD COLUMN cost decimal(12,2) DEFAULT NULL AFTER vendor_name'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF (
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'vehicle_maintenance_history'
      AND COLUMN_NAME = 'work_order_no'
  ),
  'SELECT 1',
  'ALTER TABLE vehicle_maintenance_history ADD COLUMN work_order_no varchar(100) DEFAULT NULL AFTER cost'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF (
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'vehicle_maintenance_history'
      AND COLUMN_NAME = 'next_service_date'
  ),
  'SELECT 1',
  'ALTER TABLE vehicle_maintenance_history ADD COLUMN next_service_date varchar(25) DEFAULT NULL AFTER work_order_no'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF (
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'vehicle_maintenance_history'
      AND COLUMN_NAME = 'next_service_mileage'
  ),
  'SELECT 1',
  'ALTER TABLE vehicle_maintenance_history ADD COLUMN next_service_mileage int(11) DEFAULT NULL AFTER next_service_date'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
