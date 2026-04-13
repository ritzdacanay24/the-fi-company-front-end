-- Create UL Audit Sign-Off Table
-- This table tracks auditor sign-offs for UL New label audits

CREATE TABLE IF NOT EXISTS `ul_audit_signoffs` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_date` DATE NOT NULL COMMENT 'Date of the audit',
  `auditor_name` VARCHAR(255) NOT NULL COMMENT 'Name of the auditor',
  `auditor_signature` VARCHAR(255) NOT NULL COMMENT 'Electronic signature',
  `items_audited` INT(11) NOT NULL DEFAULT 0 COMMENT 'Number of items audited',
  `ul_numbers` TEXT NOT NULL COMMENT 'JSON array of UL numbers audited',
  `notes` TEXT COMMENT 'Audit notes',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_date` (`audit_date`),
  KEY `idx_auditor` (`auditor_name`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks UL New audit sign-offs';

-- Insert initial audit record (example)
INSERT INTO `ul_audit_signoffs` (
  `audit_date`, 
  `auditor_name`, 
  `auditor_signature`, 
  `items_audited`, 
  `ul_numbers`, 
  `notes`
) VALUES (
  CURDATE(),
  'System Setup',
  'System Setup',
  0,
  '[]',
  'Initial table creation'
) ON DUPLICATE KEY UPDATE id=id;

SELECT 'UL Audit Sign-Off table created successfully!' as message;
