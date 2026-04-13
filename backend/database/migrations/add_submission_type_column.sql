-- Migration: Add/upgrade submission_type column on checklist_items
-- Date: 2025-11-25
-- Description: Add separate submission_type column to control whether items accept photos, videos, audio, either, or none
-- Values: 'photo', 'video', 'audio', 'either', 'none'

-- Add column when missing; otherwise upgrade legacy enum to include audio/none.
SET @db_name := DATABASE();
SET @has_submission_type := (
	SELECT COUNT(*)
	FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = @db_name
		AND TABLE_NAME = 'checklist_items'
		AND COLUMN_NAME = 'submission_type'
);

SET @submission_type_sql := IF(
	@has_submission_type = 0,
	"ALTER TABLE checklist_items
	 ADD COLUMN submission_type ENUM('photo', 'video', 'audio', 'either', 'none') DEFAULT 'photo'
	 COMMENT 'Controls submission mode: photo, video, audio, either, or none'
	 AFTER photo_requirements",
	"ALTER TABLE checklist_items
	 MODIFY COLUMN submission_type ENUM('photo', 'video', 'audio', 'either', 'none') DEFAULT 'photo'
	 COMMENT 'Controls submission mode: photo, video, audio, either, or none'"
);

PREPARE submission_type_stmt FROM @submission_type_sql;
EXECUTE submission_type_stmt;
DEALLOCATE PREPARE submission_type_stmt;

-- Add index for filtering by submission type only when missing.
SET @has_submission_type_idx := (
	SELECT COUNT(*)
	FROM INFORMATION_SCHEMA.STATISTICS
	WHERE TABLE_SCHEMA = @db_name
		AND TABLE_NAME = 'checklist_items'
		AND INDEX_NAME = 'idx_submission_type'
);

SET @submission_type_idx_sql := IF(
	@has_submission_type_idx = 0,
	'ALTER TABLE checklist_items ADD INDEX idx_submission_type (submission_type)',
	'SELECT ''idx_submission_type already exists'' AS info'
);

PREPARE submission_type_idx_stmt FROM @submission_type_idx_sql;
EXECUTE submission_type_idx_stmt;
DEALLOCATE PREPARE submission_type_idx_stmt;
