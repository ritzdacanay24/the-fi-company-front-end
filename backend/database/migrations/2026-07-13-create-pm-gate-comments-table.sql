-- Project Manager: gate comments with author and timestamp
-- 2026-07-13

CREATE TABLE IF NOT EXISTS eyefidb.pm_gate_comments (
  id           INT          NOT NULL AUTO_INCREMENT,
  project_id   VARCHAR(30)  NOT NULL,
  gate_number  TINYINT      NOT NULL,
  comment_text TEXT         NOT NULL,
  created_by   VARCHAR(120) NOT NULL DEFAULT 'Unknown',
  created_by_id INT         NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pm_gate_comments_project_gate_created (project_id, gate_number, created_at),
  KEY idx_pm_gate_comments_created_by_id (created_by_id),
  CONSTRAINT fk_pm_gate_comments_project
    FOREIGN KEY (project_id)
    REFERENCES eyefidb.pm_projects (id)
    ON DELETE CASCADE,
  CONSTRAINT chk_pm_gate_comments_gate_number
    CHECK (gate_number BETWEEN 1 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
