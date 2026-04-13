-- Add draft status and auto-save tracking to checklist templates
-- Migration: Add draft functionality for auto-save feature

ALTER TABLE checklist_templates 
ADD COLUMN is_draft TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Draft status: 1=draft, 0=published',
ADD COLUMN last_autosave_at TIMESTAMP NULL COMMENT 'Last auto-save timestamp',
ADD INDEX idx_is_draft (is_draft, is_active);

-- Update existing templates to be published (not drafts)
UPDATE checklist_templates SET is_draft = 0 WHERE is_active = 1;

-- Note: Drafts are still subject to is_active flag for soft deletion
-- is_draft=1, is_active=1 = Active Draft (visible in draft list)
-- is_draft=0, is_active=1 = Published Template (visible in template list)
-- is_active=0 = Deleted (hidden from all lists)
