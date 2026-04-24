-- Purpose: Grant user ID 3 admin domain and manage permissions
-- Date: 2026-04-24

-- Get the manage permission ID (or create if missing)
INSERT IGNORE INTO `eyefidb`.`app_permissions` (`name`, `description`, `is_active`)
VALUES ('manage', 'System-level RBAC administration', 1);

-- Create a direct grant for user 3 with admin domain and manage permission
INSERT IGNORE INTO `eyefidb`.`app_user_permission_grants` 
  (`user_id`, `permission_id`, `domain`, `granted_by`, `expires_at`, `is_active`)
SELECT 3, p.id, 'admin', 1, NULL, 1
FROM `eyefidb`.`app_permissions` p
WHERE p.name = 'manage'
  AND NOT EXISTS (
    SELECT 1 FROM `eyefidb`.`app_user_permission_grants` g
    WHERE g.user_id = 3 AND g.permission_id = p.id AND g.domain = 'admin' AND g.is_active = 1
  );

-- Also grant read/write/delete for completeness
INSERT IGNORE INTO `eyefidb`.`app_permissions` (`name`, `description`, `is_active`)
VALUES 
  ('read', 'View data and resources', 1),
  ('write', 'Create and update resources', 1),
  ('delete', 'Delete resources', 1),
  ('approve', 'Approve workflow actions', 1);

-- Grant user 3 read/write/delete in admin domain
INSERT IGNORE INTO `eyefidb`.`app_user_permission_grants` 
  (`user_id`, `permission_id`, `domain`, `granted_by`, `expires_at`, `is_active`)
SELECT 3, p.id, 'admin', 1, NULL, 1
FROM `eyefidb`.`app_permissions` p
WHERE p.name IN ('read', 'write', 'delete')
  AND NOT EXISTS (
    SELECT 1 FROM `eyefidb`.`app_user_permission_grants` g
    WHERE g.user_id = 3 AND g.permission_id = p.id AND g.domain = 'admin' AND g.is_active = 1
  );
