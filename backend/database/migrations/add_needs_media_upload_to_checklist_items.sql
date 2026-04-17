-- Add persistent flag to track checklist items that still need sample media uploads.
-- This helps teams identify items to revisit for missing sample photos/videos.

SET @needs_media_upload_col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'checklist_items'
    AND column_name = 'needs_media_upload'
);

SET @add_needs_media_upload_col_sql = IF(
  @needs_media_upload_col_exists = 0,
  'ALTER TABLE checklist_items ADD COLUMN needs_media_upload TINYINT(1) NOT NULL DEFAULT 0 AFTER sample_videos',
  'SELECT 1'
);

PREPARE stmt_add_col FROM @add_needs_media_upload_col_sql;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @needs_media_upload_idx_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'checklist_items'
    AND index_name = 'idx_needs_media_upload'
);

SET @add_needs_media_upload_idx_sql = IF(
  @needs_media_upload_idx_exists = 0,
  'ALTER TABLE checklist_items ADD INDEX idx_needs_media_upload (needs_media_upload)',
  'SELECT 1'
);

PREPARE stmt_add_idx FROM @add_needs_media_upload_idx_sql;
EXECUTE stmt_add_idx;
DEALLOCATE PREPARE stmt_add_idx;

-- Backfill existing rows based on current submission_type and available sample media.
UPDATE checklist_items
SET needs_media_upload = CASE
  WHEN submission_type = 'photo' THEN
    CASE
      WHEN (sample_image_url IS NULL OR TRIM(sample_image_url) = '')
           AND COALESCE(JSON_LENGTH(sample_images), 0) = 0
      THEN 1 ELSE 0
    END
  WHEN submission_type = 'video' THEN
    CASE
      WHEN (sample_video_url IS NULL OR TRIM(sample_video_url) = '')
           AND COALESCE(JSON_LENGTH(sample_videos), 0) = 0
      THEN 1 ELSE 0
    END
  WHEN submission_type = 'either' THEN
    CASE
      WHEN (sample_image_url IS NULL OR TRIM(sample_image_url) = '')
           AND COALESCE(JSON_LENGTH(sample_images), 0) = 0
           AND (sample_video_url IS NULL OR TRIM(sample_video_url) = '')
           AND COALESCE(JSON_LENGTH(sample_videos), 0) = 0
      THEN 1 ELSE 0
    END
  ELSE 0
END;
