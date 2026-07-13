-- Project Manager: shared Volume Estimate options for Gate 1 dropdown
-- 2026-07-13

CREATE TABLE IF NOT EXISTS eyefidb.pm_volume_estimate_options (
  id           INT          NOT NULL AUTO_INCREMENT,
  option_key   VARCHAR(16)  NOT NULL,
  option_label VARCHAR(120) NOT NULL,
  display_order INT         NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pm_volume_estimate_options_key (option_key),
  KEY idx_pm_volume_estimate_options_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO eyefidb.pm_volume_estimate_options (option_key, option_label, display_order)
VALUES
  ('Low', 'Low > 50', 1),
  ('Medium', 'Medium 50-150', 2),
  ('High', 'High 150+', 3);
