-- Add customer_name to checklist_templates
-- Run this migration on the backend DB used by the photo-checklist API

ALTER TABLE checklist_templates
  ADD COLUMN customer_name VARCHAR(255) NULL AFTER customer_part_number;

-- Optional index if you plan to search/filter by customer_name
-- CREATE INDEX idx_checklist_templates_customer_name ON checklist_templates (customer_name(100));
