ALTER TABLE forms.forklift_checklist
ADD COLUMN not_used INT(11) NOT NULL DEFAULT 0 AFTER shift;
