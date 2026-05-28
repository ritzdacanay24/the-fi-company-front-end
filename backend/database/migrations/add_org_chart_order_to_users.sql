SET @org_chart_order_column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'db'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'org_chart_order'
);

SET @org_chart_order_alter_sql := IF(
  @org_chart_order_column_exists = 0,
  'ALTER TABLE db.users ADD COLUMN org_chart_order INT NOT NULL DEFAULT 0 AFTER org_chart_expand',
  'SELECT 1'
);

PREPARE org_chart_order_stmt FROM @org_chart_order_alter_sql;
EXECUTE org_chart_order_stmt;
DEALLOCATE PREPARE org_chart_order_stmt;

SET @org_chart_row_number := -1;

UPDATE db.users
SET org_chart_order = (@org_chart_row_number := @org_chart_row_number + 1)
WHERE org_chart_order = 0 OR org_chart_order IS NULL
ORDER BY
  CASE WHEN parentId IS NULL OR parentId = '' THEN 0 ELSE 1 END,
  CAST(COALESCE(NULLIF(parentId, ''), '0') AS UNSIGNED),
  type,
  first,
  last,
  id;