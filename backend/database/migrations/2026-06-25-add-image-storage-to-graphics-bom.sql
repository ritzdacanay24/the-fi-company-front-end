-- Migration: Add image storage metadata columns to graphicsInventory
-- Legacy records will have NULL values and fall back to the legacy URL
-- New S3-uploaded images will have image_storage_source='bucket', bucket, and key populated

ALTER TABLE graphicsInventory
  ADD COLUMN image_storage_source VARCHAR(20)   NULL DEFAULT NULL COMMENT 'Storage backend: NULL=legacy, bucket=S3',
  ADD COLUMN image_storage_bucket VARCHAR(255)  NULL DEFAULT NULL COMMENT 'S3 bucket name',
  ADD COLUMN image_storage_key    VARCHAR(1024) NULL DEFAULT NULL COMMENT 'S3 object key';
