-- Project Manager: shared customer options for Gate 1 dropdown
-- 2026-07-13

CREATE TABLE IF NOT EXISTS eyefidb.pm_customer_options (
  id            INT           NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(120)  NOT NULL,
  display_order INT           NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pm_customer_options_name (customer_name),
  KEY idx_pm_customer_options_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO eyefidb.pm_customer_options (customer_name, display_order)
VALUES
  ('Aristocrat', 1),
  ('Light & Wonder', 2),
  ('IGT', 3),
  ('Konami', 4),
  ('Ainsworth', 5),
  ('Custom', 6);
