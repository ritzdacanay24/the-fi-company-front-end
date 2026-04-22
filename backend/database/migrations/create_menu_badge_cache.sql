CREATE TABLE IF NOT EXISTS menu_badge_cache (
  menu_id VARCHAR(100) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO menu_badge_cache (menu_id, count)
VALUES ('production-routing-open', 0)
ON DUPLICATE KEY UPDATE
  count = count;
