-- ========================================
-- Available Serial Number Views
-- ========================================
-- Purpose: Determine availability by checking BOTH new and legacy tables
-- 
-- HYBRID APPROACH:
--   - Historical data: Stays in legacy tables (ul_label_usages, agsSerialGenerator, sgAssetGenerator)
--   - New consumption: Goes to serial_assignments table
--   - Availability check: LEFT JOIN to BOTH new and legacy tables
--   - If serial is in ANY table → consumed
--   - If serial is in NO tables → available
--
-- ONLY for PRE-LOADED serials:
--   - EyeFi serial numbers (pre-loaded by admin)
--   - UL labels (pre-loaded by admin)
--   - IGT serial numbers (pre-loaded by admin)
--
-- NOT for GENERATED serials (SG, AGS):
--   - SG/AGS are generated on-the-fly and immediately consumed
--   - No need for availability views for generated serials
-- ========================================

-- ========================================
-- 1. Available EyeFi Serial Numbers
-- ========================================
-- Checks BOTH serial_assignments (new) AND legacy tables (ul_label_usages, agsSerialGenerator, sgAssetGenerator)
CREATE OR REPLACE VIEW v_available_eyefi_serials AS
SELECT 
    esn.id,
    esn.serial_number,
    esn.product_model,
    esn.hardware_version,
    esn.firmware_version,
    esn.batch_number,
    esn.status,
    esn.is_consumed,
    esn.consumed_at,
    esn.consumed_by,
    esn.assigned_to_table,
    esn.assigned_to_id,
    esn.created_at,
    esn.created_by,
    -- Availability flag: Check if serial exists in ANY consumption table
    CASE 
        WHEN sa.id IS NOT NULL THEN 'consumed'  -- In serial_assignments (new system)
        WHEN ul.id IS NOT NULL THEN 'consumed'  -- In ul_label_usages (legacy)
        WHEN ags.id IS NOT NULL THEN 'consumed' -- In agsSerialGenerator (legacy)
        WHEN sg.id IS NOT NULL THEN 'consumed'  -- In sgAssetGenerator (legacy)
        WHEN esn.status = 'available' THEN 'available'
        ELSE 'unavailable'
    END as availability_status,
    -- Show where it was consumed (for debugging)
    CASE 
        WHEN sa.id IS NOT NULL THEN 'serial_assignments'
        WHEN ul.id IS NOT NULL THEN 'ul_label_usages'
        WHEN ags.id IS NOT NULL THEN 'agsSerialGenerator'
        WHEN sg.id IS NOT NULL THEN 'sgAssetGenerator'
        ELSE NULL
    END as consumed_in_table
FROM eyefi_serial_numbers esn
LEFT JOIN serial_assignments sa ON esn.id = sa.eyefi_serial_id
LEFT JOIN ul_label_usages ul ON BINARY esn.serial_number = BINARY ul.eyefi_serial_number
LEFT JOIN agsSerialGenerator ags ON BINARY esn.serial_number = BINARY ags.serialNumber
LEFT JOIN sgAssetGenerator sg ON BINARY esn.serial_number = BINARY sg.serialNumber
WHERE esn.is_active = 1
ORDER BY esn.id;

-- ========================================
-- 2. Available UL Labels
-- ========================================
-- Checks BOTH serial_assignments (new) AND ul_label_usages (legacy)
CREATE OR REPLACE VIEW v_available_ul_labels AS
SELECT 
    ul.id,
    ul.ul_number,
    ul.description,
    ul.category,
    ul.manufacturer,
    ul.part_number,
    ul.status,
    ul.is_consumed,
    ul.consumed_at,
    ul.consumed_by,
    ul.created_at,
    ul.created_by,
    -- Availability flag: Check if UL exists in ANY consumption table
    CASE 
        WHEN sa.id IS NOT NULL THEN 'consumed'     -- In serial_assignments (new system)
        WHEN ulu.id IS NOT NULL THEN 'consumed'    -- In ul_label_usages (legacy)
        WHEN ul.status = 'active' THEN 'available'
        ELSE 'unavailable'
    END as availability_status,
    -- Show where it was consumed (for debugging)
    CASE 
        WHEN sa.id IS NOT NULL THEN 'serial_assignments'
        WHEN ulu.id IS NOT NULL THEN 'ul_label_usages'
        ELSE NULL
    END as consumed_in_table
FROM ul_labels ul
LEFT JOIN serial_assignments sa ON ul.id = sa.ul_label_id
LEFT JOIN ul_label_usages ulu ON ul.id = ulu.ul_label_id
ORDER BY ul.id;

-- ========================================
-- 3. Available IGT Serial Numbers
-- ========================================
CREATE OR REPLACE VIEW v_available_igt_serials AS
SELECT 
    igt.id,
    igt.serial_number,
    igt.category,
    igt.status,
    igt.manufacturer,
    igt.model,
    igt.used_at,
    igt.used_by,
    igt.used_in_asset_id,
    igt.used_in_asset_number,
    igt.created_at,
    igt.created_by,
    -- Availability flag
    CASE 
        WHEN igt.status = 'available' THEN 'available'
        WHEN igt.status = 'used' THEN 'consumed'
        ELSE 'unavailable'
    END as availability_status
