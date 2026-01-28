-- Migration: Add video_requirements JSON column to checklist_items
-- Date: 2025-11-25
-- Description: Adds video_requirements JSON column to store video-specific configuration
-- Includes: submission_time_seconds (per-item submission deadline in seconds), max_video_duration_seconds, etc.
-- Run AFTER: add_sample_videos_column.sql

ALTER TABLE checklist_items 
ADD COLUMN video_requirements JSON DEFAULT NULL AFTER sample_videos
COMMENT 'JSON object containing video-specific settings: submission_time_seconds, max_video_duration_seconds, etc.';
