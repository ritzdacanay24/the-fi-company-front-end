-- Project Manager: pm_task_state metadata table
-- 2026-06-08

CREATE TABLE IF NOT EXISTS eyefidb.pm_task_state (
  project_id               VARCHAR(30)   NOT NULL,
  project_task_board_name  VARCHAR(160)  NOT NULL DEFAULT 'Project Tasks',
  default_task_templates   LONGTEXT      NULL COMMENT 'JSON array of template task names',
  updated_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id),
  CONSTRAINT fk_pm_task_state_project
    FOREIGN KEY (project_id) REFERENCES eyefidb.pm_projects (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
