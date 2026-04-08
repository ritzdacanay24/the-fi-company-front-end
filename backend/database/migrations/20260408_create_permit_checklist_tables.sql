CREATE TABLE IF NOT EXISTS quality_permit_checklist_tickets (
  ticket_id VARCHAR(64) NOT NULL,
  form_type ENUM('seismic', 'dca') NOT NULL,
  status ENUM('draft', 'saved', 'submitted', 'finalized', 'archived') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  finalized_at DATETIME NULL,
  values_json JSON NOT NULL,
  field_updated_at_json JSON NOT NULL,
  process_notes_json JSON NOT NULL,
  financials_json JSON NOT NULL,
  attachments_json JSON NOT NULL,
  PRIMARY KEY (ticket_id),
  KEY idx_qpc_tickets_form_type (form_type),
  KEY idx_qpc_tickets_status (status),
  KEY idx_qpc_tickets_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quality_permit_checklist_transactions (
  id VARCHAR(80) NOT NULL,
  ticket_id VARCHAR(64) NOT NULL,
  type VARCHAR(50) NOT NULL,
  event_timestamp DATETIME NOT NULL,
  actor VARCHAR(255) NULL,
  details_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qpc_tx_ticket_id (ticket_id),
  KEY idx_qpc_tx_timestamp (event_timestamp),
  CONSTRAINT fk_qpc_tx_ticket
    FOREIGN KEY (ticket_id)
    REFERENCES quality_permit_checklist_tickets(ticket_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quality_permit_checklist_customers (
  id VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_qpc_customer_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quality_permit_checklist_architects (
  id VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_qpc_architect_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quality_permit_checklist_billing_defaults (
  form_type ENUM('seismic', 'dca') NOT NULL,
  fee_key VARCHAR(120) NOT NULL,
  label VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (form_type, fee_key),
  KEY idx_qpc_billing_defaults_sort (form_type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
