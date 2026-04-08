START TRANSACTION;

INSERT INTO quality_permit_checklist_customers (id, name, is_active)
VALUES
  ('cust_ags', 'AGS', 1),
  ('cust_ainsworth', 'Ainsworth', 1),
  ('cust_ati', 'ATI', 1),
  ('cust_bally', 'Bally', 1),
  ('cust_epictech', 'EpicTech', 1),
  ('cust_everi', 'Everi', 1),
  ('cust_igt', 'IGT', 1),
  ('cust_konami', 'Konami', 1),
  ('cust_sg', 'SG', 1),
  ('cust_synergy_blue', 'Synergy Blue', 1),
  ('cust_lw', 'L&W', 1),
  ('cust_bluberi', 'Bluberi', 1),
  ('cust_its_gaming', 'ITS Gaming', 1),
  ('cust_mgm_corps', 'MGM Corps', 1),
  ('cust_sonny', 'Sonny', 1),
  ('cust_yaamava', 'Yaamava', 1),
  ('cust_zitro', 'Zitro', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  is_active = 1;

INSERT INTO quality_permit_checklist_architects (id, name, is_active)
VALUES
  ('arch_r2_architects', 'R2 Architects', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  is_active = 1;

INSERT INTO quality_permit_checklist_billing_defaults (form_type, fee_key, label, amount, sort_order, is_active)
VALUES
  ('seismic', 'seismicApproval', 'Seismic Approval', 3000.00, 0, 1),
  ('dca', 'architectFees', 'Architect Fees', 3980.00, 0, 1),
  ('dca', 'mepFees', 'MEP Fees', 2750.00, 1, 1),
  ('dca', 'structuralFees', 'Structural Fees', 2500.00, 2, 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  amount = VALUES(amount),
  sort_order = VALUES(sort_order),
  is_active = 1;

COMMIT;
