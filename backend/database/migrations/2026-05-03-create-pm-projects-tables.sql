-- Project Manager: pm_projects and pm_project_intake tables
-- 2026-05-03

CREATE TABLE IF NOT EXISTS eyefidb.pm_projects (
  id                       VARCHAR(30)   NOT NULL,
  product_name             VARCHAR(255)  NOT NULL DEFAULT '',
  customer                 VARCHAR(255)  NOT NULL DEFAULT '',
  project_category         VARCHAR(100)  NOT NULL DEFAULT '',
  strategy_type            VARCHAR(100)  NOT NULL DEFAULT '',
  rough_revenue_potential  VARCHAR(50)   NOT NULL DEFAULT '',
  estimated_revenue        VARCHAR(100)  NOT NULL DEFAULT '',
  initial_rfp_date         DATE              NULL,
  target_production_date   DATE              NULL,
  readiness_score          INT           NOT NULL DEFAULT 0,
  readiness_status         VARCHAR(20)   NOT NULL DEFAULT 'Red',
  active_gate              TINYINT       NOT NULL DEFAULT 1,
  is_draft                 TINYINT(1)    NOT NULL DEFAULT 1,
  owner                    VARCHAR(255)  NOT NULL DEFAULT '',
  gate1_completion         INT           NOT NULL DEFAULT 0,
  gate2_completion         INT           NOT NULL DEFAULT 0,
  gate3_completion         INT           NOT NULL DEFAULT 0,
  gate4_completion         INT           NOT NULL DEFAULT 0,
  gate5_completion         INT           NOT NULL DEFAULT 0,
  gate6_completion         INT           NOT NULL DEFAULT 0,
  gate1_completed_at       DATETIME          NULL,
  gate2_completed_at       DATETIME          NULL,
  gate3_completed_at       DATETIME          NULL,
  gate4_completed_at       DATETIME          NULL,
  gate5_completed_at       DATETIME          NULL,
  gate6_completed_at       DATETIME          NULL,
  created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS eyefidb.pm_project_intake (
  id                 INT           NOT NULL AUTO_INCREMENT,
  project_id         VARCHAR(30)   NOT NULL,
  form_value         LONGTEXT          NULL COMMENT 'JSON: full form field values',
  active_input_system VARCHAR(10)  NOT NULL DEFAULT 'gate1',
  active_gate        TINYINT       NOT NULL DEFAULT 1,
  gate_completed_at  LONGTEXT          NULL COMMENT 'JSON: {gate1:..., gate2:..., ...}',
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pm_project_intake_project_id (project_id),
  CONSTRAINT fk_pm_project_intake_project FOREIGN KEY (project_id) REFERENCES eyefidb.pm_projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
