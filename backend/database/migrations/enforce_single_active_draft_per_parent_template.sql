-- Enforce one active draft per parent template
-- Purpose: prevent stale/outdated duplicate active drafts for the same published template

-- 1) Cleanup existing duplicates before adding uniqueness constraint.
-- Keep the most recently updated draft (ties: highest id), deactivate the rest.
UPDATE checklist_templates t
JOIN (
    SELECT
        parent_template_id,
        CAST(SUBSTRING_INDEX(GROUP_CONCAT(id ORDER BY updated_at DESC, id DESC), ',', 1) AS UNSIGNED) AS keep_id,
        COUNT(*) AS draft_count
    FROM checklist_templates
    WHERE is_draft = 1
      AND is_active = 1
      AND parent_template_id IS NOT NULL
    GROUP BY parent_template_id
    HAVING COUNT(*) > 1
) d ON d.parent_template_id = t.parent_template_id
SET t.is_active = 0,
    t.updated_at = CURRENT_TIMESTAMP
WHERE t.is_draft = 1
  AND t.is_active = 1
  AND t.id <> d.keep_id;

-- 2) Add a generated column that is populated only for ACTIVE drafts.
-- Non-drafts/inactive rows evaluate to NULL and are not constrained by the unique index.
SET @has_active_draft_parent_col := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'checklist_templates'
      AND column_name = 'active_draft_parent_id'
);

SET @sql_add_active_draft_parent_col := IF(
    @has_active_draft_parent_col = 0,
    'ALTER TABLE checklist_templates ADD COLUMN active_draft_parent_id INT GENERATED ALWAYS AS (CASE WHEN is_draft = 1 AND is_active = 1 THEN parent_template_id ELSE NULL END) STORED COMMENT ''Computed key used to enforce one active draft per parent template''',
    'SELECT ''Column active_draft_parent_id already exists'' AS info'
);

PREPARE stmt FROM @sql_add_active_draft_parent_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Enforce uniqueness for active drafts by parent template.
SET @has_unique_active_draft_idx := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'checklist_templates'
      AND index_name = 'uq_one_active_draft_per_parent'
);

SET @sql_add_unique_active_draft_idx := IF(
    @has_unique_active_draft_idx = 0,
    'ALTER TABLE checklist_templates ADD UNIQUE INDEX uq_one_active_draft_per_parent (active_draft_parent_id)',
    'SELECT ''Index uq_one_active_draft_per_parent already exists'' AS info'
);

PREPARE stmt FROM @sql_add_unique_active_draft_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
