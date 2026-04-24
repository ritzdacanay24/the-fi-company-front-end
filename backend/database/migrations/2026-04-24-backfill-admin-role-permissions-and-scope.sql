-- Purpose: Backfill admin RBAC for existing environments.
-- Ensures the admin role has all action permissions and every admin user role
-- has global domain scope so admin can operate across all module domains.

INSERT IGNORE INTO `eyefidb`.`app_permissions` (`name`, `description`)
VALUES
  ('read', 'View / read access within an allowed domain'),
  ('write', 'Create and edit access within an allowed domain'),
  ('delete', 'Delete access within an allowed domain'),
  ('manage', 'Manage settings, templates, and configs within an allowed domain'),
  ('approve', 'Approve workflows and records within an allowed domain');

INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
INNER JOIN `eyefidb`.`app_permissions` p ON p.is_active = 1
WHERE r.name = 'admin';

INSERT IGNORE INTO `eyefidb`.`app_user_role_scopes` (`user_role_id`, `scope_type`, `scope_value`)
SELECT ur.id, 'domain', '*'
FROM `eyefidb`.`app_user_roles` ur
INNER JOIN `eyefidb`.`app_roles` r ON r.id = ur.role_id
WHERE r.name = 'admin';