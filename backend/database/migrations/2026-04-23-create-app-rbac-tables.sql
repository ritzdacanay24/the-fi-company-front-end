-- Purpose: Add normalized RBAC tables for Nest access control without breaking legacy tables
-- Notes:
-- 1) Keeps legacy eyefidb.roles/useraccess/user_permissions untouched.
-- 2) Uses app_* table names to avoid collisions.
-- 3) Backfills user-role assignments from db.users admin/employeeType flags.
-- 4) app_modules registry maps every Nest module to a domain/department (admin-maintainable).
-- 5) Permissions are 5 flat actions: read, write, delete, manage, approve.
--    Domain scoping lives in app_user_role_scopes (scope_type='domain', scope_value='quality')
--    and in permission requests/grants. No per-domain permission explosion.
-- 6) app_permission_requests enables users to request temporary cross-domain access
--    with full approval lifecycle and auto-expiry.

-- ---------------------------------------------------------------------------
-- MODULE REGISTRY: maps each Nest module to a domain and optional department.
-- Admins can update domain/department assignments at runtime via the UI/API.
-- Permissions use the domain prefix so modules inheriting the same domain
-- automatically share the same permission gates.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `eyefidb`.`app_modules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `module_key`   VARCHAR(100) NOT NULL COMMENT 'Matches the Nest module folder name, e.g. photo-checklist',
  `display_name` VARCHAR(150) NOT NULL COMMENT 'Human-readable name shown in admin UI',
  `domain`       VARCHAR(100) NOT NULL COMMENT 'Permission domain prefix, e.g. quality, receiving, field-service',
  `department`   VARCHAR(100) NULL     COMMENT 'Optional owning department name for display/filter',
  `description`  VARCHAR(255) NULL,
  `is_active`    TINYINT(1)  NOT NULL DEFAULT 1,
  `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_modules_key` (`module_key`),
  KEY `idx_app_modules_domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registry of all Nest modules with their domain/department classification';

CREATE TABLE IF NOT EXISTS `eyefidb`.`app_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eyefidb`.`app_permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_permissions_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eyefidb`.`app_role_permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_role_permissions` (`role_id`, `permission_id`),
  KEY `idx_app_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_app_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `eyefidb`.`app_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `eyefidb`.`app_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eyefidb`.`app_user_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_user_roles` (`user_id`, `role_id`),
  KEY `idx_app_user_roles_user` (`user_id`),
  KEY `idx_app_user_roles_role` (`role_id`),
  CONSTRAINT `fk_app_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `eyefidb`.`app_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- PERMISSION REQUESTS: flexible cross-domain access with approval lifecycle.
-- States: pending → approved / denied; approved grants can be revoked or expire.
-- domain: which domain the user is requesting access to (from app_modules.domain).
--         '*' means all domains (admin-level request).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `eyefidb`.`app_permission_requests` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT(11) UNSIGNED NOT NULL  COMMENT 'User requesting the permission',
  `permission_id` BIGINT UNSIGNED NOT NULL   COMMENT 'Which action: read/write/delete/manage/approve',
  `domain`        VARCHAR(100) NOT NULL      COMMENT 'Which domain scope: quality, receiving, * = all',
  `reason`        TEXT NOT NULL              COMMENT 'Business justification',
  `reference`     VARCHAR(255) NULL          COMMENT 'Optional ticket/task/job reference',
  `status`        ENUM('pending','approved','denied','revoked','expired') NOT NULL DEFAULT 'pending',
  `requested_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by`   INT(11) UNSIGNED NULL      COMMENT 'Admin/manager who acted on request',
  `reviewed_at`   DATETIME NULL,
  `review_notes`  VARCHAR(500) NULL,
  `expires_at`    DATETIME NULL              COMMENT 'NULL = permanent if approved; set for time-bound grants',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_apr_user`       (`user_id`),
  KEY `idx_apr_permission` (`permission_id`),
  KEY `idx_apr_domain`     (`domain`),
  KEY `idx_apr_status`     (`status`),
  KEY `idx_apr_expires`    (`expires_at`),
  CONSTRAINT `fk_apr_permission` FOREIGN KEY (`permission_id`) REFERENCES `eyefidb`.`app_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Permission request/approval lifecycle for cross-domain or elevated access';

