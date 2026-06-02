-- Add template-level verifier assignment for shipping checklist workflow
-- Date: 2026-06-02

ALTER TABLE eyefidb.shipping_checklist_templates
  ADD COLUMN assigned_verifier_user_id INT NULL AFTER logo_text,
  ADD COLUMN assigned_verifier_name VARCHAR(120) NULL AFTER assigned_verifier_user_id,
  ADD COLUMN assigned_verifier_email VARCHAR(200) NULL AFTER assigned_verifier_name;
