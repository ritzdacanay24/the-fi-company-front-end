-- Convert UL label audit columns to store user display names.
ALTER TABLE ul_labels
  MODIFY COLUMN created_by VARCHAR(255) NULL,
  MODIFY COLUMN updated_by VARCHAR(255) NULL;

-- Backfill existing numeric user IDs to full names where possible.
UPDATE ul_labels ul
LEFT JOIN db.users u
  ON CAST(ul.created_by AS UNSIGNED) = u.id
SET ul.created_by = TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, '')))
WHERE ul.created_by REGEXP '^[0-9]+$'
  AND u.id IS NOT NULL;

UPDATE ul_labels ul
LEFT JOIN db.users u
  ON CAST(ul.updated_by AS UNSIGNED) = u.id
SET ul.updated_by = TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, '')))
WHERE ul.updated_by REGEXP '^[0-9]+$'
  AND u.id IS NOT NULL;