FROM igt_serial_numbers igt
WHERE igt.is_active = 1
ORDER BY igt.id;

-- ========================================
-- 4. Available Light & Wonder (SG) Assets
-- ========================================
-- NOTE: SG assets are GENERATED, not pre-loaded
-- When generated, they are immediately consumed
-- No need for availability view - included for reference only
-- ========================================
/*
CREATE OR REPLACE VIEW v_available_sg_assets AS
SELECT 
    sg.id,
    sg.asset_number,
    sg.created_at,
    sg.created_by,
    -- Availability flag
    CASE 
        WHEN sa.id IS NULL THEN 'available'
        ELSE 'consumed'
    END as availability_status,
    -- Usage info (if consumed)
    sa.po_number as consumed_po,
    sa.consumed_at,
    sa.consumed_by,
    sa.eyefi_serial_number as paired_eyefi_serial,
    sa.ul_number as paired_ul_label
FROM sg_asset_sequence sg
LEFT JOIN serial_assignments sa 
    ON sg.id = sa.customer_asset_id 
    AND sa.customer_type_id = (SELECT id FROM customer_types WHERE customer_code = 'sg')
WHERE sg.is_active = 1
ORDER BY sg.id;
*/

-- ========================================
-- 5. Available AGS Serial Numbers
-- ========================================
-- NOTE: AGS serials are GENERATED, not pre-loaded
-- When generated, they are immediately consumed
-- No need for availability view - included for reference only
-- ========================================
/*
CREATE OR REPLACE VIEW v_available_ags_serials AS
SELECT 
    ags.id,
    ags.serial_number,
    ags.created_at,
    ags.created_by,
    -- Availability flag
    CASE 
        WHEN sa.id IS NULL THEN 'available'
        ELSE 'consumed'
    END as availability_status,
    -- Usage info (if consumed)
    sa.po_number as consumed_po,
    sa.consumed_at,
    sa.consumed_by,
    sa.eyefi_serial_number as paired_eyefi_serial,
    sa.ul_number as paired_ul_label
FROM ags_serial_sequence ags
LEFT JOIN serial_assignments sa 
    ON ags.id = sa.customer_asset_id 
    AND sa.customer_type_id = (SELECT id FROM customer_types WHERE customer_code = 'ags')
WHERE ags.is_active = 1
ORDER BY ags.id;
*/

