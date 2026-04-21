SET @has_storage_source := (
	SELECT COUNT(*)
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
		AND TABLE_NAME = 'attachments'
		AND COLUMN_NAME = 'storage_source'
);

SET @add_storage_source_sql := IF(
	@has_storage_source = 0,
	'ALTER TABLE attachments ADD COLUMN storage_source VARCHAR(20) NULL DEFAULT NULL AFTER directory',
	'SELECT 1'
);

PREPARE add_storage_source_stmt FROM @add_storage_source_sql;
EXECUTE add_storage_source_stmt;
DEALLOCATE PREPARE add_storage_source_stmt;

ALTER TABLE attachments
MODIFY COLUMN storage_source VARCHAR(20) NULL DEFAULT NULL;

UPDATE attachments
SET storage_source = NULL;
