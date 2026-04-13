-- Add published_at timestamp to checklist_templates
-- Purpose: provide an explicit publish timestamp for operator template selection

ALTER TABLE checklist_templates
  ADD COLUMN published_at TIMESTAMP NULL COMMENT 'When template was published/approved for operator use' AFTER updated_at,
  ADD INDEX idx_published_at (published_at);

-- Backfill: mark existing published templates as published at their created time (best-effort)
UPDATE checklist_templates
SET published_at = COALESCE(published_at, created_at)
WHERE is_active = 1 AND is_draft = 0 AND published_at IS NULL;