-- ---------------------------------------------------------------------------
-- APPROVED GRANTS: active temporary or permanent permissions granted via request.
-- Guard checks this BEFORE role-based permissions so overrides work cleanly.
-- domain: the specific domain scope this grant covers ('*' = all domains).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `eyefidb`.`app_user_permission_grants` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT(11) UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL  COMMENT 'Which action: read/write/delete/manage/approve',
  `domain`        VARCHAR(100) NOT NULL     COMMENT 'Which domain scope this grant covers; * = all',
  `request_id`    BIGINT UNSIGNED NULL      COMMENT 'Source request (NULL = directly granted by admin)',
  `granted_by`    INT(11) UNSIGNED NOT NULL,
  `granted_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`    DATETIME NULL             COMMENT 'NULL = permanent; past = auto-expired',
  `revoked_at`    DATETIME NULL,
  `revoked_by`    INT(11) UNSIGNED NULL,
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uk_app_upg`             (`user_id`, `permission_id`, `domain`, `is_active`),
  KEY `idx_app_upg_permission` (`permission_id`),
  KEY `idx_app_upg_domain`     (`domain`),
  KEY `idx_app_upg_expires`    (`expires_at`),
  KEY `idx_app_upg_active`     (`is_active`),
  CONSTRAINT `fk_app_upg_permission` FOREIGN KEY (`permission_id`) REFERENCES `eyefidb`.`app_permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_upg_request`    FOREIGN KEY (`request_id`)    REFERENCES `eyefidb`.`app_permission_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Active permission grants (from approved requests or direct admin grants)';

-- scope_type = 'domain'  → scope_value = 'quality' | 'receiving' | 'inventory' | '*' (all)
-- scope_type = 'warehouse' → scope_value = warehouse code (legacy/optional)
-- A manager with scope_type='domain', scope_value='*' has broad CRUD within their role.
-- A receiving manager with scope_value='receiving' is limited to that domain by default.
CREATE TABLE IF NOT EXISTS `eyefidb`.`app_user_role_scopes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_role_id` BIGINT UNSIGNED NOT NULL,
  `scope_type`  VARCHAR(50)  NOT NULL DEFAULT 'domain' COMMENT 'domain | warehouse | custom',
  `scope_value` VARCHAR(100) NOT NULL                  COMMENT 'domain name or * for all domains',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_user_role_scopes` (`user_role_id`, `scope_type`, `scope_value`),
  CONSTRAINT `fk_app_user_role_scopes_user_role` FOREIGN KEY (`user_role_id`) REFERENCES `eyefidb`.`app_user_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed roles
INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'admin', 'Full access across all modules'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'admin');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'manager', 'Warehouse and operations management access'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'manager');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'supervisor', 'Team lead with elevated execution permissions'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'supervisor');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'user', 'Standard operator permissions'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'user');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'viewer', 'Read-only access'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'viewer');

-- Warehouse-focused role seeds (domain scope is assigned separately via app_user_role_scopes)
INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'receiving-clerk', 'Receiving intake and verification operations'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'receiving-clerk');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'inventory-control', 'Inventory integrity and exception management'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'inventory-control');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'cycle-counter', 'Cycle count execution and reconciliation'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'cycle-counter');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'picker', 'Order picking and material staging'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'picker');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'packer', 'Packing, labeling, and shipment preparation'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'packer');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'shipper', 'Shipment processing and carrier handoff'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'shipper');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'shipping-coordinator', 'Shipping coordination and outbound approvals'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'shipping-coordinator');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'quality-inspector', 'Quality inspection and disposition approvals'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'quality-inspector');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'returns-rma-specialist', 'Returns and RMA processing'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'returns-rma-specialist');

INSERT INTO `eyefidb`.`app_roles` (`name`, `description`)
SELECT 'warehouse-manager', 'Warehouse-wide operational management'
WHERE NOT EXISTS (SELECT 1 FROM `eyefidb`.`app_roles` WHERE `name` = 'warehouse-manager');

