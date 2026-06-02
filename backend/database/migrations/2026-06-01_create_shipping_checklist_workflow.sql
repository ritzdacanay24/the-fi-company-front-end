-- Shipping checklist workflow (customer-specific templates + persisted form instances)
-- Date: 2026-06-01

CREATE TABLE IF NOT EXISTS eyefidb.shipping_checklist_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_code VARCHAR(20) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  form_title VARCHAR(200) NOT NULL,
  form_code VARCHAR(40) NOT NULL,
  logo_text VARCHAR(120) NULL,
  assigned_verifier_user_id INT NULL,
  assigned_verifier_name VARCHAR(120) NULL,
  assigned_verifier_email VARCHAR(200) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipping_checklist_templates_customer_code (customer_code),
  KEY idx_shipping_checklist_templates_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.shipping_checklist_template_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  question_order INT NOT NULL,
  question_code VARCHAR(20) NOT NULL,
  question_text VARCHAR(500) NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipping_checklist_question_order (template_id, question_order),
  UNIQUE KEY uq_shipping_checklist_question_code (template_id, question_code),
  CONSTRAINT fk_shipping_checklist_question_template
    FOREIGN KEY (template_id)
    REFERENCES eyefidb.shipping_checklist_templates (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.shipping_checklist_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  customer_code VARCHAR(20) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  form_title VARCHAR(200) NOT NULL,
  status ENUM('draft', 'submitted', 'verified') NOT NULL DEFAULT 'draft',
  form_date DATE NULL,
  ship_via VARCHAR(120) NULL,
  shipping_account VARCHAR(120) NULL,
  sales_order VARCHAR(120) NULL,
  packing_slip VARCHAR(120) NULL,
  arrival_date DATE NULL,
  total_pallets INT NULL,
  verifier_name VARCHAR(120) NULL,
  verifier_date DATE NULL,
  second_verifier_name VARCHAR(120) NULL,
  second_verifier_email VARCHAR(200) NULL,
  second_verifier_email_sent_at DATETIME NULL,
  second_verifier_email_sent_by VARCHAR(120) NULL,
  second_verifier_date DATE NULL,
  notes TEXT NULL,
  created_by VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_shipping_checklist_instances_customer_code (customer_code),
  KEY idx_shipping_checklist_instances_status (status),
  KEY idx_shipping_checklist_instances_created_at (created_at),
  CONSTRAINT fk_shipping_checklist_instances_template
    FOREIGN KEY (template_id)
    REFERENCES eyefidb.shipping_checklist_templates (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.shipping_checklist_instance_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL,
  line_order INT NOT NULL,
  is_selected TINYINT(1) NOT NULL DEFAULT 1,
  part_number VARCHAR(120) NULL,
  qty VARCHAR(60) NULL,
  serial_number VARCHAR(200) NULL,
  pallet_qty VARCHAR(60) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipping_checklist_instance_line_order (instance_id, line_order),
  CONSTRAINT fk_shipping_checklist_instance_lines_instance
    FOREIGN KEY (instance_id)
    REFERENCES eyefidb.shipping_checklist_instances (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.shipping_checklist_instance_line_serials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  line_id INT NOT NULL,
  serial_order INT NOT NULL,
  serial_number VARCHAR(200) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_shipping_checklist_line_serials_line_id (line_id),
  KEY idx_shipping_checklist_line_serials_serial (serial_number),
  UNIQUE KEY uq_shipping_checklist_line_serials_order (line_id, serial_order),
  CONSTRAINT fk_shipping_checklist_line_serials_line
    FOREIGN KEY (line_id)
    REFERENCES eyefidb.shipping_checklist_instance_lines (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.shipping_checklist_instance_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL,
  question_code VARCHAR(20) NOT NULL,
  question_text VARCHAR(500) NOT NULL,
  response_value ENUM('yes', 'no', 'na', '') NOT NULL DEFAULT '',
  image_urls_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipping_checklist_instance_question (instance_id, question_code),
  CONSTRAINT fk_shipping_checklist_instance_responses_instance
    FOREIGN KEY (instance_id)
    REFERENCES eyefidb.shipping_checklist_instances (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO eyefidb.shipping_checklist_templates (customer_code, customer_name, form_title, form_code, logo_text, assigned_verifier_user_id, assigned_verifier_name, assigned_verifier_email, is_active)
VALUES
  ('generic', 'Generic', 'Generic Shipping Checklist', 'SHIP-FRM-009', NULL, NULL, NULL, NULL, 1),
  ('igt', 'IGT', 'IGT Shipping Checklist', 'SHIP-FRM-007', 'IGT', NULL, NULL, NULL, 1),
  ('ags', 'AGS', 'AGS Shipping Checklist', 'SHIP-FRM-007', 'AGS', NULL, NULL, NULL, 1),
  ('lnw', 'Light and Wonder', 'LnW Shipping Checklist', 'SHIP-FRM-006', 'LIGHT & WONDER', NULL, NULL, NULL, 1)
ON DUPLICATE KEY UPDATE
  customer_name = VALUES(customer_name),
  form_title = VALUES(form_title),
  form_code = VALUES(form_code),
  logo_text = VALUES(logo_text),
  assigned_verifier_user_id = VALUES(assigned_verifier_user_id),
  assigned_verifier_name = VALUES(assigned_verifier_name),
  assigned_verifier_email = VALUES(assigned_verifier_email),
  is_active = VALUES(is_active);

INSERT INTO eyefidb.shipping_checklist_template_questions (template_id, question_order, question_code, question_text, is_required)
SELECT t.id, q.question_order, q.question_code, q.question_text, 1
FROM eyefidb.shipping_checklist_templates t
JOIN (
  SELECT 'generic' AS customer_code, 1 AS question_order, '1.1' AS question_code, 'For deliveries: Is Packing Slip printed and with the driver?' AS question_text
  UNION ALL SELECT 'generic', 2, '1.2', 'For drop shipments: Is BOL signed by the driver?'
  UNION ALL SELECT 'generic', 3, '2', 'Are there any damages to the packaging?'
  UNION ALL SELECT 'generic', 4, '3', 'Does Packing Slip match what is physically being shipped - Placard, SN, PN?'
  UNION ALL SELECT 'generic', 5, '4', 'Are items "Shrink Wrapped"?'
  UNION ALL SELECT 'generic', 6, '5', 'Are items "Banded"?'
  UNION ALL SELECT 'generic', 7, '6', 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?'
  UNION ALL SELECT 'generic', 8, '7', 'Were pictures taken of every pallet inside the truck?'
  UNION ALL SELECT 'generic', 9, '8', 'Were all pictures uploaded to the shared drive/file?'

  UNION ALL SELECT 'lnw', 1, '1.1', 'For deliveries: Is Packing Slip printed and with the driver?'
  UNION ALL SELECT 'lnw', 2, '1.2', 'For drop shipments: Is BOL signed by the driver?'
  UNION ALL SELECT 'lnw', 3, '2', 'Are there any damages to the packaging?'
  UNION ALL SELECT 'lnw', 4, '3', 'Does Packing Slip match what is physically being shipped - Placard, SN, PN?'
  UNION ALL SELECT 'lnw', 5, '4', 'Are items "Shrink Wrapped"?'
  UNION ALL SELECT 'lnw', 6, '5', 'Are items "Banded"?'
  UNION ALL SELECT 'lnw', 7, '6', 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?'
  UNION ALL SELECT 'lnw', 8, '7', 'Were pictures taken of every pallet inside the truck?'
  UNION ALL SELECT 'lnw', 9, '8', 'Were all pictures uploaded to the shared drive/file?'

  UNION ALL SELECT 'igt', 1, '1', 'Transfer form on pallets?'
  UNION ALL SELECT 'igt', 2, '2', 'Items on dock match Transfer Form and Packing Slip?'
  UNION ALL SELECT 'igt', 3, '3', 'Are there any damages to the packaging?'
  UNION ALL SELECT 'igt', 4, '4', 'Does Packing Slip match what is physically being shipped - Placard, SN, PN?'
  UNION ALL SELECT 'igt', 5, '5', 'Are items "Shrink Wrapped"?'
  UNION ALL SELECT 'igt', 6, '6', 'Are items "Banded"?'
  UNION ALL SELECT 'igt', 7, '7', 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?'
  UNION ALL SELECT 'igt', 8, '8', 'Were pictures taken of every pallet inside the truck?'
  UNION ALL SELECT 'igt', 9, '9', 'Were all pictures uploaded to the shared drive/file?'
  UNION ALL SELECT 'igt', 10, '10', 'Is BOL printed and signed by the driver?'

  UNION ALL SELECT 'ags', 1, '1', 'EYEFI placard removed and replaced with FG label?'
  UNION ALL SELECT 'ags', 2, '2', 'FG label matches PN of units shipped and BOL?'
  UNION ALL SELECT 'ags', 3, '3', 'Are all pallets in the shipment numbered and matched to the packing slip numbers?'
  UNION ALL SELECT 'ags', 4, '4', 'Are there any damages to the packaging?'
  UNION ALL SELECT 'ags', 5, '5', 'Are items "Shrink Wrapped"?'
  UNION ALL SELECT 'ags', 6, '6', 'Are items "Banded"?'
  UNION ALL SELECT 'ags', 7, '7', 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?'
  UNION ALL SELECT 'ags', 8, '8', 'Were pictures taken of every pallet inside the truck?'
  UNION ALL SELECT 'ags', 9, '9', 'Were all pictures uploaded to the shared drive/file?'
  UNION ALL SELECT 'ags', 10, '10', 'Is BOL signed by the driver?'
) q ON q.customer_code = t.customer_code
ON DUPLICATE KEY UPDATE
  question_code = VALUES(question_code),
  question_text = VALUES(question_text),
  is_required = VALUES(is_required);
