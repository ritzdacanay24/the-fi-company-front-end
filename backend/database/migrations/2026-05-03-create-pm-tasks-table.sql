-- Project Manager: pm_tasks table
-- 2026-05-03

CREATE TABLE IF NOT EXISTS eyefidb.pm_tasks (
  id                INT           NOT NULL AUTO_INCREMENT,
  project_id        VARCHAR(30)   NOT NULL,
  gate              VARCHAR(5)    NOT NULL DEFAULT 'G1',
  group_name        VARCHAR(255)  NOT NULL DEFAULT '',
  sub_group_name    VARCHAR(255)  NOT NULL DEFAULT '',
  task_name         VARCHAR(500)  NOT NULL DEFAULT '',
  assigned_to       LONGTEXT      NULL COMMENT 'JSON array of assignee name strings',
  duration_days     INT           NOT NULL DEFAULT 0,
  start_date        DATE          NULL,
  finish_date       DATE          NULL,
  depends_on        VARCHAR(255)  NOT NULL DEFAULT '',
  bucket            VARCHAR(100)  NOT NULL DEFAULT '',
  status            VARCHAR(20)   NOT NULL DEFAULT 'Open',
  completion        INT           NOT NULL DEFAULT 0,
  source            VARCHAR(30)   NOT NULL DEFAULT 'manual',
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pm_tasks_project_id (project_id),
  KEY idx_pm_tasks_status (status),
  CONSTRAINT fk_pm_tasks_project
    FOREIGN KEY (project_id) REFERENCES eyefidb.pm_projects (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.pm_task_comments (
  id         INT           NOT NULL AUTO_INCREMENT,
  task_id    INT           NOT NULL,
  author     VARCHAR(255)  NOT NULL DEFAULT '',
  text       LONGTEXT      NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pm_task_comments_task_id (task_id),
  CONSTRAINT fk_pm_task_comments_task
    FOREIGN KEY (task_id) REFERENCES eyefidb.pm_tasks (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eyefidb.pm_task_attachments (
  id            INT           NOT NULL AUTO_INCREMENT,
  task_id       INT           NOT NULL,
  name          VARCHAR(500)  NOT NULL DEFAULT '',
  type          VARCHAR(30)   NOT NULL DEFAULT 'Other',
  size_label    VARCHAR(50)   NOT NULL DEFAULT '',
  data_url      LONGTEXT      NULL,
  uploaded_by   VARCHAR(255)  NOT NULL DEFAULT '',
  uploaded_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pm_task_attachments_task_id (task_id),
  CONSTRAINT fk_pm_task_attachments_task
    FOREIGN KEY (task_id) REFERENCES eyefidb.pm_tasks (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