-- ---------------------------------------------------------------------------
-- MODULE REGISTRY SEED
-- Maps every current Nest module to a domain and department.
-- domain is the scope value used in app_user_role_scopes and grants.
-- Admins can UPDATE domain/department at runtime via the admin UI.
-- ---------------------------------------------------------------------------
INSERT INTO `eyefidb`.`app_modules` (`module_key`, `display_name`, `domain`, `department`) VALUES
-- Quality domain
('photo-checklist',        'Photo Checklist',          'quality',       'Quality'),
('permit-checklists',      'Permit Checklists',         'quality',       'Quality'),
('qir',                    'QIR',                       'quality',       'Quality'),
('qir-response',           'QIR Response',              'quality',       'Quality'),
('qir-settings',           'QIR Settings',              'quality',       'Quality'),
('quality-overview',       'Quality Overview',          'quality',       'Quality'),
('quality-version-control','Quality Version Control',   'quality',       'Quality'),
('ncr',                    'NCR',                       'quality',       'Quality'),
('mrb',                    'MRB',                       'quality',       'Quality'),
('forklift-inspection',    'Forklift Inspection',       'quality',       'Quality'),
('vehicle-inspection',     'Vehicle Inspection',        'quality',       'Quality'),
('fs-qir',                 'Field Service QIR',         'quality',       'Quality'),
-- Receiving domain
('receiving',              'Receiving',                 'receiving',     'Receiving'),
('material-request',       'Material Request',          'receiving',     'Receiving'),
('material-request-detail','Material Request Detail',   'receiving',     'Receiving'),
-- Inventory / Warehouse domain
('serial',                 'Serial Numbers',            'inventory',     'Warehouse'),
('serial-assignments',     'Serial Assignments',        'inventory',     'Warehouse'),
('serial-availability',    'Serial Availability',       'inventory',     'Warehouse'),
('eyefi-serial',           'Eyefi Serial',              'inventory',     'Warehouse'),
('eyefi-asset-numbers',    'Eyefi Asset Numbers',       'inventory',     'Warehouse'),
('ags-serial',             'AGS Serial',                'inventory',     'Warehouse'),
('igt-serial-numbers',     'IGT Serial Numbers',        'inventory',     'Warehouse'),
('igt-transfer',           'IGT Transfer',              'inventory',     'Warehouse'),
('inventory-by-prod-line', 'Inventory by Prod Line',    'inventory',     'Warehouse'),
('shortages',              'Shortages',                 'inventory',     'Warehouse'),
('wip',                    'WIP',                       'inventory',     'Warehouse'),
('ul-labels',              'UL Labels',                 'inventory',     'Warehouse'),
('unique-labels',          'Unique Labels',             'inventory',     'Warehouse'),
('placard',                'Placard',                   'inventory',     'Warehouse'),
-- Field Service domain
('job',                    'Job',                       'field-service', 'Field Service'),
('job-comments',           'Job Comments',              'field-service', 'Field Service'),
('job-connection',         'Job Connection',            'field-service', 'Field Service'),
('trip-detail',            'Trip Detail',               'field-service', 'Field Service'),
('trip-detail-header',     'Trip Detail Header',        'field-service', 'Field Service'),
('trip-expense',           'Trip Expense',              'field-service', 'Field Service'),
('trip-expense-transactions','Trip Expense Transactions','field-service','Field Service'),
('customer-visit',         'Customer Visit',            'field-service', 'Field Service'),
('customer-visit-detail',  'Customer Visit Detail',     'field-service', 'Field Service'),
('geo-location-tracker',   'Geo Location Tracker',      'field-service', 'Field Service'),
('vehicle',                'Vehicle',                   'field-service', 'Field Service'),
('field-service-overview', 'Field Service Overview',    'field-service', 'Field Service'),
-- Engineering / Production domain
('bom-structure',          'BOM Structure',             'engineering',   'Engineering'),
('graphics-bom',           'Graphics BOM',              'engineering',   'Engineering'),
('graphics-demand',        'Graphics Demand',           'engineering',   'Engineering'),
('graphics-production',    'Graphics Production',       'engineering',   'Engineering'),
('graphics-schedule',      'Graphics Schedule',         'engineering',   'Engineering'),
('work-order',             'Work Order',                'engineering',   'Engineering'),
('work-order-owner',       'Work Order Owner',          'engineering',   'Engineering'),
('work-order-routing',     'Work Order Routing',        'engineering',   'Engineering'),
('master-control',         'Master Control',            'engineering',   'Engineering'),
('item-search',            'Item Search',               'engineering',   'Engineering'),
('qad',                    'QAD',                       'engineering',   'Engineering'),
('qad-tables',             'QAD Tables',                'engineering',   'Engineering'),
('rfq',                    'RFQ',                       'purchasing',    'Purchasing'),
('rma',                    'RMA',                       'purchasing',    'Purchasing'),
('parts-order',            'Parts Order',               'purchasing',    'Purchasing'),
-- Sales / Shipping domain
('shipping',               'Shipping',                  'shipping',      'Shipping'),
('shipping-request',       'Shipping Request',          'shipping',      'Shipping'),
('ship-to-address',        'Ship To Address',           'shipping',      'Shipping'),
('sales-order-search',     'Sales Order Search',        'shipping',      'Shipping'),
-- HR / Training domain
('training',               'Training',                  'hr',            'HR'),
('safety-incident',        'Safety Incident',           'quality',       'Quality'),
-- Admin / Platform domain
('users',                  'Users',                     'admin',         'IT / Admin'),
('menu',                   'Menu',                      'admin',         'IT / Admin'),
('page-access',            'Page Access',               'admin',         'IT / Admin'),
('access-control',         'Access Control',            'admin',         'IT / Admin'),
('setting',                'Settings',                  'admin',         'IT / Admin'),
('platform',               'Platform',                  'admin',         'IT / Admin'),
('reports',                'Reports',                   'admin',         'IT / Admin'),
('org-chart',              'Org Chart',                 'admin',         'IT / Admin'),
('org-chart-token',        'Org Chart Token',           'admin',         'IT / Admin'),
('table-settings',         'Table Settings',            'admin',         'IT / Admin'),
('table-filter-settings',  'Table Filter Settings',     'admin',         'IT / Admin'),
('scheduler',              'Scheduler',                 'admin',         'IT / Admin'),
('scheduler-event',        'Scheduler Event',           'admin',         'IT / Admin'),
-- General / Shared
('attachments',            'Attachments',               'shared',        NULL),
('file-storage',           'File Storage',              'shared',        NULL),
('notes',                  'Notes',                     'shared',        NULL),
('comments',               'Comments',                  'shared',        NULL),
('request',                'Request',                   'shared',        NULL),
('request-comments',       'Request Comments',          'shared',        NULL),
('owners',                 'Owners',                    'shared',        NULL),
('address-search',         'Address Search',            'shared',        NULL),
('data-scrub',             'Data Scrub',                'shared',        NULL),
('late-reason-codes',      'Late Reason Codes',         'shared',        NULL),
('status-category',        'Status Category',           'shared',        NULL),
('kanban-priorities',      'Kanban Priorities',         'shared',        NULL),
('calendar-event',         'Calendar Event',            'shared',        NULL),
('event',                  'Event',                     'shared',        NULL),
('ticket-event',           'Ticket Event',              'shared',        NULL),
('email-notification',     'Email Notification',        'shared',        NULL),
('non-billable-code',      'Non-Billable Code',         'shared',        NULL),
('service-type',           'Service Type',              'shared',        NULL),
-- CRM / Customer domain
('customer',               'Customer',                  'crm',           'Sales'),
('company',                'Company',                   'crm',           'Sales'),
('vendor',                 'Vendor',                    'crm',           'Sales'),
('sg-asset',               'SG Asset',                 'crm',           'Sales'),
-- Finance / Property
('property',               'Property',                  'finance',       'Finance'),
('license',                'License',                   'finance',       'Finance'),
('licensed-techs',         'Licensed Techs',            'finance',       'Finance'),
('receipt-category',       'Receipt Category',          'finance',       'Finance'),
('crash-kit',              'Crash Kit',                 'finance',       'Finance'),
('team',                   'Team',                      'finance',       'Finance')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- PERMISSION SEED: 5 flat action-based permissions.
-- Domain scoping is separate (app_user_role_scopes + grants).
-- This means: no matter how many modules you add, these 5 never change.
-- When decorating a route: @Permissions('write') + the guard resolves
-- whether the user's domain scope covers that module's domain.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `eyefidb`.`app_permissions` (`name`, `description`) VALUES
('read',    'View / read access within an allowed domain'),
('write',   'Create and edit access within an allowed domain'),
('delete',  'Delete access within an allowed domain'),
('manage',  'Manage settings, templates, and configs within an allowed domain'),
('approve', 'Approve workflows and records within an allowed domain');

