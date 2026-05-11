-- Migration: View-based legacy UL usage visibility (no serial_assignments backfill)
-- Date: 2026-05-10
-- Purpose: Surface legacy ul_label_usages in reporting/API via vw_all_consumed_serials
-- Safety: This migration performs no INSERT/UPDATE/DELETE against business tables.

USE eyefidb;

DROP VIEW IF EXISTS vw_all_consumed_serials;

CREATE VIEW vw_all_consumed_serials AS

-- 1) New system serial assignments
SELECT
	CONVERT(CONCAT('SA-', sa.id) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS unique_id,
	_utf8mb4 'serial_assignments' COLLATE utf8mb4_unicode_ci AS source_table,
	_utf8mb4 'New System' COLLATE utf8mb4_unicode_ci AS source_type,
	sa.id AS source_id,
	sa.eyefi_serial_id,
	CONVERT(sa.eyefi_serial_number USING utf8mb4) COLLATE utf8mb4_unicode_ci AS eyefi_serial_number,
	sa.ul_label_id,
	CONVERT(sa.ul_number USING utf8mb4) COLLATE utf8mb4_unicode_ci AS ul_number,
	NULL AS igt_serial_id,
	NULL AS igt_serial_number,
	NULL AS ags_serial_id,
	NULL AS ags_serial_number,
	NULL AS sg_asset_id,
	NULL AS sg_asset_number,
	CONVERT(sa.wo_number USING utf8mb4) COLLATE utf8mb4_unicode_ci AS wo_number,
	sa.batch_id,
	sa.consumed_at AS used_date,
	CONVERT(sa.consumed_by USING utf8mb4) COLLATE utf8mb4_unicode_ci AS used_by,
	CONVERT(sa.status USING utf8mb4) COLLATE utf8mb4_unicode_ci AS status,
	sa.is_voided,
	sa.voided_at,
	CONVERT(sa.voided_by USING utf8mb4) COLLATE utf8mb4_unicode_ci AS voided_by,
	CONVERT(sa.void_reason USING utf8mb4) COLLATE utf8mb4_unicode_ci AS void_reason,
	sa.created_at,
	CONVERT(COALESCE(sa.cp_cust_part, sa.wo_part) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS part_number,
	CONVERT(sa.wo_description USING utf8mb4) COLLATE utf8mb4_unicode_ci AS wo_description,
	CONVERT(sa.generated_asset_number USING utf8mb4) COLLATE utf8mb4_unicode_ci AS customer_part_number,
	NULL AS property_site,
	NULL AS inspector_name,
	CONVERT(sa.cp_cust USING utf8mb4) COLLATE utf8mb4_unicode_ci AS customer_name,
	CONVERT(sa.po_number USING utf8mb4) COLLATE utf8mb4_unicode_ci AS po_number,
	CONVERT(ul.category USING utf8mb4) COLLATE utf8mb4_unicode_ci AS ul_category
FROM eyefidb.serial_assignments sa
LEFT JOIN eyefidb.ul_labels ul
	ON CONVERT(sa.ul_number USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(ul.ul_number USING utf8mb4) COLLATE utf8mb4_unicode_ci
WHERE COALESCE(sa.is_voided, 0) = 0

UNION ALL

-- 2) Legacy UL usages (visible without backfill)
SELECT
	CONVERT(CONCAT('UL-', ulu.id) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS unique_id,
	_utf8mb4 'ul_label_usages' COLLATE utf8mb4_unicode_ci AS source_table,
	_utf8mb4 'Legacy - UL Label' COLLATE utf8mb4_unicode_ci AS source_type,
	ulu.id AS source_id,
	NULL AS eyefi_serial_id,
	CONVERT(ulu.eyefi_serial_number USING utf8mb4) COLLATE utf8mb4_unicode_ci AS eyefi_serial_number,
	ulu.ul_label_id,
	CONVERT(ulu.ul_number USING utf8mb4) COLLATE utf8mb4_unicode_ci AS ul_number,
	NULL AS igt_serial_id,
	NULL AS igt_serial_number,
	NULL AS ags_serial_id,
	NULL AS ags_serial_number,
	NULL AS sg_asset_id,
	NULL AS sg_asset_number,
	CONVERT(CAST(ulu.wo_nbr AS CHAR) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS wo_number,
	NULL AS batch_id,
	COALESCE(CONCAT(ulu.date_used, ' 00:00:00'), ulu.created_at) AS used_date,
	CONVERT(ulu.user_name USING utf8mb4) COLLATE utf8mb4_unicode_ci AS used_by,
	_utf8mb4 'consumed' COLLATE utf8mb4_unicode_ci AS status,
	CAST(COALESCE(ulu.is_voided, 0) AS UNSIGNED) AS is_voided,
	ulu.void_date AS voided_at,
	NULL AS voided_by,
	CONVERT(ulu.void_reason USING utf8mb4) COLLATE utf8mb4_unicode_ci AS void_reason,
	ulu.created_at,
	NULL AS part_number,
	CONVERT(ulu.wo_description USING utf8mb4) COLLATE utf8mb4_unicode_ci AS wo_description,
	CONVERT(ulu.wo_part USING utf8mb4) COLLATE utf8mb4_unicode_ci AS customer_part_number,
	NULL AS property_site,
	NULL AS inspector_name,
	CONVERT(ulu.customer_name USING utf8mb4) COLLATE utf8mb4_unicode_ci AS customer_name,
	NULL AS po_number,
	CONVERT(ul.category USING utf8mb4) COLLATE utf8mb4_unicode_ci AS ul_category
FROM eyefidb.ul_label_usages ulu
LEFT JOIN eyefidb.ul_labels ul
	ON ulu.ul_label_id = ul.id
WHERE NOT EXISTS (
	SELECT 1
	FROM eyefidb.serial_assignments sa
	WHERE CONVERT(sa.ul_number USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(ulu.ul_number USING utf8mb4) COLLATE utf8mb4_unicode_ci
	  AND COALESCE(sa.is_voided, 0) = 0
);

-- Verification checks
SELECT source_table, source_type, COUNT(*) AS row_count
FROM eyefidb.vw_all_consumed_serials
GROUP BY source_table, source_type
ORDER BY row_count DESC;

SELECT unique_id, source_table, ul_number, eyefi_serial_number, used_date
FROM eyefidb.vw_all_consumed_serials
WHERE ul_number IN ('T75096963', 'T75096964')
ORDER BY used_date DESC;
