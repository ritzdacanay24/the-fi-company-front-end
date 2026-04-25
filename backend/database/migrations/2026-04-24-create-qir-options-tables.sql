-- =============================================================================
-- Migration: QIR Options - Normalized lookup tables replacing qir_settings
-- Date: 2026-04-24
--
-- Design decisions:
--   1. Two-table approach: categories define WHAT dropdowns exist,
--      options define the selectable VALUES per category.
--   2. Categories are FK-controlled (no free-text category strings).
--   3. `slug` matches old `category` values so frontend grouping is unchanged.
--   4. `sort_order` on both tables gives explicit control over display order.
--   5. `updated_at` + `created_by` provide a lightweight audit trail.
--   6. Old `qir_settings` table is left intact; no destructive changes.
--   7. Write access relies on the existing domain-scoped `manage` permission.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: qir_option_categories
-- Defines every dropdown type that appears in the QIR form.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `qir_option_categories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`        VARCHAR(50)  NOT NULL COMMENT 'Stable key used by API & frontend grouping, e.g. status, priority',
  `label`       VARCHAR(100) NOT NULL COMMENT 'Human-readable name shown in admin UI',
  `description` TEXT         NULL,
  `sort_order`  TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Controls display order in admin UI',
  `active`      TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qir_option_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Defines every dropdown type used in the QIR form';

-- ---------------------------------------------------------------------------
-- TABLE: qir_options
-- Stores the selectable values for each category.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `qir_options` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`    INT UNSIGNED NOT NULL,
  `name`           VARCHAR(150) NOT NULL COMMENT 'Display label shown in dropdown',
  `code`           VARCHAR(50)  NULL     COMMENT 'Optional short code or alias',
  `description`    TEXT         NULL     COMMENT 'Tooltip / helper text for this option',
  `show_in_public` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1 COMMENT '1 = visible on public-facing QIR form',
  `sort_order`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `active`         TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by`     INT NULL COMMENT 'FK to users.id — who created/last modified this option',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qir_options_category_name` (`category_id`, `name`),
  KEY `idx_qir_options_category_active` (`category_id`, `active`),
  CONSTRAINT `fk_qir_options_category`
    FOREIGN KEY (`category_id`) REFERENCES `qir_option_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Selectable values for each QIR dropdown category';

