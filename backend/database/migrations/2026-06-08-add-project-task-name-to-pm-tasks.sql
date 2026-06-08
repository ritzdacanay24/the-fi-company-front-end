-- Project Manager: support multiple task boards per project
-- 2026-06-08

ALTER TABLE eyefidb.pm_tasks
  ADD COLUMN project_task_name VARCHAR(160) NOT NULL DEFAULT 'Project Tasks' AFTER project_id;

CREATE INDEX idx_pm_tasks_project_task_name ON eyefidb.pm_tasks (project_id, project_task_name);
