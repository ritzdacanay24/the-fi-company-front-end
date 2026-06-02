-- Snapshot form code on checklist instances so template edits do not alter started records
-- Date: 2026-06-02

ALTER TABLE eyefidb.shipping_checklist_instances
  ADD COLUMN form_code VARCHAR(40) NULL AFTER form_title;

UPDATE eyefidb.shipping_checklist_instances i
INNER JOIN eyefidb.shipping_checklist_templates t ON t.id = i.template_id
SET i.form_code = t.form_code
WHERE i.form_code IS NULL;
