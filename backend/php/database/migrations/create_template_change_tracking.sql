-- Create table to track template version changes
CREATE TABLE IF NOT EXISTS checklist_template_changes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    version VARCHAR(20) NOT NULL,
    change_type ENUM('created', 'version_created', 'field_updated', 'item_added', 'item_removed', 'item_modified') NOT NULL,
    changed_by INT DEFAULT NULL,
    change_summary TEXT,
    changes_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE,
    INDEX idx_template_version (template_id, version),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed example data structure
-- This shows what the JSON structure would look like:
-- {
--   "fields_changed": ["name", "description", "part_number"],
--   "field_changes": {
--     "name": {"old": "Template v1.0", "new": "Template v1.1"},
--     "part_number": {"old": "WDG-123", "new": "WDG-124"}
--   },
--   "items_added": [
--     {"title": "New inspection item", "order_index": 5}
--   ],
--   "items_removed": [
--     {"id": 123, "title": "Old item that was deleted"}
--   ],
--   "items_modified": [
--     {
--       "id": 45,
--       "changes": {
--         "title": {"old": "Check connections", "new": "Verify all connections"},
--         "description": {"old": "...", "new": "..."}
--       }
--     }
--   ],
--   "metadata": {
--     "source_template_id": 79,
--     "auto_generated": true,
--     "user_confirmed": false
--   }
-- }

-- Example insert (would be done by backend):
-- INSERT INTO checklist_template_changes (template_id, version, change_type, changed_by, change_summary, changes_json)
-- VALUES (
--   80, 
--   '1.1', 
--   'version_created',
--   NULL,
--   'Created version 1.1: Updated name, added 2 items, modified 1 item',
--   '{"fields_changed": ["name"], "items_added": 2, "items_modified": 1}'
-- );