-- ---------------------------------------------------------------------------
-- ROLE → PERMISSION MAPPING
-- admin:      all 5 actions (domain scope = * handled via app_user_role_scopes)
-- manager:    read, write, approve          (no delete by default)
-- supervisor: read, write
-- user:       read, write
-- viewer:     read only
--
-- Domain scope is controlled separately in app_user_role_scopes:
--   - A receiving manager gets scope_type='domain', scope_value='receiving'
--   - A cross-functional manager gets scope_value='*'
--   - The guard enforces: user has the action AND their scope covers the module domain
-- ---------------------------------------------------------------------------

-- admin: all actions
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'admin';

-- manager: read + write + approve (delete must be explicitly requested)
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'manager'
  AND p.name IN ('read', 'write', 'approve');

-- supervisor: read + write
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'supervisor'
  AND p.name IN ('read', 'write');

-- user: read + write
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'user'
  AND p.name IN ('read', 'write');

-- viewer: read only
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'viewer'
  AND p.name = 'read';

-- receiving-clerk: read + write
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'receiving-clerk'
  AND p.name IN ('read', 'write');

-- inventory-control: read + write + manage
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'inventory-control'
  AND p.name IN ('read', 'write', 'manage');

-- cycle-counter: read + write
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'cycle-counter'
  AND p.name IN ('read', 'write');

