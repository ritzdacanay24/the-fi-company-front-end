SET @has_storage_source := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_resources'
    AND COLUMN_NAME = 'storage_source'
);

SET @add_storage_source_sql := IF(
  @has_storage_source = 0,
  'ALTER TABLE app_resources ADD COLUMN storage_source VARCHAR(20) NULL DEFAULT NULL AFTER link',
  'SELECT 1'
);

PREPARE add_storage_source_stmt FROM @add_storage_source_sql;
EXECUTE add_storage_source_stmt;
DEALLOCATE PREPARE add_storage_source_stmt;

SET @has_storage_bucket := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_resources'
    AND COLUMN_NAME = 'storage_bucket'
);

SET @add_storage_bucket_sql := IF(
  @has_storage_bucket = 0,
  'ALTER TABLE app_resources ADD COLUMN storage_bucket VARCHAR(255) NULL DEFAULT NULL AFTER storage_source',
  'SELECT 1'
);

PREPARE add_storage_bucket_stmt FROM @add_storage_bucket_sql;
EXECUTE add_storage_bucket_stmt;
DEALLOCATE PREPARE add_storage_bucket_stmt;

SET @has_storage_key := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_resources'
    AND COLUMN_NAME = 'storage_key'
);

SET @add_storage_key_sql := IF(
  @has_storage_key = 0,
  'ALTER TABLE app_resources ADD COLUMN storage_key TEXT NULL AFTER storage_bucket',
  'SELECT 1'
);

PREPARE add_storage_key_stmt FROM @add_storage_key_sql;
EXECUTE add_storage_key_stmt;
DEALLOCATE PREPARE add_storage_key_stmt;

ALTER TABLE app_resources
MODIFY COLUMN storage_source VARCHAR(20) NULL DEFAULT NULL,
MODIFY COLUMN storage_bucket VARCHAR(255) NULL DEFAULT NULL,
MODIFY COLUMN storage_key TEXT NULL;

UPDATE app_resources
SET storage_source = CASE
  WHEN storage_source IS NOT NULL AND TRIM(storage_source) <> '' THEN storage_source
  WHEN link LIKE 'http%amazonaws.com/%' THEN 'bucket'
  WHEN link LIKE '/attachments/%' OR link LIKE 'attachments/%' OR link LIKE '/uploads/%' OR link LIKE 'uploads/%' THEN 'local'
  ELSE storage_source
END
WHERE storage_source IS NULL OR TRIM(storage_source) = '';

UPDATE app_resources
SET storage_key = CASE
  WHEN storage_source = 'bucket' AND (storage_key IS NULL OR TRIM(storage_key) = '') THEN
    CASE
      WHEN link LIKE 'http%' THEN
        TRIM(BOTH '/' FROM SUBSTRING_INDEX(SUBSTRING_INDEX(link, '?', 1), '.com/', -1))
      ELSE TRIM(BOTH '/' FROM REPLACE(REPLACE(link, 'attachments/', ''), 'uploads/', ''))
    END
  ELSE storage_key
END;

UPDATE app_resources
SET storage_key = CASE
  WHEN storage_source = 'bucket' AND storage_key LIKE CONCAT(LOWER(TRIM(COALESCE(storage_bucket, ''))), '/%')
    THEN SUBSTRING(storage_key, LENGTH(TRIM(storage_bucket)) + 2)
  ELSE storage_key
END;
