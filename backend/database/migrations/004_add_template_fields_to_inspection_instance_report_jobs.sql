-- Migration: Add template identity fields to inspection_instance_report_jobs
-- Purpose: Store template id and template revision/version id on each report job row
-- Date: 2026-05-13
-- Author: Copilot

-- Check and add template_id column
SET @column_exists := (SELECT COUNT(*) 
                        FROM information_schema.COLUMNS 
                        WHERE TABLE_SCHEMA = 'eyefidb' 
                          AND TABLE_NAME = 'inspection_instance_report_jobs' 
                          AND COLUMN_NAME = 'template_id');

IF @column_exists = 0 THEN
  ALTER TABLE eyefidb.inspection_instance_report_jobs
    ADD COLUMN template_id INT NULL AFTER instance_id;
END IF;

-- Check and add template_revision_id column
SET @column_exists := (SELECT COUNT(*) 
                        FROM information_schema.COLUMNS 
                        WHERE TABLE_SCHEMA = 'eyefidb' 
                          AND TABLE_NAME = 'inspection_instance_report_jobs' 
                          AND COLUMN_NAME = 'template_revision_id');

IF @column_exists = 0 THEN
  ALTER TABLE eyefidb.inspection_instance_report_jobs
    ADD COLUMN template_revision_id INT NULL AFTER template_id;
END IF;

-- Add indexes
CREATE INDEX idx_report_job_template_id ON eyefidb.inspection_instance_report_jobs (template_id);
CREATE INDEX idx_report_job_template_revision_id ON eyefidb.inspection_instance_report_jobs (template_revision_id);

-- Optional FK for template_id (safe when checklist_templates exists in eyefidb)
ALTER TABLE eyefidb.inspection_instance_report_jobs
  ADD CONSTRAINT fk_inspection_report_job_template
  FOREIGN KEY (template_id) REFERENCES eyefidb.checklist_templates(id)
  ON DELETE SET NULL;

-- Backfill template fields for existing rows
UPDATE eyefidb.inspection_instance_report_jobs rj
INNER JOIN eyefidb.checklist_instances ci ON ci.id = rj.instance_id
LEFT JOIN eyefidb.checklist_templates ct ON ct.id = ci.template_id
SET
  rj.template_id = ci.template_id,
  rj.template_revision_id = ct.quality_revision_id
WHERE rj.template_id IS NULL
   OR rj.template_revision_id IS NULL;