-- ---------------------------------------------------------------------------
-- SEED: Categories (slugs intentionally match old qir_settings.category values)
-- ---------------------------------------------------------------------------
INSERT INTO `qir_option_categories` (`slug`, `label`, `sort_order`) VALUES
  ('priority',      'Priority',          1),
  ('status',        'Status',            2),
  ('statusReason',  'Status Reason',     3),
  ('type',          'Incident Type',     4),
  ('typeSub',       'Incident Sub-Type', 5),
  ('componentType', 'Component Type',    6),
  ('platformType',  'Platform Type',     7),
  ('failureType',   'Failure Type',      8),
  ('stakeholder',   'Stakeholder',       9),
  ('customerName',  'Customer Name',    10)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`);

-- ---------------------------------------------------------------------------
-- SEED: Priority options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `code`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='priority'), 'Low',      NULL, 'Respond as availability allows; may extend deadline with permission of Quality Engineer.',                    1, 1),
  ((SELECT id FROM qir_option_categories WHERE slug='priority'), 'Medium',   NULL, 'Respond as soon as feasible; deadline established, but may be interrupted by higher priority activities.',   1, 2),
  ((SELECT id FROM qir_option_categories WHERE slug='priority'), 'High',     NULL, 'Respond by established deadline, which may interrupt other staff working low or medium priority activities.', 1, 3),
  ((SELECT id FROM qir_option_categories WHERE slug='priority'), 'Critical', NULL, 'Respond immediately with sustained effort using all available resources until resolved.',                     1, 4)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Status options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='status'), 'Open',                  'Issue has been logged and is awaiting initial action.',                              1, 1),
  ((SELECT id FROM qir_option_categories WHERE slug='status'), 'In Process',            'Issue is actively being investigated or worked on.',                                 1, 2),
  ((SELECT id FROM qir_option_categories WHERE slug='status'), 'Awaiting Verification', 'A resolution has been submitted and is pending quality verification.',               1, 3),
  ((SELECT id FROM qir_option_categories WHERE slug='status'), 'Approved',              'Resolution has been reviewed and approved by Quality.',                              1, 4),
  ((SELECT id FROM qir_option_categories WHERE slug='status'), 'Rejected',              'Resolution was reviewed and rejected; additional corrective action is required.',    1, 5),
  ((SELECT id FROM qir_option_categories WHERE slug='status'), 'Closed',                'Issue has been fully resolved and the record is closed.',                            1, 6)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Status Reason options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='statusReason'), 'Investigation', 'Issue is under active investigation to determine root cause.', 1, 1)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Incident Type options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='type'), 'Internal - End Of Line',       'Quality issue discovered during end-of-line testing within production.',             1, 1),
  ((SELECT id FROM qir_option_categories WHERE slug='type'), 'Internal - Other Department',  'Quality issue originated in another internal department.',                           1, 2),
  ((SELECT id FROM qir_option_categories WHERE slug='type'), 'Internal - Inbound Inspection','Quality issue found during incoming inspection of received parts or materials.',     1, 3),
  ((SELECT id FROM qir_option_categories WHERE slug='type'), 'External - New Installation',  'Quality issue reported during a new customer installation in the field.',            1, 4),
  ((SELECT id FROM qir_option_categories WHERE slug='type'), 'External - Existing in Field', 'Quality issue found on a unit already deployed at a customer site.',                 1, 5)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Incident Sub-Type options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='typeSub'), 'External Customer Reported',   'Issue was reported directly by the end customer.',                                  1, 1),
  ((SELECT id FROM qir_option_categories WHERE slug='typeSub'), 'External Installer Reported',  'Issue was reported by the field service installer during or after installation.',    1, 2)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Component Type options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'LED Panels',               'LED display panels and modules.',                                                   1,  1),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Graphics',                 'Printed or digital graphic artwork and overlays.',                                  1,  2),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Frame/Chassis',            'Structural frame and chassis assembly components.',                                 1,  3),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Power Supplies',           'AC/DC power supply units and related components.',                                  1,  4),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Controller',               'Main controller board or processing unit.',                                         1,  5),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Receiver Card',            'LED receiver and hub cards.',                                                       1,  6),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Documentation',            'Manuals, guides, spec sheets, and other paperwork.',                                1,  7),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Cables/Harness/Adapters',  'Wire harnesses, cables, connectors, and adapters.',                                 1,  8),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Hardware',                 'General hardware: fasteners, brackets, and mounting components.',                    1,  9),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Legs/Stabilizers',         'Stand legs, feet, and stabilizer assemblies.',                                      1, 10),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Monitor',                  'Monitor display units (non-LED).',                                                  1, 11),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Speakers',                 'Audio speaker components and assemblies.',                                          1, 12),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Labels/Serial Tags',       'Product identification labels and serial number tags.',                              1, 13),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'CPU',                      'Central processing unit or computer module.',                                       1, 14),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Software/Program',         'Software applications, firmware, and programming files.',                            1, 15),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Marquee/Topper',           'Marquee header and topper display components.',                                     1, 16),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Rings/Bezels',             'Decorative rings and bezel surrounds.',                                             1, 17),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Cover/Base Plates',        'Exterior covers and base plate components.',                                        1, 18),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Delivery Issues',          'Issues related to the delivery of the product or shipment.',                         1, 19),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'LED Light Rope',           'LED rope lighting components.',                                                     1, 20),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'LED Light Strip',          'LED strip lighting components.',                                                    1, 21),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Service Install Issues',   'Issues arising during field service or installation activities.',                    1, 22),
  ((SELECT id FROM qir_option_categories WHERE slug='componentType'), 'Packaging',                'Packaging materials, boxes, and protective components.',                             1, 23)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Platform Type options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Wedge/Endcap',     'Wedge-shaped and endcap display platform.',                                         1,  1),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Sign',             'Standalone sign display platform.',                                                 1,  2),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), '360',              '360-degree viewing display platform.',                                              1,  3),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Inline',           'Inline aisle display platform.',                                                    1,  4),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Twinstar',         'Twinstar dual-sided display platform.',                                             1,  5),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Bond 007',         'Bond 007 display platform.',                                                        1,  6),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'MLP',              'Multi-level progressive display platform.',                                         1,  7),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Hardware',         'General hardware platform (no specific display type).',                             1,  8),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Towers',           'Tower display platform.',                                                           1,  9),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'TMF',              'TMF platform.',                                                                     1, 10),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'VWL',              'VWL platform.',                                                                     1, 11),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Renegade',         'Renegade display platform.',                                                        1, 12),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Shipping Related', 'Issue is related to shipping or logistics rather than a specific platform.',         1, 13),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'S Curves',         'S-Curves display platform.',                                                        1, 14),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Rotators',         'Rotating display platform.',                                                        1, 15),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Graphics',         'Graphics-only platform (no structural component).',                                 1, 16),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'EGM',              'Electronic gaming machine platform.',                                               1, 17),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'ZOLTAR',           'Zoltar display platform.',                                                          1, 18),
  ((SELECT id FROM qir_option_categories WHERE slug='platformType'), 'Shibui',           'Shibui display platform.',                                                          1, 19)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Failure Type options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Component Malfuction',              'A component failed to operate as designed or stopped functioning.',              1,  1),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Component Incorrect',               'The wrong component was used, assembled, or shipped.',                           1,  2),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Damaged',                           'A component or unit has visible physical damage.',                               1,  3),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Shipping / Delivery Issue',         'Damage, loss, or delay occurred during shipping or delivery.',                   1,  4),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Component Out-of-Spec',             'A component does not meet the required design or performance specifications.',    1,  5),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Incorrect Label',                   'A label is wrong, missing, illegible, or misapplied.',                          1,  6),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Incorrect / Missing Documentation', 'Required documentation is absent, incorrect, or incomplete.',                   1,  7),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Packaging Issue',                   'Packaging was inadequate, damaged, or incorrect for the product.',               1,  8),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Cosmetics Issue',                   'Surface finish, color, appearance, or cosmetic defect.',                        1,  9),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Poor Workmanship',                  'Assembly or manufacturing quality does not meet internal standards.',            0, 10),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Poor Delivery Rating',              'Delivery performance was below expectations (internal metric).',                 0, 11),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Poor Quality Rating',               'Overall quality performance was below expectations (internal metric).',          0, 12),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'No-Fault Found',                    'Investigation found no defect or failure present.',                             1, 13),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Sales Order Error',                 'The root cause traces back to an error in the sales order.',                    1, 14),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Field Service Issue',               'Issue arose during or as a result of field service activity.',                  1, 15),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Programing Issue',                  'Software, firmware, or configuration programming error.',                       1, 16),
  ((SELECT id FROM qir_option_categories WHERE slug='failureType'), 'Component Missing',                 'A required component was not included in the shipment or assembly.',            1, 17)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Stakeholder options
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `description`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Sales',               'Sales department.',                                                                 1,  1),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'NPI - Engineering',   'New Product Introduction engineering team.',                                        1,  2),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Production Planning', 'Production planning and scheduling department.',                                    1,  3),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Production',          'Production and manufacturing floor.',                                               1,  4),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Graphic',             'Graphic arts department.',                                                          1,  5),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Quality Assurance',   'Quality assurance team.',                                                           1,  6),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Shipping',            'Shipping and receiving department.',                                                 1,  7),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Field Service',       'Field service technician team.',                                                    1,  8),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Warehouse',           'Warehouse and inventory management team.',                                          1,  9),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Supply Chain',        'Supply chain and procurement management.',                                          1, 10),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Supplier',            'External supplier or vendor responsible for the part.',                             1, 11),
  ((SELECT id FROM qir_option_categories WHERE slug='stakeholder'), 'Customer',            'External customer who reported or is affected by the issue.',                       1, 12)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- SEED: Customer Name options (legacy — see note above)
-- ---------------------------------------------------------------------------
INSERT INTO `qir_options` (`category_id`, `name`, `code`, `show_in_public`, `sort_order`) VALUES
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'A & W Enterprises',                   'AWE',   1,  1),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Advanced Gaming Distributors',         'AGD',   1,  2),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'American Gaming Systems, LLC',         'AGS',   1,  3),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Aristocrat',                           'ATI',   1,  4),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Bellagio',                             'BEL',   1,  5),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Boyd Gaming',                          'BOY',   1,  6),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Century Gaming Technologies',          'CGT',   1,  7),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'China TradeRite Products Comapny Ltd.','CTR',   1,  8),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Cole Kepro International, LLC.',       'CKI',   1,  9),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Elite Manufacturing Technologies, Inc','EMT',   1, 10),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Everi Games Inc.',                    'EVE',   1, 11),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'EYE-Fi',                              'EYEFI', 1, 12),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Flex',                                'Flex',  1, 13),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Gamesman, Inc',                       'GMM',   1, 14),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Gaming Arts LLC',                     'GMA',   1, 15),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Grand Vision Gaming',                 'GVG',   1, 16),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'GT Source',                           'GTS',   1, 17),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'HMS Gaming LLC',                      'HMS',   1, 18),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'INTGAM',                              'IGT',   1, 19),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'IntuiCode Gaming',                    'ICG',   1, 20),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'JVL Labs, Inc',                       'JVL',   1, 21),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Konami Gaming, Inc.',                 'KON',   1, 22),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'NORPRE',                              'NOR',   1, 23),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Scientific Games',                    'SG',    1, 24),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'Tovis Co., LTD',                      'TOV',   1, 25),
  ((SELECT id FROM qir_option_categories WHERE slug='customerName'), 'VGT',                                 'VGT',   1, 26)
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`), `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------------
-- CLEANUP: Deactivate legacy "N/A" values from earlier seed revisions
-- These rows may already exist in environments where the first seed version
-- inserted them before the seed set was tightened to use null/blank selection.
-- ---------------------------------------------------------------------------
UPDATE `qir_options` o
JOIN `qir_option_categories` c ON c.id = o.category_id
SET
  o.active = 0,
  o.show_in_public = 0
WHERE
  (c.slug IN ('priority', 'status', 'type', 'typeSub', 'componentType', 'stakeholder') AND o.name = 'N/A')
  OR (c.slug = 'platformType' AND o.name = 'Not applicable')
  OR (c.slug = 'customerName' AND o.name = 'Non Applicable');
