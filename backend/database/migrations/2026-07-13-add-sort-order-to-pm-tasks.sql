-- Project Manager: persist drag-and-drop order
-- 2026-07-13

SET @sort_order_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'eyefidb'
    AND TABLE_NAME = 'pm_tasks'
    AND COLUMN_NAME = 'sort_order'
);

SET @add_sort_order_sql := IF(
  @sort_order_column_exists = 0,
  'ALTER TABLE eyefidb.pm_tasks ADD COLUMN sort_order INT NOT NULL DEFAULT 0',
  'SELECT "sort_order column already exists"'
);

PREPARE add_sort_order_stmt FROM @add_sort_order_sql;
EXECUTE add_sort_order_stmt;
DEALLOCATE PREPARE add_sort_order_stmt;

-- Backfill existing rows so current display order remains deterministic.
UPDATE eyefidb.pm_tasks
SET sort_order = id
WHERE sort_order = 0;

SET @sort_order_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'eyefidb'
    AND TABLE_NAME = 'pm_tasks'
    AND INDEX_NAME = 'idx_pm_tasks_project_sort_order'
);

SET @create_sort_order_index_sql := IF(
  @sort_order_index_exists = 0,
  'CREATE INDEX idx_pm_tasks_project_sort_order ON eyefidb.pm_tasks (project_id, sort_order, id)',
  'SELECT "idx_pm_tasks_project_sort_order already exists"'
);

PREPARE create_sort_order_index_stmt FROM @create_sort_order_index_sql;
EXECUTE create_sort_order_index_stmt;
DEALLOCATE PREPARE create_sort_order_index_stmt;
