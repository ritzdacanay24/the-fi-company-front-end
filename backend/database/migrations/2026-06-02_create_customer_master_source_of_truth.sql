-- Customer master source-of-truth for cross-system use
-- Date: 2026-06-02

CREATE TABLE IF NOT EXISTS eyefidb.customer_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_code VARCHAR(20) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  logo_url VARCHAR(1000) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_master_code (customer_code),
  KEY idx_customer_master_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.customer_external_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  source_system VARCHAR(50) NOT NULL,
  external_key VARCHAR(191) NOT NULL,
  external_name VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_external_map_source_key (source_system, external_key),
  KEY idx_customer_external_map_customer_id (customer_id),
  CONSTRAINT fk_customer_external_map_customer
    FOREIGN KEY (customer_id)
    REFERENCES eyefidb.customer_master (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE eyefidb.shipping_checklist_templates
  ADD COLUMN customer_id INT NULL AFTER id,
  ADD KEY idx_shipping_checklist_templates_customer_id (customer_id),
  ADD CONSTRAINT fk_shipping_checklist_templates_customer
    FOREIGN KEY (customer_id)
    REFERENCES eyefidb.customer_master (id);

INSERT INTO eyefidb.customer_master (customer_code, customer_name, is_active)
SELECT DISTINCT
  LOWER(TRIM(t.customer_code)) AS customer_code,
  TRIM(t.customer_name) AS customer_name,
  1 AS is_active
FROM eyefidb.shipping_checklist_templates t
WHERE TRIM(COALESCE(t.customer_code, '')) <> ''
ON DUPLICATE KEY UPDATE
  customer_name = VALUES(customer_name),
  is_active = VALUES(is_active);

INSERT INTO eyefidb.customer_master (customer_code, customer_name, is_active)
SELECT DISTINCT
  LOWER(TRIM(ct.customer_code)) AS customer_code,
  TRIM(ct.customer_name) AS customer_name,
  CASE WHEN ct.active = 0 THEN 0 ELSE 1 END AS is_active
FROM eyefidb.customer_types ct
WHERE TRIM(COALESCE(ct.customer_code, '')) <> ''
ON DUPLICATE KEY UPDATE
  customer_name = VALUES(customer_name),
  is_active = VALUES(is_active);

UPDATE eyefidb.shipping_checklist_templates t
INNER JOIN eyefidb.customer_master c ON c.customer_code = LOWER(TRIM(t.customer_code))
SET t.customer_id = c.id
WHERE t.customer_id IS NULL;

-- Canonicalize Light & Wonder naming across source records.
UPDATE eyefidb.customer_master c
SET c.customer_name = 'L&W'
WHERE c.customer_code IN ('lnw', 'sg')
  OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(c.customer_name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
    IN ('lightandwonder', 'lnw', 'landw', 'lw');

UPDATE eyefidb.shipping_checklist_templates t
SET t.customer_name = 'L&W'
WHERE t.customer_code = 'lnw'
  OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(t.customer_name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
    IN ('lightandwonder', 'lnw', 'landw', 'lw');

-- Backfill all active Field Service customers into customer_master.
-- If a customer is not already known by normalized name, create a stable internal record.
INSERT INTO eyefidb.customer_master (customer_code, customer_name, logo_url, is_active)
SELECT
  CONCAT('fs_', LPAD(fs.id, 6, '0')) AS customer_code,
  TRIM(fs.name) AS customer_name,
  CASE
    WHEN TRIM(COALESCE(fs.image, '')) REGEXP '^https?://' THEN TRIM(fs.image)
    ELSE NULL
  END AS logo_url,
  1 AS is_active
FROM eyefidb.fs_company_det fs
LEFT JOIN eyefidb.customer_master c
  ON LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(c.customer_name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
   = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(fs.name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
WHERE fs.active = 1
  AND TRIM(COALESCE(fs.name, '')) <> ''
  AND c.id IS NULL
ON DUPLICATE KEY UPDATE
  customer_name = VALUES(customer_name),
  logo_url = COALESCE(customer_master.logo_url, VALUES(logo_url)),
  is_active = VALUES(is_active);

UPDATE eyefidb.customer_master c
INNER JOIN eyefidb.fs_company_det fs
  ON LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(c.customer_name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
   = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(fs.name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
SET c.logo_url = CASE
  WHEN TRIM(COALESCE(fs.image, '')) REGEXP '^https?://' THEN TRIM(fs.image)
  ELSE c.logo_url
END
WHERE c.logo_url IS NULL
  AND fs.active = 1
  AND TRIM(COALESCE(fs.image, '')) <> '';

INSERT INTO eyefidb.customer_external_map (customer_id, source_system, external_key, external_name, is_active)
SELECT
  COALESCE(c_by_name.id, c_by_fs_code.id) AS customer_id,
  'field_service' AS source_system,
  CONCAT('id:', fs.id) AS external_key,
  TRIM(fs.name) AS external_name,
  1 AS is_active
FROM eyefidb.fs_company_det fs
LEFT JOIN eyefidb.customer_master c_by_name
  ON LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(c_by_name.customer_name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
   = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(fs.name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
LEFT JOIN eyefidb.customer_master c_by_fs_code
  ON c_by_fs_code.customer_code = CONCAT('fs_', LPAD(fs.id, 6, '0'))
WHERE fs.active = 1
  AND TRIM(COALESCE(fs.name, '')) <> ''
  AND COALESCE(c_by_name.id, c_by_fs_code.id) IS NOT NULL
ON DUPLICATE KEY UPDATE
  customer_id = VALUES(customer_id),
  external_name = VALUES(external_name),
  is_active = VALUES(is_active);

-- Force all Field Service aliases of Light & Wonder to map to canonical lnw customer.
UPDATE eyefidb.customer_external_map cem
INNER JOIN eyefidb.fs_company_det fs
  ON cem.source_system = 'field_service'
 AND cem.external_key = CONCAT('id:', fs.id)
INNER JOIN eyefidb.customer_master canonical_lnw
  ON canonical_lnw.customer_code = 'lnw'
SET cem.customer_id = canonical_lnw.id
WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(fs.name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
      IN ('lightandwonder', 'lnw', 'landw', 'lw', 'sg');

-- Deactivate duplicate FS-only customer rows for the same canonical brand.
UPDATE eyefidb.customer_master c
INNER JOIN eyefidb.customer_master canonical_lnw
  ON canonical_lnw.customer_code = 'lnw'
SET c.is_active = 0
WHERE c.id <> canonical_lnw.id
  AND c.customer_code LIKE 'fs\_%'
  AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(c.customer_name, '')), ' ', ''), '&', 'and'), '-', ''), '_', ''), '.', ''))
      IN ('lightandwonder', 'lnw', 'landw', 'lw', 'sg');
