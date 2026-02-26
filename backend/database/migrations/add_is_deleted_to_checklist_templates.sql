-- Add is_deleted flag to checklist_templates to distinguish soft-deleted templates from inactive historical versions.
-- This enables returning inactive versions (history) without re-showing deleted templates.

ALTER TABLE checklist_templates
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;

CREATE INDEX idx_checklist_templates_is_deleted ON checklist_templates (is_deleted);
