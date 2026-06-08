-- Project Manager: store available task board names per project
-- 2026-06-08

ALTER TABLE eyefidb.pm_task_state
  ADD COLUMN task_board_names LONGTEXT NULL COMMENT 'JSON array of board names' AFTER default_task_templates;
