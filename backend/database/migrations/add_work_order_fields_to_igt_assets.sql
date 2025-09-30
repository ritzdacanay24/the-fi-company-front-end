-- Add work order tracking columns to igt_assets table
-- Migration: Add work order part and description fields
-- Date: 2025-09-30

ALTER TABLE igt_assets 
ADD COLUMN wo_part VARCHAR(255) NULL COMMENT 'Work order part number',
ADD COLUMN wo_description TEXT NULL COMMENT 'Work order description';