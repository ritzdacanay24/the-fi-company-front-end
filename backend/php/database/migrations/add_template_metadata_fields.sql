-- Add customer_part_number, revision, original_filename, review_date, revision_number, revision_details, revised_by to checklist_templates
-- Run this migration on the backend DB used by the photo-checklist API

ALTER TABLE checklist_templates
  ADD COLUMN customer_part_number VARCHAR(100) NULL AFTER part_number,
  ADD COLUMN revision VARCHAR(50) NULL AFTER customer_part_number,
  ADD COLUMN original_filename VARCHAR(255) NULL AFTER revision,
  ADD COLUMN review_date VARCHAR(50) NULL AFTER original_filename,
  ADD COLUMN revision_number VARCHAR(50) NULL AFTER review_date,
  ADD COLUMN revision_details TEXT NULL AFTER revision_number,
  ADD COLUMN revised_by VARCHAR(100) NULL AFTER revision_details;

-- Optionally create an index on customer_part_number for faster lookups
-- Run this separately if index doesn't exist yet (uncomment if needed):
-- CREATE INDEX idx_checklist_templates_customer_part_number ON checklist_templates (customer_part_number(50));

-- Backfill or normalize data if needed (no-op here)
-- UPDATE checklist_templates SET customer_part_number = NULL WHERE customer_part_number = '';

-- End of migration
