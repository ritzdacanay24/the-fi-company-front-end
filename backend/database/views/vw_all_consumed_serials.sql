-- ========================================
-- Comprehensive View: All Consumed Serial Numbers
-- ========================================
-- Purpose: UNION all consumed/used serial numbers from all sources
-- Sources:
--   1. serial_assignments (new system - includes UL labels)
--   2. agsSerialGenerator (legacy) - EXCLUDED if already in serial_assignments
--   3. sgAssetGenerator (legacy) - EXCLUDED if already in serial_assignments
--   4. igt_serial_numbers (only 'used' status)
--
-- Deduplication Strategy:
--   - During transition, same serial may exist in both new and legacy tables
--   - Legacy records are excluded if serial already exists in serial_assignments
--   - This prevents duplicates without complex queries
-- ========================================
-- Note: Run this in the eyefidb database
-- ========================================

USE eyefidb;

CREATE OR REPLACE VIEW vw_all_consumed_serials AS

-- ========================================
-- 1. Serial Assignments (New System)
-- ========================================
SELECT 
    CONCAT('SA-', sa.id) as unique_id,
    'serial_assignments' as source_table,
    'New System' as source_type,
    sa.id as source_id,
    sa.eyefi_serial_id,
    CAST(sa.eyefi_serial_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as eyefi_serial_number,
    sa.ul_label_id,
    CAST(sa.ul_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_number,
    NULL as igt_serial_id,
    NULL as igt_serial_number,
    NULL as ags_serial_id,
    NULL as ags_serial_number,
    NULL as sg_asset_id,
    NULL as sg_asset_number,
    CAST(sa.wo_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as wo_number,
    CAST(sa.batch_id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as batch_id,
    sa.consumed_at as used_date,
    CAST(sa.consumed_by AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as used_by,
    CAST(sa.status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as status,
    sa.is_voided,
    sa.voided_at,
    CAST(sa.voided_by AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as voided_by,
    CAST(sa.void_reason AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as void_reason,
    sa.created_at,
    -- Additional details
    CAST(COALESCE(sa.cp_cust_part, sa.wo_part) AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as part_number,
    CAST(sa.wo_description AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as wo_description,
    CAST(sa.generated_asset_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as customer_part_number,
    NULL as property_site,
    NULL as inspector_name,
    CAST(sa.cp_cust AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as customer_name,
    CAST(sa.po_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as po_number,
    CAST(ul.category AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_category
FROM eyefidb.serial_assignments sa
LEFT JOIN eyefidb.ul_labels ul ON BINARY sa.ul_number = BINARY ul.ul_number
WHERE sa.is_voided = 0 -- Only active assignments

UNION ALL

-- ========================================
-- 2. UL Label Usages (Legacy - Standalone)
-- ========================================
-- Include ul_label_usages that are NOT already linked via AGS or SG
SELECT 
    CONCAT('UL-', ulu.id) as unique_id,
    'ul_label_usages' as source_table,
    'Legacy - UL Label' as source_type,
    ulu.id as source_id,
    NULL as eyefi_serial_id,
    CAST(ulu.eyefi_serial_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as eyefi_serial_number,
    ulu.ul_label_id,
    CAST(ulu.ul_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_number,
    NULL as igt_serial_id,
    NULL as igt_serial_number,
    NULL as ags_serial_id,
    NULL as ags_serial_number,
    NULL as sg_asset_id,
    NULL as sg_asset_number,
    CAST(ulu.wo_nbr AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as wo_number,
    NULL as batch_id,
    ulu.date_used as used_date,
    CAST(ulu.user_name AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as used_by,
    'active' as status,
    CAST(ulu.is_voided AS UNSIGNED) as is_voided,
    ulu.void_date as voided_at,
    NULL as voided_by,
    CAST(ulu.void_reason AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as void_reason,
    ulu.created_at,
    -- Additional details
    NULL as part_number,
    CAST(ulu.wo_description AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as wo_description,
    CAST(ulu.wo_part AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as customer_part_number,
    NULL as property_site,
    NULL as inspector_name,
    CAST(ulu.customer_name AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as customer_name,
    NULL as po_number,
    CAST(ul.category AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_category
FROM eyefidb.ul_label_usages ulu
LEFT JOIN eyefidb.ul_labels ul ON ulu.ul_label_id = ul.id
WHERE NOT EXISTS (
      -- Exclude if already in new system
      SELECT 1 FROM eyefidb.serial_assignments sa 
      WHERE BINARY sa.ul_number = BINARY ulu.ul_number
  )
  AND NOT EXISTS (
      -- Exclude if already linked via AGS
      SELECT 1 FROM eyefidb.agsSerialGenerator ags
      WHERE BINARY ags.serialNumber = BINARY ulu.eyefi_serial_number
  )
  AND NOT EXISTS (
      -- Exclude if already linked via SG
      SELECT 1 FROM eyefidb.sgAssetGenerator sg
      WHERE BINARY sg.serialNumber = BINARY ulu.eyefi_serial_number
  )

UNION ALL

-- ========================================
-- 3. AGS Serial Generator (Legacy)
-- ========================================
SELECT 
    CONCAT('AGS-', ags.id) as unique_id,
    'agsSerialGenerator' as source_table,
    'Legacy - AGS' as source_type,
    ags.id as source_id,
    NULL as eyefi_serial_id,
    CAST(ags.serialNumber AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as eyefi_serial_number,
    ulu.ul_label_id,
    CAST(ulu.ul_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_number,
    NULL as igt_serial_id,
    NULL as igt_serial_number,
    ags.id as ags_serial_id,
    CAST(ags.generated_SG_asset AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ags_serial_number,
    NULL as sg_asset_id,
    NULL as sg_asset_number,
    NULL as wo_number,
    NULL as batch_id,
    ags.timeStamp as used_date,
    CAST(COALESCE(CONCAT(u.first, ' ', u.last), ags.inspectorName, CONCAT('User ID: ', ags.created_by), 'Unknown') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as used_by,
    CAST(CASE WHEN ags.active = 1 THEN 'active' ELSE 'inactive' END AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as status,
    0 as is_voided,
    NULL as voided_at,
    NULL as voided_by,
    NULL as void_reason,
    ags.timeStamp as created_at,
    -- Additional details
    CAST(ags.generated_SG_asset AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as part_number,
    NULL as wo_description,
    CAST(ags.sgPartNumber AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as customer_part_number,
    CAST(ags.property_site AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as property_site,
    CAST(ags.inspectorName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as inspector_name,
    'AGS' as customer_name,
    CAST(ags.poNumber AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as po_number,
    CAST(ul.category AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_category
FROM eyefidb.agsSerialGenerator ags
LEFT JOIN db.users u ON ags.created_by = u.id
LEFT JOIN eyefidb.ul_label_usages ulu ON BINARY ags.serialNumber = BINARY ulu.eyefi_serial_number
LEFT JOIN eyefidb.ul_labels ul ON ulu.ul_label_id = ul.id
WHERE ags.active = 1 
  AND NOT EXISTS (
      SELECT 1 FROM eyefidb.serial_assignments sa 
      WHERE BINARY sa.eyefi_serial_number = BINARY ags.serialNumber
  ) -- Exclude if already in new system

UNION ALL

-- ========================================
-- 4. SG Asset Generator (Legacy)
-- ========================================
SELECT 
    CONCAT('SG-', sg.id) as unique_id,
    'sgAssetGenerator' as source_table,
    'Legacy - SG' as source_type,
    sg.id as source_id,
    NULL as eyefi_serial_id,
    CAST(sg.serialNumber AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as eyefi_serial_number,
    ulu.ul_label_id,
    CAST(ulu.ul_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_number,
    NULL as igt_serial_id,
    NULL as igt_serial_number,
    NULL as ags_serial_id,
    NULL as ags_serial_number,
    sg.id as sg_asset_id,
    CAST(sg.generated_SG_asset AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as sg_asset_number,
    NULL as wo_number,
    NULL as batch_id,
    sg.timeStamp as used_date,
    CAST(COALESCE(CONCAT(u.first, ' ', u.last), sg.inspectorName, CONCAT('User ID: ', sg.created_by), 'Unknown') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as used_by,
    CAST(CASE WHEN sg.active = 1 THEN 'active' ELSE 'inactive' END AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as status,
    0 as is_voided,
    NULL as voided_at,
    NULL as voided_by,
    NULL as void_reason,
    sg.timeStamp as created_at,
    -- Additional details
    CAST(sg.generated_SG_asset AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as part_number,
    NULL as wo_description,
    CAST(sg.sgPartNumber AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as customer_part_number,
    CAST(sg.property_site AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as property_site,
    CAST(sg.inspectorName AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as inspector_name,
    'L&W' customer_name,
    CAST(sg.poNumber AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as po_number,
    CAST(ul.category AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as ul_category
FROM eyefidb.sgAssetGenerator sg
LEFT JOIN db.users u ON sg.created_by = u.id
LEFT JOIN eyefidb.ul_label_usages ulu ON BINARY sg.serialNumber = BINARY ulu.eyefi_serial_number
LEFT JOIN eyefidb.ul_labels ul ON ulu.ul_label_id = ul.id
WHERE sg.active = 1 
  AND NOT EXISTS (
      SELECT 1 FROM eyefidb.serial_assignments sa 
      WHERE BINARY sa.eyefi_serial_number = BINARY sg.serialNumber
  ) -- Exclude if already in new system

UNION ALL

-- ========================================
-- 5. IGT Serial Numbers (Only USED status)
-- ========================================
SELECT 
    CONCAT('IGT-', igt.id) as unique_id,
    'igt_serial_numbers' as source_table,
    'IGT Used' as source_type,
    igt.id as source_id,
    NULL as eyefi_serial_id,
    NULL as eyefi_serial_number,
    NULL as ul_label_id,
    NULL as ul_number,
    igt.id as igt_serial_id,
    CAST(igt.serial_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as igt_serial_number,
    NULL as ags_serial_id,
    NULL as ags_serial_number,
    NULL as sg_asset_id,
    NULL as sg_asset_number,
    NULL as wo_number,
    NULL as batch_id,
    igt.used_at as used_date,
    CAST(igt.used_by AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as used_by,
    CAST(igt.status AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as status,
    0 as is_voided,
    NULL as voided_at,
    NULL as voided_by,
    NULL as void_reason,
    igt.created_at,
    -- Additional details
    CAST(igt.serial_number AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci as part_number,
    NULL as wo_description,
    NULL as customer_part_number,
    NULL as property_site,
    NULL as inspector_name,
    NULL as customer_name,
    NULL as po_number,
    NULL as ul_category
FROM eyefidb.igt_serial_numbers igt
WHERE igt.status = 'used' -- Only consumed/used IGT serials
  AND igt.is_active = 1

ORDER BY used_date DESC;

-- ========================================
-- Summary Statistics View
-- ========================================
CREATE OR REPLACE VIEW vw_consumed_serials_summary AS
SELECT 
    source_table,
    source_type,
    COUNT(*) as total_consumed,
    COUNT(DISTINCT eyefi_serial_number) as unique_eyefi_serials,
    COUNT(DISTINCT ul_number) as unique_ul_labels,
    COUNT(DISTINCT igt_serial_number) as unique_igt_serials,
    COUNT(DISTINCT ags_serial_number) as unique_ags_serials,
    COUNT(DISTINCT sg_asset_number) as unique_sg_assets,
    MIN(used_date) as first_usage_date,
    MAX(used_date) as last_usage_date,
    COUNT(CASE WHEN DATE(used_date) = CURDATE() THEN 1 END) as consumed_today,
    COUNT(CASE WHEN YEARWEEK(used_date, 1) = YEARWEEK(CURDATE(), 1) THEN 1 END) as consumed_this_week,
    COUNT(CASE WHEN YEAR(used_date) = YEAR(CURDATE()) AND MONTH(used_date) = MONTH(CURDATE()) THEN 1 END) as consumed_this_month
FROM vw_all_consumed_serials
GROUP BY source_table, source_type
ORDER BY total_consumed DESC;

-- ========================================
-- Daily Consumption Trend View
-- ========================================
CREATE OR REPLACE VIEW vw_daily_consumption_trend AS
SELECT 
    DATE(used_date) as consumption_date,
    source_table,
    source_type,
    COUNT(*) as daily_count,
    COUNT(DISTINCT eyefi_serial_number) as eyefi_count,
    COUNT(DISTINCT ul_number) as ul_count,
    COUNT(DISTINCT igt_serial_number) as igt_count,
    COUNT(DISTINCT ags_serial_number) as ags_count,
    COUNT(DISTINCT sg_asset_number) as sg_count
FROM vw_all_consumed_serials
WHERE used_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(used_date), source_table, source_type
ORDER BY consumption_date DESC, source_table;

-- ========================================
-- User Consumption Activity View
-- ========================================
CREATE OR REPLACE VIEW vw_user_consumption_activity AS
SELECT 
    used_by,
    source_table,
    COUNT(*) as total_consumed,
    MIN(used_date) as first_consumption,
    MAX(used_date) as last_consumption,
    COUNT(CASE WHEN DATE(used_date) = CURDATE() THEN 1 END) as consumed_today
FROM vw_all_consumed_serials
WHERE used_by IS NOT NULL
GROUP BY used_by, source_table
ORDER BY total_consumed DESC;

-- ========================================
-- Work Order Serial Tracking View
-- ========================================
CREATE OR REPLACE VIEW vw_work_order_serials AS
SELECT 
    COALESCE(wo_number, po_number, 'No WO/PO') as work_order,
    source_table,
    source_type,
    COUNT(*) as serial_count,
    GROUP_CONCAT(DISTINCT eyefi_serial_number ORDER BY eyefi_serial_number SEPARATOR ', ') as eyefi_serials,
    GROUP_CONCAT(DISTINCT ul_number ORDER BY ul_number SEPARATOR ', ') as ul_numbers,
    GROUP_CONCAT(DISTINCT igt_serial_number ORDER BY igt_serial_number SEPARATOR ', ') as igt_serials,
    GROUP_CONCAT(DISTINCT ags_serial_number ORDER BY ags_serial_number SEPARATOR ', ') as ags_serials,
    GROUP_CONCAT(DISTINCT sg_asset_number ORDER BY sg_asset_number SEPARATOR ', ') as sg_assets,
    MIN(used_date) as first_used,
    MAX(used_date) as last_used
FROM vw_all_consumed_serials
WHERE wo_number IS NOT NULL OR po_number IS NOT NULL
GROUP BY work_order, source_table, source_type
ORDER BY last_used DESC;

-- ========================================
-- Usage Examples
-- ========================================

-- Example 1: Get all consumed serials (paginated)
-- SELECT * FROM vw_all_consumed_serials LIMIT 50;

-- Example 2: Get summary by source
-- SELECT * FROM vw_consumed_serials_summary;

-- Example 3: Search for specific serial number across all sources
-- SELECT * FROM vw_all_consumed_serials 
-- WHERE eyefi_serial_number LIKE '%147207%' 
--    OR ul_number LIKE '%T75097256%'
--    OR igt_serial_number LIKE '%IGT%'
--    OR ags_serial_number LIKE '%AGS%'
--    OR sg_asset_number LIKE '%SG%';

-- Example 4: Get all serials for a specific work order
-- SELECT * FROM vw_all_consumed_serials 
-- WHERE wo_number = '40745' OR po_number = '40745';

-- Example 5: Get all serials consumed by a specific user
-- SELECT * FROM vw_all_consumed_serials 
-- WHERE used_by = 'Richard Hernandez'
-- ORDER BY used_date DESC;

-- Example 6: Get consumption trend for last 30 days
-- SELECT * FROM vw_daily_consumption_trend;

-- Example 7: Get user activity summary
-- SELECT * FROM vw_user_consumption_activity;

-- Example 8: Get serials consumed today
-- SELECT * FROM vw_all_consumed_serials 
-- WHERE DATE(used_date) = CURDATE()
-- ORDER BY used_date DESC;

-- Example 9: Get serials by source type
-- SELECT * FROM vw_all_consumed_serials 
-- WHERE source_table = 'serial_assignments'
-- ORDER BY used_date DESC;

-- Example 10: Get voided assignments (from new system only)
-- SELECT * FROM vw_all_consumed_serials 
-- WHERE source_table = 'serial_assignments' AND is_voided = 1;

-- ========================================
-- Recommended Indexes for Performance
-- ========================================

-- On serial_assignments:
-- CREATE INDEX idx_sa_eyefi_serial_number ON serial_assignments(eyefi_serial_number);
-- CREATE INDEX idx_sa_ul_number ON serial_assignments(ul_number);
-- CREATE INDEX idx_sa_wo_number ON serial_assignments(wo_number);
-- CREATE INDEX idx_sa_consumed_at ON serial_assignments(consumed_at);
-- CREATE INDEX idx_sa_consumed_by ON serial_assignments(consumed_by);
-- CREATE INDEX idx_sa_is_voided ON serial_assignments(is_voided);

-- On ul_label_usages:
-- CREATE INDEX idx_ulu_eyefi_serial ON ul_label_usages(eyefi_serial_number);
-- CREATE INDEX idx_ulu_ul_number ON ul_label_usages(ul_number);
-- CREATE INDEX idx_ulu_wo_nbr ON ul_label_usages(wo_nbr);
-- CREATE INDEX idx_ulu_created_at ON ul_label_usages(created_at);

-- On agsSerialGenerator:
-- CREATE INDEX idx_ags_serial_number ON agsSerialGenerator(serialNumber);
-- CREATE INDEX idx_ags_ags_serial ON agsSerialGenerator(agsSerialNumber);
-- CREATE INDEX idx_ags_po_number ON agsSerialGenerator(poNumber);
-- CREATE INDEX idx_ags_timestamp ON agsSerialGenerator(timeStamp);
-- CREATE INDEX idx_ags_active ON agsSerialGenerator(active);

-- On sgAssetGenerator:
-- CREATE INDEX idx_sg_serial_number ON sgAssetGenerator(serialNumber);
-- CREATE INDEX idx_sg_asset_number ON sgAssetGenerator(sgAssetNumber);
-- CREATE INDEX idx_sg_po_number ON sgAssetGenerator(poNumber);
-- CREATE INDEX idx_sg_timestamp ON sgAssetGenerator(timeStamp);
-- CREATE INDEX idx_sg_active ON sgAssetGenerator(active);

-- On igt_serial_numbers:
-- CREATE INDEX idx_igt_serial_number ON igt_serial_numbers(serial_number);
-- CREATE INDEX idx_igt_status ON igt_serial_numbers(status);
-- CREATE INDEX idx_igt_used_at ON igt_serial_numbers(used_at);
-- CREATE INDEX idx_igt_used_by ON igt_serial_numbers(used_by);
-- CREATE INDEX idx_igt_is_active ON igt_serial_numbers(is_active);

-- ========================================
-- Notes
-- ========================================
-- 1. This view consolidates ALL consumed/used serials from all sources
-- 2. Each record has a unique_id prefix to identify the source
-- 3. Only active/non-voided records are included (except voided can be filtered)
-- 4. IGT serials are included ONLY if status = 'used'
-- 5. Legacy tables (ags, sg, ul_label_usages) only include active records
-- 6. Serial_assignments includes only non-voided records
-- 7. All dates are normalized to 'used_date' for consistency
-- 8. All users are normalized to 'used_by' for consistency
-- 9. Work orders from both 'wo_number' and 'po_number' columns
-- 10. Supports full-text search across all serial types

-- ========================================
-- End of Views
-- ========================================