-- ========================================
-- 6. Availability Summary Statistics
-- ========================================
-- Only for PRE-LOADED serials (EyeFi, UL, IGT)
-- ========================================
CREATE OR REPLACE VIEW v_serial_availability_summary AS
SELECT 
    'EyeFi Serials' as serial_type,
    'pre-loaded' as serial_source,
    COUNT(*) as total_count,
    SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN availability_status != 'available' THEN 1 ELSE 0 END) as consumed_count,
    ROUND(SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as available_percentage
FROM v_available_eyefi_serials

UNION ALL

SELECT 
    'UL Labels' as serial_type,
    'pre-loaded' as serial_source,
    COUNT(*) as total_count,
    SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN availability_status != 'available' THEN 1 ELSE 0 END) as consumed_count,
    ROUND(SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as available_percentage
FROM v_available_ul_labels

UNION ALL

SELECT 
    'IGT Serials' as serial_type,
    'pre-loaded' as serial_source,
    COUNT(*) as total_count,
    SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN availability_status != 'available' THEN 1 ELSE 0 END) as consumed_count,
    ROUND(SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as available_percentage
FROM v_available_igt_serials;

-- Note: SG and AGS are excluded because they are generated, not pre-loaded

-- ========================================
-- 7. Complete Assignment History View
-- ========================================
-- UNION of BOTH new (serial_assignments) AND legacy tables (ul_label_usages, agsSerialGenerator, sgAssetGenerator)
CREATE OR REPLACE VIEW v_serial_assignment_history AS
-- New system: serial_assignments
SELECT 
    sa.id as assignment_id,
    sa.eyefi_serial_number,
    sa.ul_number,
    sa.po_number,
    sa.part_number,
    sa.property_site,
    sa.inspector_name,
    sa.status as assignment_status,
    sa.consumed_at,
    sa.consumed_by,
    sa.notes,
    'Serial Assignment (New)' as assignment_type,
    sa.created_at as record_created_at
FROM serial_assignments sa

UNION ALL

-- Legacy: UL Label Usages
SELECT 
    ul.id as assignment_id,
    ul.eyefi_serial_number,
    ul.ul_number,
    ul.wo_nbr as po_number,
    ul.wo_part as part_number,
    ul.customer_name as property_site,
    ul.user_name as inspector_name,
    'active' as assignment_status,
    ul.created_at as consumed_at,
    ul.created_by as consumed_by,
    ul.notes,
    'UL Label Usage (Legacy)' as assignment_type,
    ul.created_at as record_created_at
FROM ul_label_usages ul

UNION ALL

-- Legacy: AGS Serial Generator
SELECT 
    ags.id as assignment_id,
    ags.serialNumber as eyefi_serial_number,
    NULL as ul_number,
    ags.poNumber as po_number,
    ags.sgPartNumber as part_number,
    ags.property_site as property_site,
    ags.inspectorName as inspector_name,
    CASE WHEN ags.active = 1 THEN 'active' ELSE 'inactive' END as assignment_status,
    ags.timeStamp as consumed_at,
    ags.created_by as consumed_by,
    NULL as notes,
    'AGS Serial (Legacy)' as assignment_type,
    ags.timeStamp as record_created_at
FROM agsSerialGenerator ags

UNION ALL

-- Legacy: SG Asset Generator
SELECT 
    sg.id as assignment_id,
    sg.serialNumber as eyefi_serial_number,
    NULL as ul_number,
    sg.poNumber as po_number,
    sg.sgPartNumber as part_number,
    sg.property_site as property_site,
    sg.inspectorName as inspector_name,
    CASE WHEN sg.active = 1 THEN 'active' ELSE 'inactive' END as assignment_status,
    sg.timeStamp as consumed_at,
    sg.created_by as consumed_by,
    NULL as notes,
    'SG Asset (Legacy)' as assignment_type,
    sg.timeStamp as record_created_at
FROM sgAssetGenerator sg

ORDER BY consumed_at DESC;

-- ========================================
-- 8. Query Helper Views
-- ========================================
-- Only for PRE-LOADED serials (EyeFi, UL, IGT)
-- ========================================

-- Get ONLY available (not consumed) EyeFi serials
CREATE OR REPLACE VIEW v_eyefi_serials_only_available AS
SELECT * FROM v_available_eyefi_serials
WHERE availability_status = 'available'
ORDER BY id;

-- Get ONLY available UL labels
CREATE OR REPLACE VIEW v_ul_labels_only_available AS
SELECT * FROM v_available_ul_labels
WHERE availability_status = 'available'
ORDER BY id;

-- Get ONLY available IGT serials
CREATE OR REPLACE VIEW v_igt_serials_only_available AS
SELECT * FROM v_available_igt_serials
WHERE availability_status = 'available'
ORDER BY id;

-- Note: No views needed for SG/AGS - they are generated and immediately consumed

-- ========================================
-- Usage Examples
-- ========================================

-- Example 1: Get next 5 available EyeFi serials
-- SELECT * FROM v_eyefi_serials_only_available LIMIT 5;

-- Example 2: Get next 5 available UL labels
-- SELECT * FROM v_ul_labels_only_available LIMIT 5;

-- Example 3: Get next 5 available IGT serials
-- SELECT * FROM v_igt_serials_only_available LIMIT 5;

-- Example 4: Check availability summary
-- SELECT * FROM v_serial_availability_summary;

-- Example 5: Get assignment history for a specific work order
-- SELECT * FROM v_serial_assignment_history 
-- WHERE po_number = 'WO12345';

-- Example 6: Check if specific EyeFi serial is available
-- SELECT id, serial_number, availability_status 
-- FROM v_available_eyefi_serials 
-- WHERE serial_number = 'EF-2024-00100';

-- Example 7: Get all consumed serials for customer IGT
-- SELECT * FROM v_serial_assignment_history
-- WHERE customer_code = 'igt'
-- ORDER BY consumed_at DESC;

-- ========================================
-- Notes
-- ========================================
-- 1. HYBRID APPROACH: Checks BOTH serial_assignments (new) AND legacy tables
-- 2. No data migration required - historical data stays in legacy tables
-- 3. Going forward: All NEW consumption writes to serial_assignments
-- 4. Availability is determined by LEFT JOIN to multiple tables
-- 5. Single view interface - application doesn't need to know about legacy tables
-- 6. Easy transition - can deprecate legacy tables later if needed
-- 7. Better performance with proper indexing
-- 8. Complete audit trail - all usage visible in v_serial_assignment_history

-- ========================================
-- Recommended Indexes
-- ========================================
-- On serial_assignments (new system):
-- CREATE INDEX idx_sa_eyefi_serial_id ON serial_assignments(eyefi_serial_id);
-- CREATE INDEX idx_sa_ul_label_id ON serial_assignments(ul_label_id);
-- CREATE INDEX idx_sa_customer_asset ON serial_assignments(customer_type_id, customer_asset_id);
-- CREATE INDEX idx_sa_po_number ON serial_assignments(po_number);
-- CREATE INDEX idx_sa_consumed_at ON serial_assignments(consumed_at);

-- On legacy tables (for lookup performance):
-- CREATE INDEX idx_ulu_eyefi_serial ON ul_label_usages(eyefi_serial_number);
-- CREATE INDEX idx_ulu_ul_label_id ON ul_label_usages(ul_label_id);
-- CREATE INDEX idx_ags_serial ON agsSerialGenerator(serialNumber);
-- CREATE INDEX idx_sg_serial ON sgAssetGenerator(serialNumber);

-- ========================================
-- End of Views
-- ========================================