-- picker: read + write
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'picker'
  AND p.name IN ('read', 'write');

-- packer: read + write
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'packer'
  AND p.name IN ('read', 'write');

-- shipper: read + write
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'shipper'
  AND p.name IN ('read', 'write');

-- shipping-coordinator: read + write + approve
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'shipping-coordinator'
  AND p.name IN ('read', 'write', 'approve');

-- quality-inspector: read + write + approve
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'quality-inspector'
  AND p.name IN ('read', 'write', 'approve');

-- returns-rma-specialist: read + write + approve
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'returns-rma-specialist'
  AND p.name IN ('read', 'write', 'approve');

-- warehouse-manager: all actions
INSERT IGNORE INTO `eyefidb`.`app_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `eyefidb`.`app_roles` r
JOIN `eyefidb`.`app_permissions` p
WHERE r.name = 'warehouse-manager';

-- Backfill user roles from existing db.users fields.
-- Priority: admin flag -> admin role
INSERT IGNORE INTO `eyefidb`.`app_user_roles` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `db`.`users` u
JOIN `eyefidb`.`app_roles` r ON r.name = 'admin'
WHERE COALESCE(u.active, 1) = 1
  AND COALESCE(u.admin, 0) = 1;

-- Managers, directors, and VPs from employeeType (legacy convention):
--   3 = manager, 4 = director, 5 = VP (if added)
-- All get the 'manager' RBAC role; domain scope in app_user_role_scopes controls breadth.
-- Directors/VPs should also receive scope_value='*' after migration.
INSERT IGNORE INTO `eyefidb`.`app_user_roles` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `db`.`users` u
JOIN `eyefidb`.`app_roles` r ON r.name = 'manager'
WHERE COALESCE(u.active, 1) = 1
  AND COALESCE(u.admin, 0) = 0
  AND COALESCE(u.employeeType, -1) >= 3;

INSERT IGNORE INTO `eyefidb`.`app_user_roles` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `db`.`users` u
JOIN `eyefidb`.`app_roles` r ON r.name = 'supervisor'
WHERE COALESCE(u.active, 1) = 1
  AND COALESCE(u.admin, 0) = 0
  AND COALESCE(u.employeeType, -1) = 2;

-- Default active users to user role if no role assigned yet
INSERT IGNORE INTO `eyefidb`.`app_user_roles` (`user_id`, `role_id`)
SELECT u.id, r.id
FROM `db`.`users` u
JOIN `eyefidb`.`app_roles` r ON r.name = 'user'
LEFT JOIN `eyefidb`.`app_user_roles` ur ON ur.user_id = u.id
WHERE COALESCE(u.active, 1) = 1
  AND ur.id IS NULL;

-- Bootstrap domain scopes for backfilled roles.
-- This preserves broad legacy access immediately after migration so users are not
-- locked out by empty app_user_role_scopes rows. Admins can narrow scopes later.
INSERT IGNORE INTO `eyefidb`.`app_user_role_scopes` (`user_role_id`, `scope_type`, `scope_value`)
SELECT ur.id, 'domain', '*'
FROM `eyefidb`.`app_user_roles` ur
INNER JOIN `eyefidb`.`app_roles` r ON r.id = ur.role_id
WHERE r.name IN ('admin', 'manager', 'supervisor', 'user', 'viewer');
