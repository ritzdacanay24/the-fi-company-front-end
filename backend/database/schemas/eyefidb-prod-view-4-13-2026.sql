/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE TABLE IF NOT EXISTS `agsSerialGenerator` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timeStamp` datetime DEFAULT NULL,
  `poNumber` varchar(50) DEFAULT NULL,
  `property_site` varchar(50) DEFAULT NULL,
  `sgPartNumber` varchar(30) DEFAULT NULL,
  `inspectorName` varchar(40) DEFAULT NULL,
  `generated_SG_asset` varchar(150) DEFAULT NULL,
  `serialNumber` varchar(150) DEFAULT NULL,
  `lastUpdate` datetime DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `manualUpdate` varchar(15) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ags_eyefi_serial` (`serialNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=1983 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `ags_graphics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `voice` varchar(15) DEFAULT NULL,
  `order` varchar(8) DEFAULT NULL,
  `invoice_date` varchar(10) DEFAULT NULL,
  `bill)_of_lading` varchar(8) DEFAULT NULL,
  `ship_to` varchar(8) DEFAULT NULL,
  `list_price` varchar(7) DEFAULT NULL,
  `purchase_order` varchar(21) DEFAULT NULL,
  `item_number` varchar(14) DEFAULT NULL,
  `qty_invoiced` int(2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1224 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `allocation_audit_trail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wo_number` varchar(50) NOT NULL,
  `so_number` varchar(50) NOT NULL,
  `part_number` varchar(50) NOT NULL,
  `action` enum('ALLOCATE','DEALLOCATE','REASSIGN','PRIORITY_CHANGE') NOT NULL,
  `previous_allocation` text,
  `new_allocation` text NOT NULL,
  `quantity` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `user_id` varchar(100) NOT NULL,
  `timestamp` datetime NOT NULL,
  `reason` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_part` (`part_number`),
  KEY `idx_audit_wo` (`wo_number`),
  KEY `idx_audit_so` (`so_number`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_timestamp` (`timestamp`),
  KEY `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `allocation_locks` (
  `wo_number` varchar(50) NOT NULL,
  `so_number` varchar(50) NOT NULL,
  `locked_by` varchar(100) NOT NULL,
  `locked_date` datetime NOT NULL,
  `reason` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`wo_number`,`so_number`),
  KEY `idx_alloc_lock_user` (`locked_by`),
  KEY `idx_alloc_lock_date` (`locked_date`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fileName` varchar(150) NOT NULL,
  `link` varchar(200) DEFAULT NULL,
  `createdBy` varchar(150) DEFAULT NULL,
  `createdDate` datetime NOT NULL,
  `field` varchar(150) NOT NULL,
  `capaRequestId` int(11) DEFAULT NULL,
  `uniqueId` varchar(500) DEFAULT NULL,
  `mainId` longtext COMMENT 'This is used for inspections',
  `fileSize` varchar(255) DEFAULT NULL,
  `fileSizeConv` varchar(150) DEFAULT NULL,
  `ext` varchar(150) DEFAULT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `partNumber` varchar(250) DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `tripExpenseId` int(11) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  `directory` varchar(50) DEFAULT 'https://dashboard.eye-fi.com/attachments',
  `date_of_service` date DEFAULT NULL,
  `type_of_work_completed` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uniqueId` (`uniqueId`)
) ENGINE=InnoDB AUTO_INCREMENT=58191 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `attachments_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fileName` varchar(150) NOT NULL,
  `link` varchar(200) DEFAULT NULL,
  `createdBy` varchar(150) NOT NULL,
  `createdDate` datetime NOT NULL,
  `field` varchar(150) NOT NULL,
  `capaRequestId` int(11) DEFAULT NULL,
  `uniqueId` int(11) DEFAULT NULL,
  `mainId` longtext COMMENT 'This is used for inspections',
  `fileSize` varchar(255) DEFAULT NULL,
  `fileSizeConv` varchar(150) DEFAULT NULL,
  `ext` varchar(150) DEFAULT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `partNumber` varchar(250) DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `tripExpenseId` int(11) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uniqueId` (`uniqueId`)
) ENGINE=InnoDB AUTO_INCREMENT=44261 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auth_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT '0',
  `created_date` datetime NOT NULL,
  `code` int(11) NOT NULL DEFAULT '0',
  `passCode` tinytext,
  `userAgent` text,
  `activated` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2036 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `chat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `idUser` int(11) NOT NULL,
  `idOther` int(11) NOT NULL,
  `content` longtext NOT NULL,
  `user` varchar(150) NOT NULL,
  `toUser` varchar(150) NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `idOtherRead` int(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `checklist_audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `instance_id` int(11) DEFAULT NULL,
  `action` enum('created','started','photo_added','photo_removed','completed','submitted','reviewed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_instance` (`instance_id`),
  KEY `idx_action` (`action`),
  KEY `idx_user` (`user_id`),
  KEY `idx_date` (`created_at`),
  CONSTRAINT `checklist_audit_log_ibfk_1` FOREIGN KEY (`instance_id`) REFERENCES `checklist_instances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15367 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `config_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `is_system` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_key` (`config_key`),
  KEY `idx_type` (`config_type`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_instances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `work_order_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_id` int(11) DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','in_progress','review','completed','submitted') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `progress_percentage` decimal(5,2) DEFAULT '0.00',
  `item_completion` json DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `idx_work_order` (`work_order_number`),
  KEY `idx_serial_number` (`serial_number`),
  KEY `idx_status` (`status`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_dates` (`created_at`,`completed_at`),
  CONSTRAINT `checklist_instances_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `checklist_templates` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=235 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `order_index` decimal(10,5) NOT NULL DEFAULT '0.00000',
  `parent_id` int(11) DEFAULT NULL,
  `level` tinyint(3) unsigned NOT NULL DEFAULT '0',
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `submission_type` enum('photo','video','audio','either','none') COLLATE utf8mb4_unicode_ci DEFAULT 'photo' COMMENT 'Controls submission mode: photo, video, audio, either, or none',
  `is_required` tinyint(1) DEFAULT '1',
  `validation_rules` json DEFAULT NULL,
  `photo_requirements` json DEFAULT NULL,
  `sample_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sample_images` json DEFAULT NULL COMMENT 'JSON array of sample/reference images. Structure: [{url, label, description, type, image_type, is_primary, order_index}]. Max 1 primary sample + 5 reference images.',
  `video_requirements` json DEFAULT NULL,
  `sample_video_url` text COLLATE utf8mb4_unicode_ci,
  `sample_videos` json DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `links` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_template_order` (`template_id`,`order_index`),
  KEY `idx_required` (`is_required`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_level` (`level`),
  KEY `idx_checklist_items_template_id` (`template_id`),
  KEY `idx_submission_type` (`submission_type`),
  CONSTRAINT `checklist_items_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `checklist_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61952 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_item_references` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) NOT NULL,
  `type` enum('good_sample','bad_sample','reference','diagram') DEFAULT 'good_sample',
  `image_url` varchar(500) NOT NULL,
  `caption` text COMMENT 'Description/instructions for this image',
  `display_order` int(11) DEFAULT '0',
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_type` (`item_id`,`type`),
  KEY `idx_order` (`item_id`,`display_order`),
  CONSTRAINT `checklist_item_references_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `checklist_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Reference and sample images for checklist items';

CREATE TABLE IF NOT EXISTS `checklist_item_sample_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `checklist_item_id` int(11) NOT NULL,
  `media_type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_category` enum('primary_sample','reference','diagram','defect_example') COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `order_index` int(11) DEFAULT '0',
  `required_for_submission` tinyint(1) DEFAULT '0' COMMENT 'Must user replicate THIS specific photo/video?',
  `angle` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Required viewing angle: front, back, side, top, bottom, diagonal',
  `distance` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Required capture distance: close, medium, far',
  `lighting` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Required lighting: bright, normal, dim',
  `focus` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Specific focus area description',
  `max_duration_seconds` int(11) DEFAULT NULL COMMENT 'For videos only: maximum allowed duration',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_id` (`checklist_item_id`),
  KEY `idx_media_type` (`media_type`),
  KEY `idx_media_category` (`media_category`),
  KEY `idx_item_type_category` (`checklist_item_id`,`media_type`,`media_category`),
  CONSTRAINT `checklist_item_sample_media_ibfk_1` FOREIGN KEY (`checklist_item_id`) REFERENCES `checklist_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36065 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores sample media (images/videos) for checklist items with individual requirements';

CREATE TABLE IF NOT EXISTS `checklist_share_tokens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `instance_id` int(10) unsigned NOT NULL,
  `visible_item_ids` json DEFAULT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_by_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `accessed_count` int(10) unsigned NOT NULL DEFAULT '0',
  `last_accessed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_instance_id` (`instance_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quality_document_id` int(11) DEFAULT NULL COMMENT 'Links to quality_documents table',
  `quality_revision_id` int(11) DEFAULT NULL COMMENT 'Links to quality_revisions table',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revision` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_date` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revision_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revision_details` text COLLATE utf8mb4_unicode_ci,
  `revised_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('quality_control','installation','maintenance','inspection') COLLATE utf8mb4_unicode_ci DEFAULT 'quality_control',
  `version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '1.0',
  `parent_template_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at` timestamp NULL DEFAULT NULL COMMENT 'When template was published/approved for operator use',
  `template_group_id` int(11) NOT NULL,
  `sample_videos` json DEFAULT NULL,
  `is_draft` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Draft status: 1=draft, 0=published',
  `last_autosave_at` timestamp NULL DEFAULT NULL COMMENT 'Last auto-save timestamp',
  PRIMARY KEY (`id`),
  KEY `idx_part_number` (`part_number`),
  KEY `idx_product_type` (`product_type`),
  KEY `idx_category` (`category`),
  KEY `idx_active` (`is_active`),
  KEY `idx_template_group_id` (`template_group_id`),
  KEY `idx_parent_template_id` (`parent_template_id`),
  KEY `idx_checklist_templates_customer_part_number` (`customer_part_number`(50)),
  KEY `idx_quality_document` (`quality_document_id`),
  KEY `idx_quality_revision` (`quality_revision_id`),
  KEY `idx_is_draft` (`is_draft`,`is_active`),
  KEY `idx_published_at` (`published_at`),
  CONSTRAINT `fk_checklist_quality_document` FOREIGN KEY (`quality_document_id`) REFERENCES `quality_documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_checklist_quality_revision` FOREIGN KEY (`quality_revision_id`) REFERENCES `quality_revisions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_parent_template` FOREIGN KEY (`parent_template_id`) REFERENCES `checklist_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=498 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_template_changes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `change_type` enum('created','version_created','field_updated','item_added','item_removed','item_modified') COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `change_summary` text COLLATE utf8mb4_unicode_ci,
  `changes_json` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_version` (`template_id`,`version`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `checklist_template_changes_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `checklist_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_upload_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_item_id` (`item_id`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  CONSTRAINT `checklist_upload_log_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `checklist_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checklist_upload_log_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `checklist_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log table for tracking sample image uploads for checklist items';

CREATE TABLE IF NOT EXISTS `cl` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(250) NOT NULL,
  `description` varchar(500) NOT NULL DEFAULT '',
  `active` int(1) NOT NULL DEFAULT '1',
  `version` varchar(500) NOT NULL DEFAULT '',
  `createdDate` datetime DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `rev` int(11) DEFAULT NULL,
  `activated` varchar(7) NOT NULL DEFAULT 'false',
  `includeGeneralForm` varchar(7) NOT NULL DEFAULT 'true',
  PRIMARY KEY (`id`),
  UNIQUE KEY `title` (`title`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `cl_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cl_id` int(11) NOT NULL,
  `name` varchar(250) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `seq` int(11) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=187 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `cl_input` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cl_input_main_id` int(11) NOT NULL,
  `cl_questions_Id` int(11) NOT NULL,
  `val` varchar(11) DEFAULT NULL,
  `comments` longtext,
  `issueComment` longtext,
  `createdBy` int(11) NOT NULL,
  `itemNumber` varchar(160) NOT NULL DEFAULT '',
  `createdDate` datetime DEFAULT NULL,
  `lastUpdate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=146246 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `cl_input_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cl_id` int(11) NOT NULL,
  `woNumber` int(11) DEFAULT '0',
  `so` varchar(800) DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL,
  `completedBy` int(11) DEFAULT NULL,
  `completedDate` datetime DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lineItemNumber` varchar(160) NOT NULL DEFAULT '',
  `soLineNumber` int(11) DEFAULT NULL,
  `typeOfCheckList` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2523 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `cl_post` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `data` json NOT NULL,
  `createdDate` datetime NOT NULL,
  `cl_input_main_id` int(11) NOT NULL,
  `createdBY` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1952 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `cl_questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cl_category_id` int(11) NOT NULL,
  `name` longtext NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `seq` int(11) NOT NULL,
  `cl_id` int(11) NOT NULL,
  `inputType` varchar(60) NOT NULL DEFAULT '',
  `inputPlaceHolder` varchar(50) NOT NULL DEFAULT '',
  `createdBy` int(11) NOT NULL DEFAULT '0',
  `createdDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=837 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `cl_trans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `so` varchar(255) DEFAULT NULL,
  `cl_input_main_id` int(11) NOT NULL DEFAULT '0',
  `cl_category_id` int(11) NOT NULL DEFAULT '0',
  `cl_id` int(11) NOT NULL DEFAULT '0',
  `type` varchar(100) NOT NULL,
  `partNumber` varchar(500) NOT NULL,
  `reasonCode` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=122426 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cogsReview` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `itemNumber` varchar(250) NOT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `review` int(11) NOT NULL DEFAULT '0',
  `verified` int(11) NOT NULL DEFAULT '0',
  `type` varchar(15) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=551 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pid` int(11) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  `comments` longtext NOT NULL,
  `createdDate` datetime NOT NULL,
  `orderNum` varchar(800) NOT NULL,
  `type` varchar(100) NOT NULL,
  `pageApplied` longtext NOT NULL,
  `pageName` longtext,
  `line` varchar(250) NOT NULL DEFAULT '0',
  `comments_html` longtext,
  `comments_html1` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `active` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  FULLTEXT KEY `orderNum` (`orderNum`)
) ENGINE=InnoDB AUTO_INCREMENT=93283 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `companyHoliday` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start` datetime DEFAULT NULL,
  `title` mediumtext,
  `resource_id` mediumtext,
  `end` datetime DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `allDay` varchar(10) DEFAULT NULL,
  `backgroundColor` varchar(50) NOT NULL,
  `borderColor` varchar(50) DEFAULT NULL,
  `textColor` varchar(150) NOT NULL,
  `groupId` varchar(70) DEFAULT NULL,
  `daysOfWeek` varchar(25) DEFAULT NULL,
  `freq` varchar(30) DEFAULT NULL,
  `recur` varchar(11) NOT NULL DEFAULT '0',
  `intvl` int(11) DEFAULT NULL,
  `duration` varchar(45) DEFAULT NULL,
  `until` date DEFAULT NULL,
  `count` int(11) DEFAULT NULL,
  `type` varchar(80) DEFAULT NULL,
  `techRelated` varchar(15) DEFAULT NULL,
  `fs_scheduler_id` int(11) DEFAULT NULL,
  `border_color` varchar(40) DEFAULT NULL,
  `tech_name` varchar(150) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `text_color` varchar(50) DEFAULT 'text-white',
  `created_by` int(11) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `event_type` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7430 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `companyHolidayTest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` datetime DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `all_day` int(5) NOT NULL,
  `background_color` varchar(50) NOT NULL,
  `text_color` varchar(150) NOT NULL,
  `group_ID` varchar(70) DEFAULT NULL,
  `type` varchar(80) DEFAULT NULL,
  `event_related_to_tech` varchar(15) DEFAULT NULL,
  `fs_scheduler_id` int(11) DEFAULT NULL,
  `recurring` longtext,
  `tech_name` varchar(150) DEFAULT NULL,
  `event_related_to_job` varchar(10) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27595 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `companyHoliday_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start` datetime DEFAULT NULL,
  `title` mediumtext NOT NULL,
  `resource_id` mediumtext,
  `end` datetime DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `allDay` varchar(10) DEFAULT NULL,
  `backgroundColor` varchar(50) NOT NULL,
  `borderColor` varchar(50) DEFAULT NULL,
  `textColor` varchar(150) NOT NULL,
  `groupId` varchar(70) DEFAULT NULL,
  `daysOfWeek` varchar(25) DEFAULT NULL,
  `freq` varchar(30) DEFAULT NULL,
  `recur` varchar(11) NOT NULL DEFAULT '0',
  `intvl` int(11) DEFAULT NULL,
  `duration` varchar(45) DEFAULT NULL,
  `until` date DEFAULT NULL,
  `count` int(11) DEFAULT NULL,
  `type` varchar(80) DEFAULT NULL,
  `techRelated` varchar(15) DEFAULT NULL,
  `fs_scheduler_id` int(11) DEFAULT NULL,
  `border_color` varchar(40) DEFAULT NULL,
  `tech_name` varchar(150) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5563 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `convertcsv` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `title` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `officephone` varchar(100) DEFAULT NULL,
  `officephone2` varchar(100) DEFAULT NULL,
  `mobilephone` varchar(100) DEFAULT NULL,
  `address1` varchar(100) NOT NULL,
  `address2` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `crash_kit_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pt_part` varchar(100) NOT NULL,
  `FULLDESC` text,
  `active` tinyint(1) DEFAULT '1',
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pt_part` (`pt_part`),
  KEY `idx_pt_part` (`pt_part`),
  KEY `idx_active` (`active`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cron_email_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(170) NOT NULL,
  `subscribed_to` varchar(150) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(1) NOT NULL DEFAULT '1',
  `user_id` int(11) NOT NULL,
  `title` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `customerSatisfacation` (
  `id` int(1) NOT NULL,
  `property` int(1) NOT NULL,
  `service_type` int(1) NOT NULL,
  `customer1` int(1) NOT NULL,
  `fs_workOrder_id` int(1) NOT NULL,
  `jobNumber` int(1) NOT NULL,
  `dateSubmitted` int(1) NOT NULL,
  `rating` int(1) NOT NULL,
  `comments` int(1) NOT NULL,
  `vendorLeadTechName` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `customerSatisfactionsSurvey` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_workOrder_id` int(11) DEFAULT NULL,
  `question` varchar(350) NOT NULL,
  `rating` varchar(30) NOT NULL,
  `comments` varchar(350) DEFAULT NULL,
  `dateSubmitted` datetime NOT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `vendorName` varchar(50) DEFAULT NULL,
  `vendorLeadTechName` varchar(50) DEFAULT NULL,
  `locationOfService` varchar(100) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `jobNumber` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fs_workOrder_id` (`fs_workOrder_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13085 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `customer_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Short code: sg, ags, igt, etc.',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name: Light and Wonder, AGS, IGT',
  `requires_asset_generation` tinyint(1) DEFAULT '0' COMMENT 'True if this customer needs auto-generated asset numbers',
  `asset_generation_class` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'PHP class name for generation logic',
  `asset_table_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Table where generated assets are stored',
  `active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`),
  KEY `idx_customer_code` (`customer_code`),
  KEY `idx_active` (`active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master configuration table for customer types';

CREATE TABLE IF NOT EXISTS `customer_visit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `property_name` varchar(250) DEFAULT NULL,
  `techs` varchar(250) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `customer_visit_log_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_visit_log_id` int(11) DEFAULT NULL,
  `sign_theme` text,
  `manufacture` text,
  `bank_location` text,
  `issue` varchar(10) DEFAULT NULL,
  `serial_number` text,
  `description_of_issue` text,
  `created_by` int(11) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `dailyReport` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdDate` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=266 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `daily_report_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `sort_column` text,
  `hidden_column` text,
  `Column 5` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `data_scrub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `query` longtext NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `db_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL DEFAULT '0',
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Department name',
  `parent_department_id` bigint(20) DEFAULT NULL COMMENT 'Reference to parent department for hierarchy',
  `department_head_user_id` bigint(20) DEFAULT NULL COMMENT 'User ID of department head/manager',
  `display_order` int(11) NOT NULL DEFAULT '0' COMMENT 'Display order in org chart',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_departments_name` (`department_name`),
  KEY `idx_departments_parent` (`parent_department_id`),
  KEY `idx_departments_head` (`department_head_user_id`),
  KEY `idx_departments_active` (`is_active`),
  CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`parent_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores department structure and hierarchy for organizational chart';

CREATE TABLE IF NOT EXISTS `email` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` longtext NOT NULL,
  `createdDate` datetime NOT NULL,
  `subject` varchar(250) NOT NULL,
  `orderNum` varchar(500) NOT NULL,
  `unique_id` varchar(1500) DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1310 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `email_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name_of_task` varchar(500) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_email` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `email_notification_access_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(50) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `value` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `value` (`value`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `error_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `error_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `error_stack` text COLLATE utf8mb4_unicode_ci,
  `severity` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'error',
  `http_status` int(11) DEFAULT NULL,
  `http_url` text COLLATE utf8mb4_unicode_ci,
  `http_method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `page_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `viewport_width` int(11) DEFAULT NULL,
  `viewport_height` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `breadcrumbs` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `screenshot_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_sent` tinyint(1) DEFAULT '0',
  `email_sent_at` datetime DEFAULT NULL,
  `resolved` tinyint(1) DEFAULT '0',
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `resolution_notes` text COLLATE utf8mb4_unicode_ci,
  `error_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurrence_count` int(11) DEFAULT '1',
  `first_seen_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference_id` (`reference_id`),
  KEY `idx_error_reports_created_at` (`created_at`),
  KEY `idx_error_reports_error_hash` (`error_hash`),
  KEY `idx_error_reports_user_id` (`user_id`),
  KEY `idx_error_reports_severity` (`severity`),
  KEY `idx_error_reports_resolved` (`resolved`),
  KEY `idx_error_reports_reference_id` (`reference_id`),
  KEY `idx_error_reports_dedup` (`error_hash`,`last_seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eyefi_asset_numbers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `generation_date` date NOT NULL,
  `daily_sequence` int(11) NOT NULL,
  `status` enum('available','assigned','consumed','voided') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `category` enum('New','Used') COLLATE utf8mb4_unicode_ci DEFAULT 'New',
  `assigned_to_wo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `assigned_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `consumed_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_number` (`asset_number`),
  UNIQUE KEY `unique_daily_sequence` (`generation_date`,`daily_sequence`),
  KEY `idx_asset_number` (`asset_number`),
  KEY `idx_generation_date` (`generation_date`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`),
  KEY `idx_assigned_wo` (`assigned_to_wo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eyefi_serial_assignments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Reference to the assigned EyeFi serial number',
  `customer_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Customer receiving the device',
  `customer_po` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_order_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Associated work order number',
  `wo_part` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wo_qty_ord` int(11) DEFAULT NULL,
  `wo_due_date` date DEFAULT NULL,
  `wo_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_date` date NOT NULL COMMENT 'Date the device was assigned to customer',
  `assigned_by_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shipped_date` date DEFAULT NULL,
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_eyefi_assignments_serial_number` (`serial_number`),
  KEY `idx_eyefi_assignments_customer_name` (`customer_name`),
  KEY `idx_eyefi_assignments_work_order` (`work_order_number`),
  KEY `idx_eyefi_assignments_assigned_date` (`assigned_date`),
  KEY `idx_eyefi_assignments_shipped_date` (`shipped_date`),
  CONSTRAINT `eyefi_serial_assignments_ibfk_1` FOREIGN KEY (`serial_number`) REFERENCES `eyefi_serial_numbers` (`serial_number`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks customer and work order assignments for EyeFi devices';

CREATE TABLE IF NOT EXISTS `eyefi_serial_numbers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for the serial number record',
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The actual EyeFi device serial number',
  `product_model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EyeFi Pro X1' COMMENT 'EyeFi product model: Pro X1, Standard S2, Enterprise E3, Lite L1, Advanced A2',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available' COMMENT 'Status: available, assigned, shipped, returned, defective',
  `assigned_to_table` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Table name where serial is assigned',
  `assigned_to_id` bigint(20) DEFAULT NULL COMMENT 'Record ID in the assigned table',
  `hardware_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Device hardware version (e.g., 1.2.0)',
  `firmware_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Device firmware version (e.g., 2.1.4)',
  `manufacture_date` date DEFAULT NULL COMMENT 'Date the device was manufactured',
  `batch_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Manufacturing batch number for tracking',
  `qr_code` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'QR code associated with the device',
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defective_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `assigned_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipped_at` datetime DEFAULT NULL,
  `shipped_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `returned_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defective_at` datetime DEFAULT NULL,
  `defective_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_consumed` tinyint(1) DEFAULT '0' COMMENT 'True if serial has been assigned/consumed',
  `consumed_at` datetime DEFAULT NULL COMMENT 'Timestamp when serial was consumed',
  `consumed_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User who consumed the serial',
  `assignment_id` int(11) DEFAULT NULL COMMENT 'FK to serial_assignments.id',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `idx_eyefi_serial_numbers_serial_number` (`serial_number`),
  KEY `idx_eyefi_serial_numbers_status` (`status`),
  KEY `idx_eyefi_serial_numbers_product_model` (`product_model`),
  KEY `idx_eyefi_serial_numbers_batch_number` (`batch_number`),
  KEY `idx_eyefi_serial_numbers_created_at` (`created_at`),
  KEY `idx_is_consumed` (`is_consumed`),
  KEY `idx_consumed_at` (`consumed_at`),
  KEY `idx_assignment_id` (`assignment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2213 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores EyeFi device serial numbers for tracking and lifecycle management';

CREATE TABLE IF NOT EXISTS `faqs_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `faqs_main_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `content` longtext NOT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `lastUpdate` datetime DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `dt_1` varchar(250) DEFAULT NULL,
  `image` varchar(250) DEFAULT NULL,
  `content_1` longblob,
  `link` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `faqs_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `type` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `faqs_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `finance_forcast` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `day` varchar(55) NOT NULL,
  `balance` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fsEventConfig` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(500) NOT NULL,
  `value` varchar(250) NOT NULL,
  `work_order_labor_type` int(11) DEFAULT NULL,
  `work_order_labor_calculate` int(11) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `calculateTime` int(11) DEFAULT '0',
  `statusColor` varchar(50) DEFAULT NULL,
  `typeOfStatus` varchar(150) NOT NULL,
  `cost` int(11) NOT NULL DEFAULT '0',
  `receipt_value` int(11) NOT NULL DEFAULT '0',
  `color` varchar(50) DEFAULT NULL,
  `border_color` varchar(30) DEFAULT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `value` (`value`)
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_assets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` varchar(100) NOT NULL,
  `type` varchar(100) NOT NULL,
  `asset` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8258 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fileName` varchar(150) NOT NULL,
  `link` varchar(200) NOT NULL,
  `createdBy` varchar(150) NOT NULL,
  `createdDate` datetime NOT NULL,
  `field` varchar(150) NOT NULL,
  `capaRequestId` int(11) DEFAULT NULL,
  `uniqueId` int(11) DEFAULT NULL,
  `mainId` longtext COMMENT 'This is used for inspections',
  `fileSize` varchar(255) NOT NULL,
  `fileSizeConv` varchar(150) NOT NULL,
  `ext` varchar(150) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `partNumber` varchar(250) DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uniqueId` (`uniqueId`)
) ENGINE=InnoDB AUTO_INCREMENT=41931 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fs_attachment_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(100) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_det_id` int(11) NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fs_det_id` (`fs_det_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=319 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fs_billing_DELETE` (
  `travelTimeHrs` decimal(65,2) DEFAULT NULL,
  `travel_over_time_hrs` decimal(65,2) DEFAULT NULL,
  `installTimes` decimal(65,2) DEFAULT NULL,
  `install_overtime_hrs` decimal(65,2) DEFAULT NULL,
  `total_overtime_from_total_hrs` decimal(65,2) DEFAULT NULL,
  `workOrderId` int(11) NOT NULL,
  `start` varchar(10) CHARACTER SET utf8mb4 DEFAULT NULL,
  `startFormate` varchar(43) CHARACTER SET utf8mb4 DEFAULT NULL,
  `totalBrkHrs` decimal(65,2) NOT NULL,
  `totalHrs` decimal(65,2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_billing_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `value` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_billing_summary_detail_view` (
  `request_date` date DEFAULT NULL,
  `id` int(11) NOT NULL,
  `labor_bill_amount` double DEFAULT NULL,
  `expense_bill_amount` decimal(65,6) DEFAULT NULL,
  `total_to_bill` double DEFAULT NULL,
  `invoice_amount` varchar(50) CHARACTER SET utf8 DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_billing_view` (
  `workOrderId` int(11) NOT NULL,
  `isWeekEnd` int(1) DEFAULT NULL,
  `start` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `travel` decimal(65,2) DEFAULT NULL,
  `travel_overtime` decimal(65,2) DEFAULT NULL,
  `install` decimal(65,2) DEFAULT NULL,
  `install_overtime` decimal(65,2) DEFAULT NULL,
  `total_overtime` decimal(65,2) DEFAULT NULL,
  `total` decimal(65,2) DEFAULT NULL,
  `break` decimal(65,2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_calendar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `description` varchar(250) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `all_day` int(11) DEFAULT '0',
  `background_color` varchar(50) DEFAULT NULL,
  `text_color` varchar(100) DEFAULT NULL,
  `recurring` longtext,
  `resource` longtext,
  `type_of_event` varchar(100) DEFAULT NULL,
  `fs_scheduler_id` int(11) DEFAULT NULL,
  `group_id` varchar(255) DEFAULT NULL,
  `connecting` int(11) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `resource_code` varchar(50) DEFAULT NULL,
  `resource_contractor` varchar(50) DEFAULT NULL,
  `automate` varchar(10) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10069 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_calendar_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `description` varchar(250) NOT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `all_day` int(11) NOT NULL DEFAULT '0',
  `color` varchar(50) NOT NULL,
  `recurring` longtext NOT NULL,
  `resource` longtext NOT NULL,
  `text_color` varchar(100) NOT NULL,
  `type_of_event` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1944 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_client` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(120) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `use_company_name_as_primary_name` int(11) DEFAULT '0',
  `quote_follow_up` int(11) DEFAULT '0',
  `appointment_reminder` int(11) DEFAULT '0',
  `job_follow_up` int(11) DEFAULT '0',
  `invoice_follow_up` int(11) DEFAULT '0',
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=773 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_client_config_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `company_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=514 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_client_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_scheduler_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_client_det` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_client_id` int(11) NOT NULL,
  `type` varchar(100) NOT NULL,
  `prime` int(11) NOT NULL,
  `value` varchar(15) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `typeOf` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_request_id` int(11) NOT NULL,
  `comment` longtext NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `name` varchar(150) NOT NULL,
  `cc_email` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `subject` varchar(250) DEFAULT NULL,
  `request_change` int(11) DEFAULT '0',
  `request_change_completed` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fs_request_id` (`fs_request_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4159 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_company` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) DEFAULT NULL,
  `phone_number` varchar(75) DEFAULT NULL,
  `website_url` varchar(255) DEFAULT NULL,
  `email_address` varchar(150) DEFAULT NULL,
  `address_1` varchar(255) DEFAULT NULL,
  `address_2` varchar(255) DEFAULT NULL,
  `city` varchar(150) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `zip_code` varchar(50) DEFAULT NULL,
  `country` varchar(55) DEFAULT 'United States',
  `timezone` varchar(150) DEFAULT NULL,
  `date_format` varchar(50) DEFAULT 'yyyy-mm-dd',
  `time_format` varchar(12) DEFAULT '12',
  `first_day_of_week` varchar(50) DEFAULT 'Sunday',
  `active` int(11) NOT NULL,
  `business_hours` json NOT NULL,
  `tax_id_name` varchar(140) DEFAULT NULL,
  `tax_id_number` varchar(140) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_company_det` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `image` varchar(200) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `background_color` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(255) NOT NULL,
  `area` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `default_value` varchar(255) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_confirms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_scheduler_id` int(11) NOT NULL,
  `install_date` varchar(200) NOT NULL,
  `customer_name` varchar(200) NOT NULL,
  `manufacture_name` varchar(200) NOT NULL,
  `contractor` varchar(200) NOT NULL,
  `contact_persons` varchar(200) NOT NULL,
  `job_request` varchar(150) NOT NULL,
  `qty` int(11) NOT NULL,
  `type_of_sign` varchar(150) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_date` datetime NOT NULL,
  `comments` varchar(500) NOT NULL,
  `address` varchar(800) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=125 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_connecting_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fsid` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_crash_kit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_number` varchar(150) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT '0',
  `price` decimal(15,2) DEFAULT NULL,
  `work_order_id` int(11) NOT NULL,
  `description` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=202 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_event_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_name` varchar(250) NOT NULL,
  `description` varchar(550) NOT NULL,
  `isEvent` int(11) NOT NULL COMMENT 'This is used to determine what should be computed as labor',
  `isTravel` int(11) NOT NULL,
  `event_type` int(11) NOT NULL COMMENT 'This is used to differentiate  (0) not applicable , (1) service, (2) travel, (3) non-service',
  `isBreak` int(11) NOT NULL COMMENT 'used to subtract from labor',
  `active` int(11) NOT NULL DEFAULT '1',
  `icon` varchar(150) DEFAULT NULL,
  `background_color` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`event_name`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_grouped_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_id` int(11) NOT NULL,
  `job_number` varchar(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4098 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_invoice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_scheduler_id` int(11) NOT NULL,
  `vendor_cost` varchar(255) DEFAULT NULL,
  `invoice` varchar(255) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_number` varchar(255) DEFAULT NULL,
  `invoice_notes` varchar(500) DEFAULT NULL,
  `vendor_inv_number` varchar(255) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(50) DEFAULT NULL,
  `acc_status` varchar(50) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(50) DEFAULT NULL,
  `period` varchar(50) DEFAULT NULL,
  `paperwork_location` varchar(150) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `created_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fs_scheduler_id` (`fs_scheduler_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8201 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `orginal_request_date` date DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `status_id` int(11) DEFAULT NULL,
  `sales_order` varchar(50) DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `service_type_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `property_id` int(11) DEFAULT NULL,
  `sign_theme_id` int(11) DEFAULT NULL,
  `sign_type_id` int(11) DEFAULT NULL,
  `comments` varchar(600) DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `created_date` datetime NOT NULL,
  `created_by` int(11) NOT NULL,
  `vendor_invoice_id` int(11) DEFAULT NULL,
  `acc_status_id` int(11) DEFAULT NULL,
  `platform_id` int(11) DEFAULT NULL,
  `billable` varchar(5) DEFAULT NULL,
  `out_of_state` varchar(5) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `co_number` varchar(50) DEFAULT NULL,
  `markup_id` int(11) DEFAULT NULL,
  `hourly_rate_id` int(11) DEFAULT NULL,
  `overtime_Id` int(11) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(25) DEFAULT NULL,
  `paper_work_location` varchar(10) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(10) DEFAULT NULL,
  `period` varchar(10) DEFAULT NULL,
  `compliance_license_notes` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_job_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(10) NOT NULL,
  `description` varchar(100) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_job_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_scheduler_id` int(11) NOT NULL,
  `comment` longtext NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `name` varchar(150) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_job_connections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_job_id` int(11) NOT NULL,
  `connected_job_id` int(11) NOT NULL,
  `relationship_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Related',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_connection` (`parent_job_id`,`connected_job_id`,`relationship_type`),
  KEY `idx_parent_job` (`parent_job_id`),
  KEY `idx_connected_job` (`connected_job_id`),
  KEY `idx_active` (`active`),
  KEY `idx_relationship_type` (`relationship_type`),
  KEY `idx_created_date` (`created_date`),
  CONSTRAINT `fs_job_connections_ibfk_1` FOREIGN KEY (`parent_job_id`) REFERENCES `fs_scheduler` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fs_job_connections_ibfk_2` FOREIGN KEY (`connected_job_id`) REFERENCES `fs_scheduler` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fs_labor_ext_DELETE` (
  `id` int(11) NOT NULL,
  `workOrderId` int(11) NOT NULL,
  `proj_type` varchar(250) CHARACTER SET utf8mb4 DEFAULT NULL,
  `description` longtext CHARACTER SET utf8mb4,
  `projectStart` datetime DEFAULT NULL,
  `projectFinish` datetime DEFAULT NULL,
  `totalHours` int(11) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(11) DEFAULT NULL,
  `seq` int(11) DEFAULT NULL,
  `brStart` datetime DEFAULT NULL,
  `brEnd` datetime DEFAULT NULL,
  `flight_hrs_delay` varchar(55) CHARACTER SET utf8mb4 DEFAULT NULL,
  `projectStartTz` varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  `projectFinishTz` varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  `timezone_set` int(1) NOT NULL,
  `projectStartTzConvert` datetime DEFAULT NULL,
  `projectFinishTzConvert` datetime DEFAULT NULL,
  `timeDifference` time DEFAULT NULL,
  `timeDifferenceMins` bigint(21) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_licensed_techs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_licensed_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` text,
  `licensed_required` varchar(50) DEFAULT NULL,
  `expired_date` text,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `fs_licensed_id` (`fs_licensed_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=573 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_license_property` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property` varchar(150) DEFAULT NULL,
  `address1` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(15) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `property_phone` text,
  `active` int(11) DEFAULT '1',
  `notes` text,
  `license_required` varchar(50) DEFAULT NULL,
  `license_expired_date` varchar(50) DEFAULT NULL,
  `created_by` text,
  `created_date` text,
  `website` mediumtext,
  `documents_required` text,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=262 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_mstr` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5853 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_non_billable_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(300) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  `code` int(11) DEFAULT NULL,
  `active` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_parts_order` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `oem` varchar(50) DEFAULT NULL,
  `casino_name` varchar(50) DEFAULT NULL,
  `shipping_method` varchar(150) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `contact_name` varchar(50) DEFAULT NULL,
  `contact_phone_number` varchar(50) DEFAULT NULL,
  `billable` varchar(50) DEFAULT NULL,
  `part_number` varchar(50) DEFAULT NULL,
  `part_qty` varchar(50) DEFAULT NULL,
  `instructions` varchar(2500) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_date` varchar(50) DEFAULT NULL,
  `so_number` varchar(50) DEFAULT NULL,
  `tracking_number` text,
  `tracking_number_carrier` text,
  `arrival_date` date DEFAULT NULL,
  `ship_via_account` varchar(50) DEFAULT NULL,
  `return_tracking_number` text,
  `return_tracking_number_carrier` text,
  `serial_number` text,
  `contact_email` text,
  `details` json DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `so_number` (`so_number`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_platforms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `configuration` varchar(200) DEFAULT NULL,
  `theme` varchar(200) DEFAULT NULL,
  `etc` decimal(10,2) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `platform` varchar(500) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4103 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_platform_avg_view` (
  `platform` varchar(250) CHARACTER SET utf8 DEFAULT NULL,
  `service_type` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `total_mins` decimal(65,0) DEFAULT NULL,
  `avg_mins` decimal(46,2) DEFAULT NULL,
  `jobs` bigint(21) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_preferred` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property` varchar(255) NOT NULL,
  `address1` varchar(300) NOT NULL,
  `address2` varchar(300) NOT NULL,
  `city` varchar(150) NOT NULL,
  `state` varchar(150) NOT NULL,
  `zip_code` varchar(20) NOT NULL,
  `country` varchar(100) NOT NULL,
  `property_phone` varchar(15) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_property` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property` varchar(255) NOT NULL,
  `address1` varchar(300) NOT NULL,
  `address2` varchar(300) NOT NULL,
  `city` varchar(150) NOT NULL,
  `state` varchar(150) NOT NULL,
  `zip_code` varchar(20) NOT NULL,
  `country` varchar(100) NOT NULL,
  `fs_scheduler_id` int(11) NOT NULL,
  `property_phone` varchar(15) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `out_of_town` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `property` (`property`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_property_det` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property` varchar(150) DEFAULT NULL,
  `address1` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(15) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `fs_customer_id` int(11) DEFAULT NULL,
  `property_phone` varchar(15) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `lat` varchar(255) DEFAULT NULL,
  `lon` varchar(255) DEFAULT NULL,
  `out_of_town` varchar(10) DEFAULT NULL,
  `license_notes` varchar(800) DEFAULT NULL,
  `license_required` varchar(50) DEFAULT NULL,
  `zone_code` varchar(50) DEFAULT NULL,
  `notes` varchar(800) DEFAULT NULL,
  `license_expired_date` varchar(50) DEFAULT NULL,
  `licensed_techs` text,
  `created_by` text,
  `created_date` text,
  `compliance_name` varchar(250) DEFAULT NULL,
  `compliance_address1` varchar(250) DEFAULT NULL,
  `compliance_address2` varchar(250) DEFAULT NULL,
  `compliance_city` varchar(250) DEFAULT NULL,
  `compliance_state` varchar(250) DEFAULT NULL,
  `compliance_zip_code` varchar(250) DEFAULT NULL,
  `compliance_website` mediumtext,
  `compliance_phone_numbers` mediumtext,
  `fs_licensed_id` text,
  `equipment_drop_off_location` text,
  PRIMARY KEY (`id`),
  KEY `fs_customer_id` (`fs_customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2196 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_property_det_original` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property` varchar(150) DEFAULT NULL,
  `address1` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(15) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `fs_customer_id` int(11) DEFAULT NULL,
  `property_phone` varchar(15) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `latitude` int(255) DEFAULT NULL,
  `longitude` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1418 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_property_det_original_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property` varchar(150) DEFAULT NULL,
  `address1` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(15) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `fs_customer_id` int(11) DEFAULT NULL,
  `property_phone` varchar(15) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lat` varchar(255) DEFAULT NULL,
  `lon` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1418 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_property_lat_and_lon` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_property_det_id` int(11) NOT NULL,
  `lat` varchar(255) NOT NULL,
  `lon` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1772 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_property_ref` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_scheduler_id` int(11) NOT NULL,
  `fs_property_det_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `fs_scheduler_id` (`fs_scheduler_id`),
  KEY `fs_property_det_id` (`fs_property_det_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4108 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_qad_properties` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `_addr` varchar(8) DEFAULT NULL,
  `ad_name` varchar(36) DEFAULT NULL,
  `ad_line1` varchar(36) DEFAULT NULL,
  `ad_line2` varchar(36) DEFAULT NULL,
  `ad_city` varchar(20) DEFAULT NULL,
  `ad_state` varchar(4) DEFAULT NULL,
  `ad_zip` varchar(10) DEFAULT NULL,
  `ad_type` varchar(8) DEFAULT NULL,
  `ad_attn` varchar(20) DEFAULT NULL,
  `ad_phone` varchar(20) DEFAULT NULL,
  `ad_ext` varchar(10) DEFAULT NULL,
  `ad_ref` varchar(8) DEFAULT NULL,
  `ad_sort` varchar(28) DEFAULT NULL,
  `ad_country` varchar(14) DEFAULT NULL,
  `ad_attn2` varchar(14) DEFAULT NULL,
  `ad_phone2` varchar(14) DEFAULT NULL,
  `ad_ext2` varchar(10) DEFAULT NULL,
  `ad_fax` varchar(20) DEFAULT NULL,
  `ad_fax2` varchar(10) DEFAULT NULL,
  `ad_line3` varchar(36) DEFAULT NULL,
  `ad_user1` varchar(10) DEFAULT NULL,
  `ad_user2` varchar(10) DEFAULT NULL,
  `ad_lang` varchar(2) DEFAULT NULL,
  `ad_pst_id` varchar(5) DEFAULT NULL,
  `ad_date` varchar(10) DEFAULT NULL,
  `ad_county` varchar(10) DEFAULT NULL,
  `ad_temp` int(1) DEFAULT NULL,
  `ad_bk_acct1` varchar(10) DEFAULT NULL,
  `ad_bk_acct2` varchar(10) DEFAULT NULL,
  `ad_format` int(1) DEFAULT NULL,
  `ad_vat_reg` varchar(10) DEFAULT NULL,
  `ad_coc_reg` varchar(10) DEFAULT NULL,
  `ad_gst_id` varchar(13) DEFAULT NULL,
  `ad_tax_type` varchar(10) DEFAULT NULL,
  `ad_taxc` varchar(10) DEFAULT NULL,
  `ad_taxable` int(1) DEFAULT NULL,
  `ad_tax_in` int(1) DEFAULT NULL,
  `ad_conrep` varchar(10) DEFAULT NULL,
  `ad_edi_tpid` varchar(10) DEFAULT NULL,
  `ad_edi_ctrl` varchar(4) DEFAULT NULL,
  `ad_timezone` varchar(10) DEFAULT NULL,
  `ad_userid` varchar(8) DEFAULT NULL,
  `ad_mod_date` varchar(10) DEFAULT NULL,
  `ad_edi_id` varchar(10) DEFAULT NULL,
  `ad_barlbl_prt` varchar(10) DEFAULT NULL,
  `ad_barlbl_val` varchar(10) DEFAULT NULL,
  `ad_calendar` varchar(10) DEFAULT NULL,
  `ad_edi_std` varchar(10) DEFAULT NULL,
  `ad_edi_level` varchar(10) DEFAULT NULL,
  `ad__qad01` varchar(1) DEFAULT NULL,
  `ad__qad02` varchar(10) DEFAULT NULL,
  `ad__qad03` varchar(10) DEFAULT NULL,
  `ad__qad04` varchar(10) DEFAULT NULL,
  `ad__qad05` varchar(10) DEFAULT NULL,
  `ad__chr01` varchar(10) DEFAULT NULL,
  `ad__chr02` varchar(10) DEFAULT NULL,
  `ad__chr03` varchar(10) DEFAULT NULL,
  `ad__chr04` varchar(10) DEFAULT NULL,
  `ad__chr05` varchar(10) DEFAULT NULL,
  `ad_tp_loc_code` varchar(10) DEFAULT NULL,
  `ad_ctry` varchar(3) DEFAULT NULL,
  `ad_tax_zone` varchar(11) DEFAULT NULL,
  `ad_tax_usage` varchar(10) DEFAULT NULL,
  `ad_misc1_id` varchar(15) DEFAULT NULL,
  `ad_misc2_id` varchar(10) DEFAULT NULL,
  `ad_misc3_id` varchar(10) DEFAULT NULL,
  `ad_wk_offset` int(1) DEFAULT NULL,
  `ad_inv_mthd` varchar(10) DEFAULT NULL,
  `ad_sch_mthd` varchar(10) DEFAULT NULL,
  `ad_po_mthd` varchar(10) DEFAULT NULL,
  `ad_asn_data` varchar(10) DEFAULT NULL,
  `ad_intr_division` varchar(10) DEFAULT NULL,
  `ad_tax_report` int(1) DEFAULT NULL,
  `ad_name_control` varchar(10) DEFAULT NULL,
  `ad_last_file` int(1) DEFAULT NULL,
  `ad_domain` varchar(3) DEFAULT NULL,
  `oid_ad_mstr` bigint(18) DEFAULT NULL,
  `ad_email` varchar(35) DEFAULT NULL,
  `ad_email2` varchar(29) DEFAULT NULL,
  `ad_priority` varchar(10) DEFAULT NULL,
  `ad_route` varchar(10) DEFAULT NULL,
  `ad_loadseq` varchar(10) DEFAULT NULL,
  `ad_pick_by_date` int(1) DEFAULT NULL,
  `ad_profile` varchar(10) DEFAULT NULL,
  `ad_tax_in_city` int(1) DEFAULT NULL,
  `ad_ns_pr_list` varchar(10) DEFAULT NULL,
  `ad_address_id` int(8) DEFAULT NULL,
  `ad_bus_relation` varchar(20) DEFAULT NULL,
  `ad_alt_um` varchar(10) DEFAULT NULL,
  `ad_city_code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3224 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_qir` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` varchar(800) DEFAULT NULL,
  `work_order_id` int(11) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_qt_det` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qt_det_name` varchar(250) NOT NULL,
  `qt_det_desc` varchar(250) DEFAULT NULL,
  `qt_det_qty` int(11) NOT NULL DEFAULT '0',
  `qt_det_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `qt_det_attachment` varchar(255) DEFAULT NULL,
  `qt_det_type` varchar(100) DEFAULT NULL,
  `qt_det_created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `qt_det_created_by` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_quotes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `rate_opportunity` int(11) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `sub_total` decimal(15,2) DEFAULT NULL,
  `discount_rate` decimal(10,2) DEFAULT NULL,
  `discount_rate_symbol` varchar(10) DEFAULT NULL,
  `tax_rate` int(11) DEFAULT NULL,
  `tax_rate_name` varchar(15) DEFAULT NULL,
  `deposit_rate` decimal(12,2) DEFAULT NULL,
  `deposit_rate_symbol` varchar(10) DEFAULT NULL,
  `total` decimal(25,2) DEFAULT NULL,
  `client_message` varchar(500) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT '1',
  `created_by` int(11) DEFAULT NULL,
  `discount_active` int(11) DEFAULT NULL,
  `discount_total` decimal(15,2) DEFAULT NULL,
  `tax_rate_amount` decimal(20,2) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL,
  `tax_rate_active` int(11) DEFAULT '0',
  `property_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type_of_service` varchar(150) DEFAULT NULL,
  `date_of_service` date DEFAULT NULL,
  `dateAndTime` varchar(150) DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `so_number` varchar(150) DEFAULT NULL,
  `customer_co_number` varchar(150) DEFAULT NULL,
  `type_of_sign` varchar(500) DEFAULT NULL,
  `eyefi_customer_sign_part` varchar(150) DEFAULT NULL,
  `sign_theme` varchar(150) DEFAULT NULL,
  `onsite_customer_name` varchar(150) DEFAULT NULL,
  `onsite_customer_phone_number` varchar(150) DEFAULT NULL,
  `property` varchar(150) DEFAULT NULL,
  `lat` mediumtext,
  `lon` mediumtext,
  `address1` varchar(300) DEFAULT NULL,
  `address2` varchar(150) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `city` varchar(150) DEFAULT NULL,
  `zip` varchar(150) DEFAULT NULL,
  `licensing_required` varchar(11) DEFAULT NULL,
  `ceiling_height` varchar(150) DEFAULT NULL,
  `bolt_to_floor` varchar(11) DEFAULT NULL,
  `special_instruction` varchar(2000) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `requested_by` varchar(150) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `email` varchar(400) DEFAULT NULL,
  `token` varchar(500) DEFAULT NULL,
  `sign_jacks` varchar(10) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `gRecaptchaResponse` longtext,
  `subject` text,
  `cc_email` varchar(900) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `cancellation_reason` varchar(150) DEFAULT NULL,
  `cancellation_notes` text,
  `canceled_by` int(11) DEFAULT NULL,
  `canceled_by_name` varchar(150) DEFAULT NULL,
  `canceled_at` datetime DEFAULT NULL,
  `sign_manufacture` text,
  `customer_product_number` text,
  `site_survey_requested` varchar(50) DEFAULT NULL,
  `email_sent` int(11) DEFAULT '0',
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fs_request_canceled_at` (`canceled_at`),
  KEY `idx_fs_request_active_canceled` (`active`,`canceled_at`)
) ENGINE=InnoDB AUTO_INCREMENT=1172 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `property_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `details` varchar(555) NOT NULL,
  `available_date` date DEFAULT NULL,
  `another_available_date` date DEFAULT NULL,
  `arrival_times` varchar(255) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT '1',
  `status_id` varchar(150) DEFAULT NULL,
  `token` longtext NOT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `property_id` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_request_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type_of_service` varchar(150) DEFAULT NULL,
  `date_of_service` date DEFAULT NULL,
  `dateAndTime` varchar(150) DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `so_number` varchar(150) DEFAULT NULL,
  `customer_co_number` varchar(150) DEFAULT NULL,
  `type_of_sign` varchar(150) DEFAULT NULL,
  `eyefi_customer_sign_part` varchar(150) DEFAULT NULL,
  `sign_theme` varchar(150) DEFAULT NULL,
  `onsite_customer_name` varchar(150) DEFAULT NULL,
  `onsite_customer_phone_number` varchar(150) DEFAULT NULL,
  `property` varchar(150) DEFAULT NULL,
  `address1` varchar(300) DEFAULT NULL,
  `address2` varchar(150) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `city` varchar(150) DEFAULT NULL,
  `zip` varchar(150) DEFAULT NULL,
  `licensing_required` varchar(11) DEFAULT NULL,
  `ceiling_height` varchar(150) DEFAULT NULL,
  `bolt_to_floor` varchar(11) DEFAULT NULL,
  `special_instruction` varchar(2000) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `requested_by` varchar(150) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `email` varchar(400) DEFAULT NULL,
  `token` varchar(500) DEFAULT NULL,
  `sign_jacks` varchar(10) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `gRecaptchaResponse` longtext,
  `subject` varchar(200) DEFAULT NULL,
  `cc_email` varchar(900) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `sign_manufacture` text,
  `customer_product_number` text,
  `site_survey_requested` varchar(50) DEFAULT NULL,
  `email_sent` int(11) DEFAULT '0',
  `created_by` int(11) DEFAULT NULL,
  `lat` mediumtext,
  `lon` mediumtext,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=295 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_scheduler` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) DEFAULT NULL,
  `created_date` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `group_id` int(255) DEFAULT NULL,
  `connecting_jobs` json DEFAULT NULL,
  `turnover_fsid` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `start_time` varchar(50) DEFAULT NULL,
  `requested_by` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sales_order_number` varchar(100) DEFAULT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `out_of_state` varchar(6) DEFAULT 'false',
  `sign_theme` varchar(100) DEFAULT NULL,
  `sign_type` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `comments` longtext,
  `notes` longtext,
  `vendor_cost` varchar(150) DEFAULT NULL,
  `invoice` varchar(50) DEFAULT NULL,
  `invoice_date` varchar(500) DEFAULT NULL,
  `invoice_number` varchar(150) DEFAULT NULL,
  `invoice_notes` mediumtext,
  `vendor_inv_number` varchar(150) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(10) DEFAULT NULL,
  `paper_work_location` varchar(50) DEFAULT NULL,
  `acc_status` varchar(150) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(20) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `billable` varchar(7) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `co_number` varchar(250) DEFAULT NULL,
  `customer_cancelled` varchar(150) DEFAULT NULL,
  `cancellation_comments` varchar(450) DEFAULT NULL,
  `cancelled_type` varchar(150) DEFAULT NULL,
  `mark_up_percent` int(11) DEFAULT NULL,
  `ef_hourly_rate` varchar(40) DEFAULT NULL,
  `ef_overtime_hourly_rate` varchar(50) DEFAULT NULL,
  `compliance_license_notes` varchar(800) DEFAULT NULL,
  `published` int(1) DEFAULT '0',
  `property_id` int(11) DEFAULT NULL,
  `queue` varchar(100) DEFAULT NULL,
  `queus_status` varchar(150) DEFAULT NULL,
  `title` varchar(150) DEFAULT NULL,
  `schedule_later` int(11) DEFAULT '0',
  `non_billable_code` int(11) DEFAULT NULL,
  `property` varchar(250) DEFAULT NULL,
  `fs_lat` text,
  `fs_lon` text,
  `address1` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `city` varchar(250) DEFAULT NULL,
  `state` varchar(250) DEFAULT NULL,
  `zip_code` varchar(250) DEFAULT NULL,
  `country` varchar(250) DEFAULT NULL,
  `property_phone` varchar(50) DEFAULT NULL,
  `sign_responsibility` varchar(10) DEFAULT NULL,
  `fs_calendar_id` int(11) DEFAULT NULL,
  `onsite_customer_name` varchar(50) DEFAULT NULL,
  `onsite_customer_phone_number` varchar(50) DEFAULT NULL,
  `licensing_required` varchar(11) DEFAULT NULL,
  `ceiling_height` varchar(150) DEFAULT NULL,
  `bolt_to_floor` varchar(11) DEFAULT NULL,
  `sign_jacks` varchar(50) DEFAULT NULL,
  `site_survey_requested` varchar(50) DEFAULT NULL,
  `per_tech_rate` decimal(20,6) DEFAULT NULL,
  `per_tech_rate_ot` decimal(20,6) DEFAULT NULL,
  `original_request_date` varchar(100) DEFAULT NULL,
  `notice_email_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`),
  KEY `request_id` (`request_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7832 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_schedulerTest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `group_id` int(255) DEFAULT NULL,
  `turnover_fsid` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `original_request_date` date DEFAULT NULL,
  `start_time` varchar(50) DEFAULT NULL,
  `requested_by` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sales_order_number` varchar(100) DEFAULT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `out_of_state` varchar(6) DEFAULT 'false',
  `sign_theme` varchar(100) DEFAULT NULL,
  `sign_type` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `notes` varchar(1200) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vendor_cost` varchar(150) DEFAULT NULL,
  `invoice` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_number` varchar(150) DEFAULT NULL,
  `invoice_notes` varchar(800) DEFAULT NULL,
  `vendor_inv_number` varchar(150) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(10) DEFAULT NULL,
  `paper_work_location` varchar(50) DEFAULT NULL,
  `acc_status` varchar(150) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(20) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `billable` varchar(7) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `co_number` varchar(250) DEFAULT NULL,
  `customer_cancelled` varchar(150) DEFAULT NULL,
  `cancellation_comments` varchar(450) DEFAULT NULL,
  `cancelled_type` varchar(150) DEFAULT NULL,
  `mark_up_percent` int(11) DEFAULT NULL,
  `ef_hourly_rate` varchar(40) DEFAULT NULL,
  `ef_overtime_hourly_rate` varchar(50) DEFAULT NULL,
  `compliance_license_notes` varchar(800) DEFAULT NULL,
  `published` int(1) NOT NULL DEFAULT '0',
  `property_id` int(11) DEFAULT NULL,
  `queue` int(11) DEFAULT NULL,
  `title` varchar(150) DEFAULT NULL,
  `schedule_later` int(11) NOT NULL DEFAULT '0',
  `non_billable_code` int(11) DEFAULT NULL,
  `property` varchar(250) DEFAULT NULL,
  `address1` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `city` varchar(250) DEFAULT NULL,
  `state` varchar(250) DEFAULT NULL,
  `zip_code` varchar(250) DEFAULT NULL,
  `country` varchar(250) DEFAULT NULL,
  `property_phone` varchar(50) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL,
  `sign_responsibility` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5493 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_scheduler_platforms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(250) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `timeToComplete` int(11) DEFAULT NULL COMMENT 'By Mins',
  `timeToComplete1` int(11) NOT NULL DEFAULT '0',
  `active` int(1) NOT NULL DEFAULT '1',
  `createdBy` int(11) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_scheduler_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(500) NOT NULL,
  `value` varchar(250) NOT NULL,
  `work_order_labor_type` int(11) DEFAULT NULL,
  `work_order_labor_calculate` int(11) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `calculateTime` int(11) DEFAULT '0',
  `statusColor` varchar(50) DEFAULT NULL,
  `typeOfStatus` varchar(150) NOT NULL,
  `cost` int(11) NOT NULL DEFAULT '0',
  `receipt_value` int(11) NOT NULL DEFAULT '0',
  `color` varchar(50) DEFAULT NULL,
  `border_color` varchar(30) DEFAULT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `value` (`value`)
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_scheduler_tech_scheduler` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date_from` varchar(50) NOT NULL,
  `date_to` varchar(50) NOT NULL,
  `token` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `date_from` (`date_from`),
  UNIQUE KEY `date_to` (`date_to`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_scheduler_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(255) DEFAULT NULL,
  `turnover_fsid` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `original_request_date` date DEFAULT NULL,
  `start_time` varchar(50) DEFAULT NULL,
  `requested_by` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sales_order_number` varchar(100) DEFAULT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `out_of_state` varchar(6) DEFAULT 'false',
  `address` varchar(250) DEFAULT NULL,
  `property_phone_number` varchar(15) DEFAULT NULL,
  `property` varchar(100) DEFAULT NULL,
  `location` varchar(50) DEFAULT NULL,
  `state` varchar(10) DEFAULT NULL,
  `zip_code` varchar(15) DEFAULT NULL,
  `sign_theme` varchar(100) DEFAULT NULL,
  `sign_type` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `notes` varchar(1200) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vendor_cost` varchar(150) DEFAULT NULL,
  `invoice` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_number` varchar(150) DEFAULT NULL,
  `invoice_notes` varchar(800) DEFAULT NULL,
  `vendor_inv_number` varchar(150) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(10) DEFAULT NULL,
  `paper_work_location` varchar(50) DEFAULT NULL,
  `acc_status` varchar(150) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(20) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `billable` varchar(7) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `co_number` varchar(250) DEFAULT NULL,
  `customer_cancelled` varchar(150) DEFAULT NULL,
  `cancellation_comments` varchar(450) DEFAULT NULL,
  `cancelled_type` varchar(150) DEFAULT NULL,
  `mark_up_percent` int(11) DEFAULT NULL,
  `ef_hourly_rate` varchar(40) DEFAULT NULL,
  `ef_overtime_hourly_rate` varchar(50) DEFAULT NULL,
  `compliance_license_notes` varchar(800) DEFAULT NULL,
  `published` int(1) NOT NULL DEFAULT '0',
  `property_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4616 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_scheduler_v2` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(255) DEFAULT NULL,
  `turnover_fsid` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `original_request_date` date DEFAULT NULL,
  `start_time` varchar(50) DEFAULT NULL,
  `requested_by` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sales_order_number` varchar(100) DEFAULT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `out_of_state` varchar(6) DEFAULT 'false',
  `address` varchar(250) DEFAULT NULL,
  `property_phone_number` varchar(15) DEFAULT NULL,
  `property` varchar(100) DEFAULT NULL,
  `location` varchar(50) DEFAULT NULL,
  `state` varchar(10) DEFAULT NULL,
  `zip_code` varchar(15) DEFAULT NULL,
  `sign_theme` varchar(100) DEFAULT NULL,
  `sign_type` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `notes` varchar(1200) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vendor_cost` varchar(150) DEFAULT NULL,
  `invoice` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_number` varchar(150) DEFAULT NULL,
  `invoice_notes` varchar(800) DEFAULT NULL,
  `vendor_inv_number` varchar(150) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(10) DEFAULT NULL,
  `paper_work_location` varchar(50) DEFAULT NULL,
  `acc_status` varchar(150) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(20) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `billable` varchar(7) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `co_number` varchar(250) DEFAULT NULL,
  `customer_cancelled` varchar(150) DEFAULT NULL,
  `cancellation_comments` varchar(450) DEFAULT NULL,
  `cancelled_type` varchar(150) DEFAULT NULL,
  `mark_up_percent` int(11) DEFAULT NULL,
  `ef_hourly_rate` varchar(40) DEFAULT NULL,
  `ef_overtime_hourly_rate` varchar(50) DEFAULT NULL,
  `compliance_license_notes` varchar(800) DEFAULT NULL,
  `published` int(1) NOT NULL DEFAULT '0',
  `property_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4617 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_scheduler_v3` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(255) DEFAULT NULL,
  `turnover_fsid` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `original_request_date` date DEFAULT NULL,
  `start_time` varchar(50) DEFAULT NULL,
  `requested_by` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sales_order_number` varchar(100) DEFAULT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `out_of_state` varchar(6) DEFAULT 'false',
  `sign_theme` varchar(100) DEFAULT NULL,
  `sign_type` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `notes` varchar(1200) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vendor_cost` varchar(150) DEFAULT NULL,
  `invoice` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_number` varchar(150) DEFAULT NULL,
  `invoice_notes` varchar(800) DEFAULT NULL,
  `vendor_inv_number` varchar(150) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(10) DEFAULT NULL,
  `paper_work_location` varchar(50) DEFAULT NULL,
  `acc_status` varchar(150) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(20) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `billable` varchar(7) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `co_number` varchar(250) DEFAULT NULL,
  `customer_cancelled` varchar(150) DEFAULT NULL,
  `cancellation_comments` varchar(450) DEFAULT NULL,
  `cancelled_type` varchar(150) DEFAULT NULL,
  `mark_up_percent` int(11) DEFAULT NULL,
  `ef_hourly_rate` varchar(40) DEFAULT NULL,
  `ef_overtime_hourly_rate` varchar(50) DEFAULT NULL,
  `compliance_license_notes` varchar(800) DEFAULT NULL,
  `published` int(1) NOT NULL DEFAULT '0',
  `property_id` int(11) DEFAULT NULL,
  `queue` int(11) DEFAULT NULL,
  `title` varchar(150) DEFAULT NULL,
  `schedule_later` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5180 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_scheduler_v4` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(255) DEFAULT NULL,
  `turnover_fsid` int(11) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `original_request_date` date DEFAULT NULL,
  `start_time` varchar(50) DEFAULT NULL,
  `requested_by` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sales_order_number` varchar(100) DEFAULT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `customer` varchar(50) DEFAULT NULL,
  `out_of_state` varchar(6) DEFAULT 'false',
  `sign_theme` varchar(100) DEFAULT NULL,
  `sign_type` varchar(50) DEFAULT NULL,
  `platform` varchar(250) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `notes` varchar(1200) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vendor_cost` varchar(150) DEFAULT NULL,
  `invoice` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_number` varchar(150) DEFAULT NULL,
  `invoice_notes` varchar(800) DEFAULT NULL,
  `vendor_inv_number` varchar(150) DEFAULT NULL,
  `billable_flat_rate_or_po` varchar(10) DEFAULT NULL,
  `paper_work_location` varchar(50) DEFAULT NULL,
  `acc_status` varchar(150) DEFAULT NULL,
  `contractor_inv_sent_to_ap` varchar(20) DEFAULT NULL,
  `period` varchar(20) DEFAULT NULL,
  `billable` varchar(7) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `co_number` varchar(250) DEFAULT NULL,
  `customer_cancelled` varchar(150) DEFAULT NULL,
  `cancellation_comments` varchar(450) DEFAULT NULL,
  `cancelled_type` varchar(150) DEFAULT NULL,
  `mark_up_percent` int(11) DEFAULT NULL,
  `ef_hourly_rate` varchar(40) DEFAULT NULL,
  `ef_overtime_hourly_rate` varchar(50) DEFAULT NULL,
  `compliance_license_notes` varchar(800) DEFAULT NULL,
  `published` int(1) NOT NULL DEFAULT '0',
  `property_id` int(11) DEFAULT NULL,
  `queue` int(11) DEFAULT NULL,
  `title` varchar(150) DEFAULT NULL,
  `schedule_later` int(11) NOT NULL DEFAULT '0',
  `non_billable_code` int(11) DEFAULT NULL,
  `property` varchar(250) DEFAULT NULL,
  `address1` varchar(250) DEFAULT NULL,
  `address2` varchar(250) DEFAULT NULL,
  `city` varchar(250) DEFAULT NULL,
  `state` varchar(250) DEFAULT NULL,
  `zip_code` varchar(250) DEFAULT NULL,
  `country` varchar(250) DEFAULT NULL,
  `out_of_town` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `property_id` (`property_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5362 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_service_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `description` varchar(200) NOT NULL,
  `font_color` varchar(40) NOT NULL,
  `background_color` varchar(40) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(100) NOT NULL,
  `value` varchar(100) DEFAULT NULL,
  `background_color` varchar(50) DEFAULT NULL,
  `text_color` varchar(50) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `etc` decimal(10,2) DEFAULT NULL COMMENT 'Used for platforms',
  `image` varchar(100) DEFAULT NULL COMMENT 'used for customers',
  `description` varchar(200) DEFAULT NULL,
  `default` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=302 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_settings_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `columns` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_settings_columns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_settings_id` int(11) NOT NULL,
  `column_name` varchar(100) DEFAULT NULL,
  `column_value` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status_category` varchar(100) NOT NULL,
  `status_name` varchar(150) NOT NULL,
  `status_description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_status_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `font_color` varchar(40) NOT NULL,
  `background_color` varchar(40) NOT NULL,
  `description` varchar(200) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_summary_DELETE` (
  `workOrderId` int(11) NOT NULL,
  `START` datetime DEFAULT NULL,
  `END` datetime DEFAULT NULL,
  `hrs` bigint(20) DEFAULT NULL,
  `TYPE` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_type` varchar(250) CHARACTER SET utf8mb4 DEFAULT NULL,
  `break` bigint(20) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_team` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_det_id` int(11) NOT NULL,
  `user` varchar(100) NOT NULL,
  `user_rate` decimal(10,2) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lead_tech` varchar(11) DEFAULT '0',
  `contractor_code` varchar(150) DEFAULT NULL,
  `user_rate_ot` decimal(20,6) DEFAULT NULL,
  `outside` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ticket_verified` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fs_det_id` (`fs_det_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=50906 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_teamTest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_det_id` int(11) NOT NULL,
  `user` varchar(100) NOT NULL,
  `user_rate` decimal(10,2) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lead_tech` varchar(11) DEFAULT '0',
  `contractor_code` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fs_det_id` (`fs_det_id`),
  KEY `fs_det_id_2` (`fs_det_id`),
  KEY `fs_det_id_3` (`fs_det_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32023 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_team_copy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_det_id` int(11) NOT NULL,
  `user` varchar(100) NOT NULL,
  `user_rate` decimal(10,2) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lead_tech` varchar(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fs_det_id` (`fs_det_id`),
  KEY `fs_det_id_2` (`fs_det_id`),
  KEY `fs_det_id_3` (`fs_det_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20991 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_team_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_det_id` int(11) NOT NULL,
  `user` varchar(100) NOT NULL,
  `user_rate` decimal(10,2) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lead_tech` varchar(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fs_det_id` (`fs_det_id`),
  KEY `fs_det_id_2` (`fs_det_id`),
  KEY `fs_det_id_3` (`fs_det_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26380 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_team_v2` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_det_id` int(11) NOT NULL,
  `user` varchar(100) NOT NULL,
  `user_rate` decimal(10,2) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lead_tech` varchar(11) DEFAULT '0',
  `contractor_code` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fs_det_id` (`fs_det_id`),
  KEY `fs_det_id_2` (`fs_det_id`),
  KEY `fs_det_id_3` (`fs_det_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38675 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_team_v3` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_det_id` int(11) NOT NULL,
  `user` varchar(100) NOT NULL,
  `user_rate` decimal(10,2) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `lead_tech` varchar(11) DEFAULT '0',
  `contractor_code` varchar(150) DEFAULT NULL,
  `user_rate_ot` decimal(20,6) DEFAULT NULL,
  `outside` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fs_det_id` (`fs_det_id`) USING BTREE,
  KEY `fs_det_id_2` (`fs_det_id`) USING BTREE,
  KEY `fs_det_id_3` (`fs_det_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=40959 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_tech_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(80) NOT NULL,
  `fs_id` int(11) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tech_rate` decimal(10,2) NOT NULL,
  `lead_tech` tinyint(1) DEFAULT NULL,
  `contractor_code` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8554 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_tech_rates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `rate` decimal(10,2) NOT NULL,
  `rate_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_time_line_DELETE` (
  `workOrderId` int(11) NOT NULL,
  `start` datetime DEFAULT NULL,
  `end` datetime DEFAULT NULL,
  `hrs` int(11) DEFAULT NULL,
  `type` varchar(9) CHARACTER SET utf8mb4 NOT NULL,
  `project_type` varchar(250) CHARACTER SET utf8mb4 DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_travel_det` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fsId` int(11) DEFAULT NULL,
  `fs_travel_header_id` text,
  `address_name` varchar(250) DEFAULT NULL,
  `address` varchar(250) DEFAULT NULL,
  `address1` varchar(250) DEFAULT NULL,
  `city` varchar(250) DEFAULT NULL,
  `state` varchar(250) DEFAULT NULL,
  `zip_code` varchar(250) DEFAULT NULL,
  `confirmation` varchar(250) DEFAULT NULL,
  `start_datetime` varchar(250) DEFAULT NULL,
  `end_datetime` varchar(250) DEFAULT NULL,
  `start_datetime_name` varchar(250) DEFAULT NULL,
  `end_datetime_name` varchar(250) DEFAULT NULL,
  `type_of_travel` varchar(50) DEFAULT NULL,
  `rental_car_driver` varchar(50) DEFAULT NULL,
  `flight_in` varchar(50) DEFAULT NULL,
  `flight_out` varchar(50) DEFAULT NULL,
  `location_name` varchar(100) DEFAULT NULL,
  `airline_name` varchar(100) DEFAULT NULL,
  `notes` text,
  `email_sent` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fsId` (`fsId`)
) ENGINE=InnoDB AUTO_INCREMENT=1354 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_travel_header` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fsId` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=252 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_trip_expense_assign` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_id` varchar(100) NOT NULL,
  `transaction_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8553 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_trip_expense_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Date_Submitted_to_AP` varchar(100) DEFAULT NULL,
  `Transaction_ID` varchar(200) DEFAULT NULL,
  `Transaction_Date` varchar(200) DEFAULT NULL,
  `Post_Date` varchar(200) DEFAULT NULL,
  `Transaction_Amount` varchar(200) DEFAULT NULL,
  `Account_Number` varchar(200) DEFAULT NULL,
  `Cardholder_Last_Name` varchar(200) DEFAULT NULL,
  `Cardholder_First_Name` varchar(200) DEFAULT NULL,
  `Original_Merchant_Name` varchar(200) DEFAULT NULL,
  `Purchase_Type` varchar(200) DEFAULT NULL,
  `Receipt_Rcvd` varchar(200) DEFAULT NULL,
  `Receipt_Verified` varchar(200) DEFAULT NULL,
  `FSID1` varchar(100) DEFAULT NULL,
  `FSID2` varchar(100) DEFAULT NULL,
  `FSID3` varchar(100) DEFAULT NULL,
  `FSID4` varchar(100) DEFAULT NULL,
  `FSID5` varchar(100) DEFAULT NULL,
  `FSID6` varchar(100) DEFAULT NULL,
  `FSID7` varchar(100) DEFAULT NULL,
  `FSID8` varchar(100) DEFAULT NULL,
  `FSID9` varchar(100) DEFAULT NULL,
  `Acct_Has` varchar(150) DEFAULT NULL,
  `In_Job` varchar(150) DEFAULT NULL,
  `email_sent` datetime DEFAULT NULL,
  `reason_code` varchar(150) DEFAULT NULL,
  `Job_Date` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Transaction_ID` (`Transaction_ID`),
  KEY `Transaction_ID_2` (`Transaction_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=6380 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `fs_trip_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(100) NOT NULL,
  `description` varchar(100) NOT NULL,
  `accounting_code` varchar(50) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `icon` varchar(255) DEFAULT NULL,
  `background_color` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_userTrans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  `uniqueId` int(11) DEFAULT NULL,
  `type` varchar(100) NOT NULL,
  `reasonCode` varchar(150) DEFAULT NULL,
  `workOrderId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=52174 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fs_vat_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `tax_name` varchar(200) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `tax_description` varchar(300) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `prime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_vendors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `active` int(11) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_workOrder` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_scheduler_id` int(11) DEFAULT NULL,
  `customerName1` varchar(150) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `type1` varchar(50) DEFAULT NULL,
  `type2` varchar(50) DEFAULT NULL,
  `type4` varchar(50) DEFAULT NULL,
  `signature` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `survey` varchar(10) DEFAULT 'No',
  `email` varchar(150) DEFAULT NULL,
  `workCompleted` varchar(5) DEFAULT 'No',
  `workCompletedComment` longtext,
  `sendResults` varchar(5) DEFAULT 'No',
  `techSignature` varchar(150) DEFAULT NULL,
  `dateSigned` datetime DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `submitted` int(1) DEFAULT '0',
  `dateSubmitted` datetime DEFAULT NULL,
  `techName` varchar(200) DEFAULT NULL,
  `comments` longtext,
  `accept` varchar(10) DEFAULT 'false',
  `workCompletedDate` datetime DEFAULT NULL,
  `flightDelayed` varchar(5) DEFAULT '',
  `hrsDelayed` int(11) DEFAULT NULL,
  `customerSignatureImage` longblob,
  `technicianSignatureImage` longblob,
  `technicianSignatureName` varchar(100) DEFAULT NULL,
  `repairComment` longtext,
  `partReceivedByName` varchar(50) DEFAULT NULL,
  `partReceivedBySignature` longblob,
  `partLocation` varchar(25) DEFAULT NULL,
  `review_completed_date` datetime DEFAULT NULL,
  `review_status` varchar(50) DEFAULT NULL,
  `review_link` longtext,
  `review_approved_denied` varchar(50) DEFAULT NULL,
  `review_comments` mediumtext,
  `review_billing_comments` longtext,
  PRIMARY KEY (`id`),
  KEY `fs_scheduler_id` (`fs_scheduler_id`),
  KEY `fs_scheduler_id_2` (`fs_scheduler_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5399 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `fs_workOrderDetail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` int(11) NOT NULL,
  `travelType` varchar(150) DEFAULT NULL COMMENT 'description ex: travel In',
  `typeOfTravel` varchar(150) DEFAULT NULL COMMENT 'typeOftravel',
  `totalTraveled` int(11) DEFAULT '0',
  `travelDate` date DEFAULT NULL,
  `travelBill` varchar(5) DEFAULT '',
  `flightDelayed` varchar(5) DEFAULT 'No',
  `flightHrsDelayed` int(11) DEFAULT '0',
  `flyStart` datetime DEFAULT NULL,
  `flyEnd` datetime DEFAULT NULL,
  `flyBreakStart` datetime DEFAULT NULL,
  `flyBreakEnd` datetime DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `drStart` datetime DEFAULT NULL,
  `drBreakStart` datetime DEFAULT NULL,
  `drBreakEnd` datetime DEFAULT NULL,
  `drEnd` datetime DEFAULT NULL,
  `totalHours` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5325 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fs_workOrderMisc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` int(11) NOT NULL,
  `type` varchar(180) DEFAULT '',
  `customerAsset` varchar(180) DEFAULT '',
  `eyefiAsset` varchar(180) DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `workOrderId` (`workOrderId`)
) ENGINE=InnoDB AUTO_INCREMENT=9891 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_workOrderProject` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` int(11) NOT NULL,
  `proj_type` varchar(250) DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `description` longtext,
  `projectStart` datetime DEFAULT NULL,
  `projectFinish` datetime DEFAULT NULL,
  `totalHours` int(11) DEFAULT '0',
  `createdDate` datetime DEFAULT CURRENT_TIMESTAMP,
  `userId` int(11) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `seq` int(11) DEFAULT '0',
  `brStart` datetime DEFAULT NULL,
  `brEnd` datetime DEFAULT NULL,
  `flight_hrs_delay` varchar(55) DEFAULT NULL,
  `projectStartTz` varchar(100) DEFAULT NULL,
  `projectFinishTz` varchar(100) DEFAULT NULL,
  `include_calculation` int(11) DEFAULT NULL,
  `include_traveling` int(11) DEFAULT '0',
  `include_install` int(11) DEFAULT '0',
  `projectStartCoordinates` text,
  `projectFinishCoordinates` text,
  `copiedFromTicketId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `workOrderId` (`workOrderId`) USING BTREE,
  KEY `proj_type` (`proj_type`),
  KEY `event_id` (`event_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51151 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fs_workOrderProject_ext_DELETE` (
  `id` int(11) NOT NULL,
  `workOrderId` int(11) NOT NULL,
  `proj_type` varchar(250) CHARACTER SET utf8mb4 DEFAULT NULL,
  `description` longtext CHARACTER SET utf8mb4,
  `projectStart` datetime DEFAULT NULL,
  `projectFinish` datetime DEFAULT NULL,
  `totalHours` int(11) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(11) DEFAULT NULL,
  `seq` int(11) DEFAULT NULL,
  `brStart` datetime DEFAULT NULL,
  `brEnd` datetime DEFAULT NULL,
  `flight_hrs_delay` varchar(55) CHARACTER SET utf8mb4 DEFAULT NULL,
  `projectStartTz` varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  `projectFinishTz` varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  `projectStartTzConvert` datetime DEFAULT NULL,
  `projectFinishTzConvert` datetime DEFAULT NULL,
  `timeDifference` time DEFAULT NULL,
  `timeDifferenceMins` bigint(21) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_workOrderProject_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` int(11) NOT NULL,
  `projectDate` date DEFAULT NULL,
  `proj_type` varchar(250) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `projectStart` datetime DEFAULT NULL,
  `projectFinish` datetime DEFAULT NULL,
  `projectBill` varchar(5) DEFAULT '',
  `totalHours` int(11) DEFAULT '0',
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `seq` int(11) DEFAULT '0',
  `brStart` datetime DEFAULT NULL,
  `brEnd` datetime DEFAULT NULL,
  `flight_hrs_delay` varchar(55) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workOrderId` (`workOrderId`)
) ENGINE=InnoDB AUTO_INCREMENT=14219 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fs_workOrderProject_v2` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` int(11) NOT NULL,
  `proj_type` varchar(250) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `projectStart` datetime DEFAULT NULL,
  `projectFinish` datetime DEFAULT NULL,
  `totalHours` int(11) DEFAULT '0',
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `seq` int(11) DEFAULT '0',
  `brStart` datetime DEFAULT NULL,
  `brEnd` datetime DEFAULT NULL,
  `flight_hrs_delay` varchar(55) DEFAULT NULL,
  `projectStartTz` varchar(100) DEFAULT NULL,
  `projectFinishTz` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `workOrderId` (`workOrderId`) USING BTREE,
  KEY `workOrderId_2` (`workOrderId`),
  KEY `workOrderId_3` (`workOrderId`)
) ENGINE=InnoDB AUTO_INCREMENT=32541 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fs_workOrderProject_v3` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` int(11) NOT NULL,
  `proj_type` varchar(250) DEFAULT NULL,
  `event_id` int(11) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `projectStart` datetime DEFAULT NULL,
  `projectFinish` datetime DEFAULT NULL,
  `totalHours` int(11) DEFAULT '0',
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `seq` int(11) DEFAULT '0',
  `brStart` datetime DEFAULT NULL,
  `brEnd` datetime DEFAULT NULL,
  `flight_hrs_delay` varchar(55) DEFAULT NULL,
  `projectStartTz` varchar(100) DEFAULT NULL,
  `projectFinishTz` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `workOrderId` (`workOrderId`) USING BTREE,
  KEY `workOrderId_2` (`workOrderId`),
  KEY `workOrderId_3` (`workOrderId`),
  KEY `workOrderId_4` (`workOrderId`),
  KEY `proj_type` (`proj_type`),
  KEY `event_id` (`event_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32711 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fs_workOrderTrip` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `cost` decimal(20,2) NOT NULL,
  `workOrderId` int(11) DEFAULT NULL,
  `fs_scheduler_id` int(11) DEFAULT NULL,
  `created_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `vendor_name` varchar(200) DEFAULT NULL,
  `fileName` varchar(250) DEFAULT NULL,
  `locale` varchar(150) DEFAULT NULL,
  `date` varchar(50) DEFAULT NULL,
  `time` varchar(50) DEFAULT NULL,
  `transaction_id` bigint(20) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `split` decimal(15,2) DEFAULT NULL,
  `to_spit` text,
  `jobs` varchar(500) DEFAULT NULL,
  `fromId` varchar(500) DEFAULT NULL,
  `copiedFromTicketId` int(11) DEFAULT NULL,
  `fileCopied` varchar(50) DEFAULT NULL,
  `originalFileLink` longtext,
  PRIMARY KEY (`id`),
  KEY `workOrderId` (`workOrderId`)
) ENGINE=InnoDB AUTO_INCREMENT=18709 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_workOrderTripShared` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_workOrderTrip_id` int(11) NOT NULL,
  `workOrderId` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `fs_workOrder_v1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fs_scheduler_id` int(11) DEFAULT NULL,
  `customerName1` varchar(150) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `type1` varchar(50) DEFAULT NULL,
  `type2` varchar(50) DEFAULT NULL,
  `type4` varchar(50) DEFAULT NULL,
  `signature` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `survey` varchar(10) DEFAULT 'No',
  `email` varchar(150) DEFAULT NULL,
  `workCompleted` varchar(5) DEFAULT 'No',
  `workCompletedComment` varchar(500) DEFAULT NULL,
  `sendResults` varchar(5) DEFAULT 'No',
  `techSignature` varchar(150) DEFAULT NULL,
  `dateSigned` datetime DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  `submitted` int(1) DEFAULT '0',
  `dateSubmitted` datetime DEFAULT NULL,
  `techName` varchar(200) DEFAULT NULL,
  `comments` longtext,
  `accept` varchar(10) DEFAULT 'false',
  `workCompletedDate` datetime DEFAULT NULL,
  `flightDelayed` varchar(5) DEFAULT '',
  `hrsDelayed` int(11) DEFAULT NULL,
  `customerSignatureImage` longblob,
  `technicianSignatureImage` longblob,
  `technicianSignatureName` varchar(100) DEFAULT NULL,
  `repairComment` longtext,
  `partReceivedByName` varchar(50) DEFAULT NULL,
  `partReceivedBySignature` longblob,
  `partLocation` varchar(25) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fs_scheduler_id` (`fs_scheduler_id`),
  KEY `fs_scheduler_id_2` (`fs_scheduler_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3103 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;

CREATE TABLE IF NOT EXISTS `fs_zones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `city` varchar(150) NOT NULL,
  `state` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `generated_serial_numbers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  `used_for` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'product, asset, work_order, etc.',
  `reference_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID of the record using this serial',
  `reference_table` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Table name where serial is used',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'available' COMMENT 'available, used, reserved',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `generated_by` int(11) DEFAULT NULL,
  `generated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_serial_number` (`serial_number`),
  KEY `idx_template` (`template_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_used` (`is_used`),
  KEY `idx_generated_by` (`generated_by`),
  KEY `idx_reference` (`reference_table`,`reference_id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Generated serial numbers for asset tracking and inventory management';

CREATE TABLE IF NOT EXISTS `geo_location_tracker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `accuracy` mediumtext,
  `latitude` mediumtext,
  `longitude` mediumtext,
  `timestamp` mediumtext,
  `created_date` datetime DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19483 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `graphicsDemand` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `so` varchar(250) NOT NULL,
  `line` int(11) NOT NULL,
  `parentComponent` varchar(150) NOT NULL,
  `part` varchar(150) NOT NULL,
  `uniqueId` varchar(250) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT '1',
  `poNumber` varchar(50) DEFAULT '',
  `woNumber` varchar(250) NOT NULL DEFAULT '',
  `graphicsSalesOrder` varchar(250) DEFAULT '',
  `graphicsWorkOrderNumber` varchar(250) DEFAULT '',
  `lastModBy` int(11) DEFAULT NULL,
  `lastModDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqueId` (`uniqueId`),
  KEY `so` (`so`),
  KEY `line` (`line`)
) ENGINE=InnoDB AUTO_INCREMENT=15530 DEFAULT CHARSET=latin1 COMMENT='Supply Graphics Demand Ordering';

CREATE TABLE IF NOT EXISTS `graphicsInventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `5d_products_PREFERENCES||id_constant|::DI_icons[10]` varchar(150) DEFAULT NULL,
  `T15d_products_PREFERENCES||id_constant|::Company_Logo_System` varchar(150) DEFAULT NULL,
  `calc_total_invoiced_count` varchar(150) DEFAULT NULL,
  `ID_Product` varchar(200) DEFAULT NULL,
  `Product` varchar(200) DEFAULT NULL,
  `Account_Vendor` varchar(150) DEFAULT NULL,
  `Image_Data` varchar(150) DEFAULT NULL,
  `Manufacturer` varchar(150) DEFAULT NULL,
  `SKU_Number` varchar(150) DEFAULT NULL,
  `Date_Purchased` varchar(150) DEFAULT NULL,
  `Age_In_Years` varchar(150) DEFAULT NULL,
  `Serial_Number` varchar(150) DEFAULT NULL,
  `Purchased_From` varchar(150) DEFAULT NULL,
  `Category` varchar(150) DEFAULT NULL,
  `DI_Product_SQL` varchar(200) DEFAULT NULL,
  `Catalog_Item` varchar(150) DEFAULT NULL,
  `Taxable` varchar(150) DEFAULT NULL,
  `flag_available_to_invoices` varchar(150) DEFAULT NULL,
  `Keywords` varchar(150) DEFAULT NULL,
  `Location` varchar(150) DEFAULT NULL,
  `Amount_in_Stock` varchar(150) DEFAULT NULL,
  `Cost` varchar(150) DEFAULT NULL,
  `Reorder_Level` varchar(150) DEFAULT NULL,
  `Price` varchar(150) DEFAULT NULL,
  `calc_total_invoiced_price` varchar(150) DEFAULT NULL,
  `Unit_Weight` varchar(150) DEFAULT NULL,
  `margin` varchar(150) DEFAULT NULL,
  `calc_net_profit` varchar(150) DEFAULT NULL,
  `Status` varchar(150) DEFAULT NULL,
  `Unit_Dimensions` varchar(150) DEFAULT NULL,
  `DD1_1` varchar(150) DEFAULT NULL,
  `DD1_2` varchar(150) DEFAULT NULL,
  `DD1_3` varchar(150) DEFAULT NULL,
  `DD1_4` varchar(150) DEFAULT NULL,
  `DD1_5` varchar(150) DEFAULT NULL,
  `DD1_6` varchar(250) DEFAULT NULL,
  `DD1_7` varchar(150) DEFAULT NULL,
  `DD2_1` varchar(150) DEFAULT NULL,
  `DD2_2` varchar(150) DEFAULT NULL,
  `DD2_3` varchar(150) DEFAULT NULL,
  `DD2_4` varchar(150) DEFAULT NULL,
  `DD2_5` varchar(150) DEFAULT NULL,
  `DD2_6` varchar(250) DEFAULT NULL,
  `DD2_7` varchar(150) DEFAULT NULL,
  `DD2_8` varchar(150) DEFAULT NULL,
  `DD2_9` varchar(150) DEFAULT NULL,
  `DD3_1` varchar(150) DEFAULT NULL,
  `DD3_2` varchar(150) DEFAULT NULL,
  `DD3_3` varchar(150) DEFAULT NULL,
  `DD3_4` varchar(150) DEFAULT NULL,
  `DD3_5` varchar(150) DEFAULT NULL,
  `DD3_6` varchar(150) DEFAULT NULL,
  `DD3_7` varchar(150) DEFAULT NULL,
  `DD3_8` varchar(150) DEFAULT NULL,
  `DD3_9` varchar(150) DEFAULT NULL,
  `Date_Created` varchar(150) DEFAULT NULL,
  `Date_Modified` varchar(150) DEFAULT NULL,
  `UserName_Created` varchar(150) DEFAULT NULL,
  `UserName_Modified` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ID_Product` (`ID_Product`)
) ENGINE=InnoDB AUTO_INCREMENT=13157 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `graphicsInventoryView` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_number` varchar(255) NOT NULL,
  `revision` varchar(400) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `part_number` (`part_number`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `graphicsInventory_old` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `5d_products_PREFERENCES||id_constant|::DI_icons[10]` varchar(150) DEFAULT NULL,
  `T15d_products_PREFERENCES||id_constant|::Company_Logo_System` varchar(150) DEFAULT NULL,
  `calc_total_invoiced_count` varchar(150) DEFAULT NULL,
  `ID_Product` varchar(200) DEFAULT NULL,
  `Product` varchar(200) DEFAULT NULL,
  `Account_Vendor` varchar(150) DEFAULT NULL,
  `Image_Data` varchar(150) DEFAULT NULL,
  `Manufacturer` varchar(150) DEFAULT NULL,
  `SKU_Number` varchar(150) DEFAULT NULL,
  `Date_Purchased` varchar(150) DEFAULT NULL,
  `Age_In_Years` varchar(150) DEFAULT NULL,
  `Serial_Number` varchar(150) DEFAULT NULL,
  `Purchased_From` varchar(150) DEFAULT NULL,
  `Category` varchar(150) DEFAULT NULL,
  `DI_Product_SQL` varchar(200) DEFAULT NULL,
  `Catalog_Item` varchar(150) DEFAULT NULL,
  `Taxable` varchar(150) DEFAULT NULL,
  `flag_available_to_invoices` varchar(150) DEFAULT NULL,
  `Keywords` varchar(150) DEFAULT NULL,
  `Location` varchar(150) DEFAULT NULL,
  `Amount_in_Stock` varchar(150) DEFAULT NULL,
  `Cost` varchar(150) DEFAULT NULL,
  `Reorder_Level` varchar(150) DEFAULT NULL,
  `Price` varchar(150) DEFAULT NULL,
  `calc_total_invoiced_price` varchar(150) DEFAULT NULL,
  `Unit_Weight` varchar(150) DEFAULT NULL,
  `margin` varchar(150) DEFAULT NULL,
  `calc_net_profit` varchar(150) DEFAULT NULL,
  `Status` varchar(150) DEFAULT NULL,
  `Unit_Dimensions` varchar(150) DEFAULT NULL,
  `DD1_1` varchar(150) DEFAULT NULL,
  `DD2_1` varchar(150) DEFAULT NULL,
  `DD3_1` varchar(150) DEFAULT NULL,
  `DD2_2` varchar(150) DEFAULT NULL,
  `DD3_2` varchar(150) DEFAULT NULL,
  `DD1_2` varchar(150) DEFAULT NULL,
  `DD2_3` varchar(150) DEFAULT NULL,
  `DD3_3` varchar(150) DEFAULT NULL,
  `DD1_3` varchar(150) DEFAULT NULL,
  `DD2_4` varchar(150) DEFAULT NULL,
  `DD3_4` varchar(150) DEFAULT NULL,
  `DD1_4` varchar(150) DEFAULT NULL,
  `DD2_5` varchar(150) DEFAULT NULL,
  `DD3_5` varchar(150) DEFAULT NULL,
  `DD1_5` varchar(150) DEFAULT NULL,
  `DD2_6` varchar(250) DEFAULT NULL,
  `DD3_6` varchar(150) DEFAULT NULL,
  `DD1_6` varchar(250) DEFAULT NULL,
  `DD2_7` varchar(150) DEFAULT NULL,
  `DD3_7` varchar(150) DEFAULT NULL,
  `DD2_8` varchar(150) DEFAULT NULL,
  `DD3_8` varchar(150) DEFAULT NULL,
  `DD2_9` varchar(150) DEFAULT NULL,
  `DD3_9` varchar(150) DEFAULT NULL,
  `DD1_7` varchar(150) DEFAULT NULL,
  `Date_Created` varchar(150) DEFAULT NULL,
  `Date_Modified` varchar(150) DEFAULT NULL,
  `UserName_Created` varchar(150) DEFAULT NULL,
  `UserName_Modified` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ID_Product` (`ID_Product`)
) ENGINE=InnoDB AUTO_INCREMENT=12311 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `graphicsIssues` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `so` varchar(800) NOT NULL,
  `issueComment` varchar(700) NOT NULL,
  `issueQty` int(11) NOT NULL,
  `issueType` varchar(100) NOT NULL,
  `createdBy` varchar(100) NOT NULL,
  `createdDate` datetime NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `lastMod` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1076 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `graphicsLiveInventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `partNumber` varchar(22) DEFAULT NULL,
  `onHand` int(11) DEFAULT NULL,
  `measure1` varchar(50) DEFAULT NULL,
  `allocatedQty` int(11) DEFAULT '0',
  `type1` varchar(100) DEFAULT NULL,
  `customerPartNumber` varchar(200) DEFAULT NULL,
  `loc` varchar(500) DEFAULT NULL,
  `lastModDate` datetime NOT NULL,
  `lastModUser` int(11) NOT NULL,
  `bin` varchar(500) NOT NULL,
  `costPer` decimal(15,2) DEFAULT NULL,
  `active` int(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3313 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `graphicsQueues` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `path` varchar(150) NOT NULL,
  `queueStatus` int(11) NOT NULL,
  `mainQueueId` int(11) NOT NULL,
  `seq` int(11) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `graphicsSchedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `orderNum` varchar(700) DEFAULT NULL,
  `ordered_date` varchar(100) DEFAULT NULL,
  `graphicsWorkOrder` varchar(800) NOT NULL,
  `graphicsSalesOrder` int(11) DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  `itemNumber` varchar(150) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `customer` varchar(100) DEFAULT NULL,
  `dueDate` date DEFAULT NULL,
  `origDueDate` date DEFAULT NULL,
  `shippedOn` datetime DEFAULT NULL,
  `customerPartNumber` varchar(200) DEFAULT NULL,
  `qty` int(11) DEFAULT '0',
  `allocQty` int(11) NOT NULL DEFAULT '0',
  `qtyShipped` int(11) NOT NULL DEFAULT '0',
  `pendingQtyShip` int(11) DEFAULT '0',
  `purchaseOrder` varchar(30) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `priority` varchar(30) DEFAULT '50',
  `partials` int(1) DEFAULT '0',
  `active` int(1) DEFAULT '1',
  `lastUpdate` datetime DEFAULT NULL,
  `packingSlipNumber` varchar(150) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `materialSize` varchar(150) DEFAULT NULL,
  `materialLocation` varchar(150) DEFAULT NULL,
  `instructions` varchar(700) DEFAULT NULL,
  `plexOrdered` int(1) DEFAULT '0',
  `plexRequired` int(1) DEFAULT '0',
  `prototypeCheck` int(1) DEFAULT '0',
  `criticalOrder` varchar(15) DEFAULT NULL,
  `graphicsWorkOrderString` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `graphicsWorkOrder` (`graphicsWorkOrder`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=29818 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `graphicsSubstrateOrder` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vendor` varchar(150) DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `size` varchar(100) DEFAULT NULL,
  `description` varchar(250) DEFAULT NULL,
  `reqDate` varchar(50) DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL,
  `jobNumber` varchar(500) NOT NULL,
  `woNumber` int(11) NOT NULL,
  `requester` varchar(50) NOT NULL,
  `comments` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=129 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `graphicsTotalOrdersByQueue` (
  `totalOrders` bigint(21) NOT NULL,
  `n` varchar(500) CHARACTER SET utf8mb4 DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `graphicsTotalPerDayUsers` (
  `userId` int(11) DEFAULT NULL,
  `userName` varchar(511) CHARACTER SET utf8mb4 DEFAULT NULL,
  `hits` bigint(21) NOT NULL,
  `createDate` date DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `graphicsTotalPerHourUser` (
  `userId` int(11) DEFAULT NULL,
  `userName` varchar(511) CHARACTER SET utf8mb4 DEFAULT NULL,
  `hits` bigint(21) NOT NULL,
  `byHour` int(2) DEFAULT NULL,
  `byDate` date DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `graphicsTotalTransPerUser` (
  `UserId` int(11) DEFAULT NULL,
  `userName` varchar(511) CHARACTER SET utf8mb4 DEFAULT NULL,
  `hits` bigint(21) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `graphicsWorkOrderCreation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `poNumber` varchar(150) NOT NULL,
  `poLine` int(11) NOT NULL,
  `graphicsWorkOrderNumber` varchar(150) DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT '1',
  `partNumber` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1831 DEFAULT CHARSET=latin1 COMMENT='Capture the graphics work order number once work order is cr';

CREATE TABLE IF NOT EXISTS `holdCodes` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(250) DEFAULT NULL,
  `description` varchar(750) DEFAULT NULL,
  `createdBy` varchar(150) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `holds` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `orderNum` varchar(500) DEFAULT NULL,
  `reasonCode` varchar(100) DEFAULT NULL,
  `comment` varchar(700) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `pageApplied` varchar(100) DEFAULT NULL,
  `deptResponsible` varchar(150) DEFAULT NULL,
  `itemNumber` varchar(100) DEFAULT NULL,
  `qty` int(11) NOT NULL DEFAULT '0',
  `userId` int(11) NOT NULL,
  `removeUserId` int(11) DEFAULT NULL,
  `removeDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=425 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `igt_assets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for the IGT asset record',
  `generated_IGT_asset` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Auto-generated or manually entered IGT asset number',
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Device serial number from manufacturer',
  `time_stamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `wo_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work order number for manufacturing/assembly',
  `property_site` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Gaming facility or casino where asset will be deployed',
  `igt_part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer IGT part number reference',
  `eyefi_part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Internal Eyefi part number reference',
  `inspector_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Quality control inspector assigned to this asset',
  `last_update` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `manual_update` text COLLATE utf8mb4_unicode_ci COMMENT 'Manual notes and updates for the asset record',
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number_id` bigint(20) DEFAULT NULL COMMENT 'Reference to the preloaded serial number record if used',
  `notes` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wo_part` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work order part number',
  `wo_description` text COLLATE utf8mb4_unicode_ci COMMENT 'Work order description',
  `eyefi_serial_number` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_igt_eyefi_serial` (`eyefi_serial_number`(255)),
  KEY `idx_igt_assets_serial_number` (`serial_number`),
  KEY `idx_igt_assets_generated_asset` (`generated_IGT_asset`),
  KEY `idx_igt_assets_wo_number` (`wo_number`),
  KEY `idx_igt_assets_property_site` (`property_site`),
  KEY `idx_igt_assets_created_at` (`created_at`),
  KEY `idx_igt_assets_inspector` (`inspector_name`),
  KEY `fk_igt_assets_serial_number` (`serial_number_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main table for IGT asset records created through the quality management system';

CREATE TABLE IF NOT EXISTS `igt_kitting` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fileName` varchar(150) NOT NULL,
  `created_by` int(11) NOT NULL,
  `uniqueId` int(11) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `igt_serial_numbers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for the serial number record',
  `serial_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'The actual serial number (alphanumeric, minimum 3 characters)',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gaming' COMMENT 'Category of equipment: gaming, peripheral, system, other',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available' COMMENT 'Status: available, reserved, used, expired, invalid',
  `manufacturer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Equipment manufacturer (e.g., IGT, Aristocrat, Bally)',
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `used_at` datetime DEFAULT NULL COMMENT 'When the serial number was used in an IGT asset record',
  `used_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `used_in_asset_id` bigint(20) DEFAULT NULL COMMENT 'Reference to the IGT asset record that used this serial number',
  `used_in_asset_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `idx_igt_serial_numbers_status` (`status`),
  KEY `idx_igt_serial_numbers_category` (`category`),
  KEY `idx_igt_serial_numbers_created_at` (`created_at`),
  KEY `idx_igt_serial_numbers_used_at` (`used_at`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores preloaded serial numbers for IGT asset creation and tracking';

CREATE TABLE IF NOT EXISTS `igt_transfer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_reference` varchar(150) NOT NULL,
  `transfer_reference_description` varchar(200) NOT NULL,
  `date` varchar(150) NOT NULL,
  `so_number` varchar(150) NOT NULL,
  `from_location` varchar(150) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT '1',
  `to_location` varchar(150) NOT NULL,
  `email_sent_datetime` datetime DEFAULT NULL,
  `email_sent_created_by_name` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=656 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `igt_transfer_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `igt_transfer_ID` int(11) NOT NULL,
  `so_line` varchar(150) NOT NULL,
  `part_number` varchar(150) NOT NULL,
  `qty` int(11) NOT NULL,
  `serial_numbers` varchar(300) NOT NULL,
  `description` varchar(250) NOT NULL,
  `pallet_count` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2013 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `incomingInspections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` varchar(15) DEFAULT NULL,
  `partNumber` varchar(50) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `supplier` varchar(50) DEFAULT NULL,
  `receivedQuantity` varchar(150) DEFAULT NULL,
  `inspectedQuantity` varchar(150) DEFAULT NULL,
  `defectiveQuantity` varchar(150) DEFAULT NULL,
  `defectDescription` varchar(800) DEFAULT NULL,
  `qirNumber` varchar(50) DEFAULT NULL,
  `partDisposition` varchar(250) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=946 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `inventoryTransactions_DELETE` (
  `part_number` varchar(150) NOT NULL,
  `qty_last_12_months` int(11) NOT NULL,
  `cost_last_12_months` decimal(10,3) NOT NULL,
  `qty_last_6_months` int(11) NOT NULL,
  `cost_last_6_months` decimal(10,3) NOT NULL,
  `qty_last_3_months` int(11) NOT NULL,
  `cost_last_3_months` decimal(10,3) NOT NULL,
  `date_from` date NOT NULL,
  `date_to` date NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3897 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `inventoryValuationData_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `data` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `inventoryValuation_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` varchar(50) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `partNumber` varchar(150) NOT NULL,
  `qty` int(11) NOT NULL,
  `um` varchar(10) NOT NULL,
  `cost` decimal(10,3) NOT NULL,
  `extCost` decimal(10,3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5887 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `issueItems` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customerPartNumber` varchar(200) NOT NULL,
  `issue` varchar(700) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `description` varchar(700) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `item_consolidation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `partNumber` varchar(250) NOT NULL,
  `completed` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `partNumber` (`partNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=511 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `kanban` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL DEFAULT '0',
  `queue` int(11) NOT NULL DEFAULT '0',
  `task_content` varchar(150) DEFAULT NULL,
  `value` varchar(150) DEFAULT NULL,
  `disable` varchar(50) DEFAULT NULL,
  `enable_validation` int(11) DEFAULT '1',
  `show_column` int(11) DEFAULT '1',
  `show_data` text,
  `seq` int(11) DEFAULT NULL,
  `description` longtext,
  `routing` int(11) DEFAULT NULL,
  `next_queue_default` int(11) DEFAULT NULL,
  `user_roles` text,
  `max_in_queue` int(11) DEFAULT '0',
  `first_in_first_out` int(11) DEFAULT '0',
  `enable_start_time` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `kanban_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kanban_ID` int(11) NOT NULL DEFAULT '0',
  `wo_nbr` varchar(255) NOT NULL DEFAULT '',
  `qty` int(11) DEFAULT NULL,
  `due_date` text,
  `so_nbr` text,
  `staging_bay` text,
  `prod_line` text,
  `seq` int(11) DEFAULT NULL,
  `last_transaction_date` datetime DEFAULT NULL,
  `item_number` text,
  `item_description` text,
  `hot_order` text,
  `due_by` text,
  `assigned_user` varchar(250) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wo_nbr` (`wo_nbr`)
) ENGINE=InnoDB AUTO_INCREMENT=879 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `kanban_priorities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(50) NOT NULL COMMENT 'Reference to the order (e.g., SO number or internal ID)',
  `sales_order_number` varchar(50) NOT NULL COMMENT 'Sales order number for easy reference',
  `sales_order_line` varchar(10) DEFAULT NULL COMMENT 'Sales order line number if applicable',
  `priority_level` int(11) NOT NULL COMMENT 'Priority level (1=highest priority)',
  `notes` text COMMENT 'Optional notes about why this order has priority',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) NOT NULL COMMENT 'User who set the priority',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) DEFAULT NULL COMMENT 'User who last updated the priority',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Whether this priority is currently active',
  PRIMARY KEY (`id`),
  KEY `idx_kanban_priorities_order_id` (`order_id`),
  KEY `idx_kanban_priorities_so_number` (`sales_order_number`),
  KEY `idx_kanban_priorities_priority` (`priority_level`),
  KEY `idx_kanban_priorities_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `kanban_timer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wo_nbr` int(11) DEFAULT NULL,
  `kanban_id` int(11) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `kanban_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_name` varchar(50) NOT NULL DEFAULT '0',
  `created_by` int(11) DEFAULT '0',
  `transaction_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `kanban_ID` int(11) DEFAULT NULL,
  `wo_nbr` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2081 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `lateReasonCodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `department` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=244 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `mainQueues` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(250) DEFAULT NULL,
  `path` varchar(250) DEFAULT NULL,
  `queueStatus` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `manual_allocations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wo_number` varchar(50) NOT NULL,
  `so_number` varchar(50) NOT NULL,
  `part_number` varchar(50) NOT NULL,
  `allocated_quantity` decimal(15,4) NOT NULL,
  `allocation_type` enum('MANUAL','PRIORITY') NOT NULL DEFAULT 'MANUAL',
  `priority` int(11) NOT NULL DEFAULT '999',
  `locked_by` varchar(100) NOT NULL,
  `locked_date` datetime NOT NULL,
  `reason` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_manual_alloc` (`wo_number`,`so_number`,`part_number`,`is_active`),
  KEY `idx_manual_alloc_part` (`part_number`),
  KEY `idx_manual_alloc_wo` (`wo_number`),
  KEY `idx_manual_alloc_so` (`so_number`),
  KEY `idx_manual_alloc_active` (`is_active`),
  KEY `idx_manual_alloc_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `menu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `label` text,
  `icon` text,
  `link` text,
  `description` text,
  `isCollapsed` int(11) DEFAULT NULL,
  `accessRequired` int(11) DEFAULT '1',
  `badge` json DEFAULT NULL,
  `isTitle` int(11) DEFAULT NULL,
  `hideCheckBox` text,
  `active` int(11) DEFAULT '1',
  `seq` int(11) DEFAULT NULL,
  `activatedRoutes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=248 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `metrics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shipping_past_due_lines_6am` int(11) DEFAULT NULL,
  `shipping_lines_due_6am` int(11) DEFAULT NULL,
  `shipping_value_due_to_ship_today_6am` decimal(10,2) DEFAULT NULL,
  `shipping_overdue_amount_6am` decimal(10,2) DEFAULT NULL,
  `production_value_due_today_6am` decimal(10,2) DEFAULT NULL,
  `production_wo_lines_due_today_6am` int(11) DEFAULT NULL,
  `production_total_wo_lines_overdue_6am` int(11) DEFAULT NULL,
  `date_created` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `metrics_so` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dueDate` date NOT NULL,
  `unitsOrdered` decimal(10,2) DEFAULT NULL,
  `unitsShipped` decimal(10,2) DEFAULT NULL,
  `totalPrice` decimal(10,2) DEFAULT NULL,
  `shippedPrice` decimal(15,2) DEFAULT NULL,
  `totalOrders` int(11) DEFAULT NULL,
  `totalStdCost` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=269 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `mrb_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mrb_id` int(11) NOT NULL,
  `comments` varchar(700) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `mrb_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qirNumber` varchar(250) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `itemCost` decimal(25,2) NOT NULL,
  `disposition` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `failureType` varchar(50) DEFAULT NULL,
  `componentType` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `partNumber` varchar(100) DEFAULT NULL,
  `partDescription` varchar(250) DEFAULT NULL,
  `dateReported` date DEFAULT NULL,
  `qtyRejected` int(11) DEFAULT NULL,
  `wo_so` varchar(250) DEFAULT NULL,
  `rma` varchar(150) DEFAULT NULL,
  `mrbNumber` varchar(150) DEFAULT NULL,
  `lotNumber` varchar(150) DEFAULT NULL,
  `firstApproval` varchar(150) DEFAULT NULL,
  `secondApproval` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mrbNumber` (`mrbNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=590 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `mrf` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requestor` varchar(50) NOT NULL,
  `lineNumber` varchar(150) DEFAULT NULL,
  `pickList` varchar(250) DEFAULT NULL,
  `dueDate` date NOT NULL,
  `specialInstructions` varchar(500) DEFAULT NULL,
  `createdBy` varchar(15) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `pickedCompletedDate` datetime DEFAULT NULL,
  `priority` varchar(5) DEFAULT '',
  `validated` datetime DEFAULT NULL,
  `queue_status` enum('new','under_validation','pending_review','approved','picking','complete','cancelled') NOT NULL DEFAULT 'new',
  `deleteReason` varchar(500) DEFAULT NULL,
  `deleteReasonDate` datetime DEFAULT NULL,
  `deleteReasonBy` int(11) DEFAULT NULL,
  `info` varchar(500) DEFAULT NULL,
  `assemblyNumber` varchar(150) DEFAULT NULL,
  `isCableRequest` varchar(50) DEFAULT NULL,
  `modifiedDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_queue_status` (`queue_status`,`createdDate`)
) ENGINE=InnoDB AUTO_INCREMENT=22815 DEFAULT CHARSET=latin1 COMMENT='Material Request Form';

CREATE TABLE IF NOT EXISTS `mrf_det` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mrf_id` int(11) NOT NULL,
  `partNumber` varchar(25) NOT NULL,
  `qty` int(11) NOT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `qtyPicked` int(11) DEFAULT '0',
  `printedBy` varchar(150) DEFAULT NULL,
  `printedDate` datetime DEFAULT NULL,
  `pickCompletedDate` datetime DEFAULT NULL,
  `trType` varchar(150) DEFAULT NULL,
  `ac_code` varchar(150) DEFAULT NULL,
  `reasonCode` varchar(150) NOT NULL,
  `locationPickFrom` varchar(150) DEFAULT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `deleteReason` varchar(350) DEFAULT NULL,
  `deleteReasonDate` datetime DEFAULT NULL,
  `deleteReasonBy` int(11) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `shortage_id` int(11) DEFAULT NULL,
  `isDuplicate` varchar(50) DEFAULT NULL,
  `message` varchar(150) DEFAULT NULL,
  `availableQty` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `hasError` varchar(50) DEFAULT NULL,
  `validationStatus` enum('pending','approved','rejected') DEFAULT 'pending',
  `validationComment` text,
  `validatedBy` int(11) DEFAULT NULL,
  `validatedAt` datetime DEFAULT NULL,
  `modifiedDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41272 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `mrf_det_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mrf_det_id` int(11) NOT NULL,
  `reviewerId` int(11) NOT NULL,
  `department` varchar(100) NOT NULL,
  `reviewStatus` enum('pending_review','approved','rejected','needs_info','reviewed','cancel_review') DEFAULT 'pending_review',
  `cancelledBy` int(11) DEFAULT NULL,
  `reviewNote` text,
  `reviewPriority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `reviewDecision` enum('approved','rejected','needs_clarification') DEFAULT NULL,
  `reviewComment` text,
  `sentForReviewAt` datetime NOT NULL,
  `sentForReviewBy` int(11) NOT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modifiedDate` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `active` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_mrf_det_reviews_item` (`mrf_det_id`),
  KEY `idx_mrf_det_reviews_reviewer` (`reviewerId`),
  KEY `idx_mrf_det_reviews_status` (`reviewStatus`),
  KEY `idx_mrf_det_reviews_department` (`department`),
  KEY `idx_mrf_det_reviews_priority` (`reviewPriority`),
  CONSTRAINT `FK_mrf_det_reviews_mrf_det` FOREIGN KEY (`mrf_det_id`) REFERENCES `mrf_det` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `mrf_trans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `so` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `partNumber` varchar(500) DEFAULT NULL,
  `reasonCode` varchar(150) DEFAULT NULL,
  `uniqueId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=68005 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ncr` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `source` varchar(100) DEFAULT NULL COMMENT 'source',
  `po_nbr` varchar(100) DEFAULT NULL COMMENT 'po number',
  `wo_nbr` varchar(100) DEFAULT NULL COMMENT 'wo number',
  `ncr_nbr` varchar(100) DEFAULT NULL COMMENT 'ncr number',
  `ncr_type` varchar(100) DEFAULT NULL COMMENT 'ncr type',
  `pt_nbr` varchar(100) DEFAULT NULL COMMENT 'part number',
  `rev` varchar(100) DEFAULT NULL COMMENT 'revision',
  `initiated_by` varchar(100) DEFAULT NULL COMMENT 'initiated by',
  `ret_nbr` varchar(100) DEFAULT NULL COMMENT 'return number',
  `acc` varchar(100) DEFAULT NULL COMMENT 'acc',
  `rej` varchar(100) DEFAULT NULL COMMENT 'reject',
  `sample_size` varchar(100) DEFAULT NULL COMMENT 'sample size',
  `dept_operator` varchar(100) DEFAULT NULL COMMENT 'department operator',
  `finished_nbr` varchar(100) DEFAULT NULL COMMENT 'finished number',
  `desc_of_defn_rej` varchar(900) DEFAULT NULL COMMENT 'description of deficiency/rejection',
  `cont_notes` varchar(900) DEFAULT NULL COMMENT 'containment notes',
  `cont_type` varchar(100) DEFAULT NULL COMMENT 'containment type',
  `cont_dspn_by` varchar(80) DEFAULT NULL COMMENT 'containment disposition by',
  `cont_dspn_title` varchar(150) DEFAULT NULL COMMENT 'containment title',
  `cont_dspn_dt` varchar(70) DEFAULT NULL COMMENT 'containment date',
  `dspn_desc` varchar(900) DEFAULT NULL COMMENT 'disposition/rework/repair instructions',
  `impact_assesment` varchar(900) DEFAULT NULL COMMENT 'impact assessment of nonconformity on other products and or processes',
  `icm_notes` varchar(900) DEFAULT NULL COMMENT 'immediate correction made',
  `icm_dspn_by` varchar(80) DEFAULT NULL COMMENT 'immediate correction made by',
  `icm_dspn_title` varchar(150) DEFAULT NULL COMMENT 'immediate correction title',
  `icm_dspn_dt` varchar(70) DEFAULT NULL COMMENT 'immediate correction date',
  `ca_action_req` varchar(5) DEFAULT NULL COMMENT 'corrective action required',
  `iss_by` varchar(80) DEFAULT NULL COMMENT 'issued by',
  `iss_dt` varchar(70) DEFAULT NULL COMMENT 'issue date',
  `ca_iss_to` varchar(80) DEFAULT NULL COMMENT 'corrective action issued to',
  `ca_due_dt` varchar(500) DEFAULT NULL COMMENT 'corrective action issue to date',
  `ca_cont_immed_action_taken` varchar(900) DEFAULT NULL COMMENT 'containment/immediate action taken (Only need to  be completed if CA is issued to Supplier)',
  `ca_root_cause` varchar(900) DEFAULT NULL COMMENT 'root cause (attach additional documentation if necessary)',
  `ca_taken_to_prevent_recurr` varchar(900) DEFAULT NULL COMMENT 'correction action taken to prevent reocurrence',
  `planned_ca_impl_dt` varchar(70) DEFAULT NULL COMMENT 'Planned CA implementation date',
  `ca_by` varchar(80) DEFAULT NULL COMMENT 'Corrective action by',
  `ca_title` varchar(200) DEFAULT NULL COMMENT 'Corrective action title',
  `ca_dt` varchar(70) DEFAULT NULL COMMENT 'Corrective action date',
  `ca_impl_by` varchar(80) DEFAULT NULL COMMENT 'Corrective action implemented by',
  `ca_impl_title` varchar(150) DEFAULT NULL COMMENT 'Corrective action implemented title',
  `ca_impl_dt` varchar(70) DEFAULT NULL COMMENT 'Corrective action implemented date',
  `ca_submitted_date` varchar(500) DEFAULT NULL,
  `verif_of_ca_by` varchar(80) DEFAULT NULL COMMENT 'Verification of CA by',
  `verif_of_ca_dt` varchar(70) DEFAULT NULL COMMENT 'Verification of CA date',
  `eff_verif_of_ca_by` varchar(80) DEFAULT NULL COMMENT 'Effectiveness verification of CA by',
  `eff_verif_of_ca_dt` varchar(70) DEFAULT NULL COMMENT 'Effectiveness verification of CA date',
  `cmt_cls_by` varchar(80) DEFAULT NULL COMMENT 'comments/closure by',
  `cmt_cls_dt` varchar(70) DEFAULT NULL COMMENT 'comments/closure date',
  `submitted_date` varchar(50) DEFAULT NULL,
  `created_date` varchar(30) NOT NULL,
  `created_by` int(11) NOT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `complaint_code` varchar(500) DEFAULT NULL,
  `qir_number` varchar(555) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `ca_email_sent_date_time` varchar(500) DEFAULT NULL,
  `ca_email_sent_by` int(11) DEFAULT NULL,
  `ca_email_sent_to` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ncr_complaint_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ncr_token` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(150) NOT NULL,
  `password` varchar(140) NOT NULL,
  `ncr_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ncr_trans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(1500) DEFAULT NULL,
  `n` varchar(1500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` varchar(100) NOT NULL,
  `uniqueId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=552 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `notes` varchar(1200) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NOT NULL,
  `uniqueId` varchar(500) NOT NULL,
  `type` varchar(50) NOT NULL,
  `subscribers` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11626 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `notes_subscribers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subscribers` text NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `createDate` datetime NOT NULL,
  `orderNum` varchar(800) NOT NULL,
  `field` varchar(150) NOT NULL,
  `lastUpdate` datetime DEFAULT NULL,
  `userId` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notification_email` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT '0',
  `type_of_notice` text NOT NULL,
  `unique_number` text NOT NULL,
  `page_id` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `npiQueue_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(70) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `npi_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pt_part` varchar(150) DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `queue` int(11) DEFAULT NULL,
  `detailOfProduct` varchar(150) DEFAULT NULL,
  `launchDate` varchar(150) DEFAULT NULL,
  `estimatedVolume` varchar(150) DEFAULT NULL,
  `customer` varchar(150) DEFAULT NULL,
  `customerPartNumber` varchar(150) DEFAULT NULL,
  `sizeOfBox` varchar(100) DEFAULT NULL,
  `firstDelivery` varchar(150) DEFAULT NULL,
  `primarySupplier` varchar(150) DEFAULT NULL,
  `itemCost` varchar(150) DEFAULT NULL,
  `suggesstedSalesPrice` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pt_part` (`pt_part`)
) ENGINE=InnoDB AUTO_INCREMENT=262 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `npi_trans_DELETE` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `uniqueId` varchar(250) DEFAULT NULL,
  `type` varchar(100) NOT NULL,
  `reasonCode` varchar(150) DEFAULT NULL,
  `workOrderId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `one_sku_location` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_number` varchar(150) NOT NULL,
  `completed` varchar(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `part_number` (`part_number`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `on_time_delivery` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `so_nbr` text,
  `performance_date` date DEFAULT NULL,
  `shipped_qty` text,
  `week` text,
  `year` text,
  `month` text,
  `difference` text,
  `is_late` text,
  `last_shipped_on` date DEFAULT NULL,
  `shipped_partial` text,
  `customer` text,
  `line_nbr` text,
  `qty_ordered` text,
  `created_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `sod_nbr_and_line` varchar(500) DEFAULT NULL,
  `updated_date` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sod_nbr_and_line` (`sod_nbr_and_line`)
) ENGINE=InnoDB AUTO_INCREMENT=83936 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `org_chart_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `generated_by` int(11) DEFAULT NULL,
  `access_count` int(11) DEFAULT '0',
  `last_accessed_at` datetime DEFAULT NULL,
  `is_revoked` tinyint(1) DEFAULT '0',
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_revoked` (`is_revoked`),
  KEY `idx_generated_by` (`generated_by`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores temporary access tokens for external org chart sharing';

CREATE TABLE IF NOT EXISTS `osor_changes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `so` varchar(50) NOT NULL,
  `line` varchar(50) NOT NULL,
  `part_number` varchar(500) NOT NULL,
  `type_of_change` varchar(500) NOT NULL,
  `previous_value` varchar(500) NOT NULL,
  `new_value` varchar(500) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=171 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `overdue_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wo_nbr` int(11) DEFAULT '0',
  `part_number` text,
  `part_description` text,
  `open_qty` text,
  `wo_due_date` date DEFAULT NULL,
  `wr_due_by` date DEFAULT NULL,
  `wr_op` text,
  `updated_date` datetime DEFAULT NULL,
  `unique_id` varchar(500) DEFAULT NULL,
  `wo_need_date` date DEFAULT NULL,
  `wo_ord_date` date DEFAULT NULL,
  `wo_rel_date` date DEFAULT NULL,
  `wo_per_date` date DEFAULT NULL,
  `wo_so_job` text,
  `wr_status` text,
  `wr_wkctr` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20864 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `owners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full name of the owner',
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email address of the owner',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Department the owner belongs to',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Optional description or notes about the owner',
  `display_order` int(11) DEFAULT '999' COMMENT 'Sort order for dropdown display',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Whether this owner is currently active',
  `is_production` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag indicating if owner is currently working on items (1=working, 0=not working)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User who created this owner',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User who last updated this owner',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_owner_name` (`name`),
  KEY `idx_owners_active` (`is_active`),
  KEY `idx_owners_department` (`department`),
  KEY `idx_owners_display_order` (`display_order`),
  KEY `idx_owners_name` (`name`),
  KEY `idx_is_production` (`is_production`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores owner information with status tracking including active status and current production work status';

CREATE TABLE IF NOT EXISTS `owner_admin_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'User ID who has admin access to all owners',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_admin_user` (`user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Users who have admin access to see and assign all owners';

CREATE TABLE IF NOT EXISTS `page_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT '0',
  `active` int(11) DEFAULT '1',
  `menu_id` int(11) DEFAULT NULL,
  `created_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3810 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `page_access_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `page_settings_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `current_column_view` int(11) NOT NULL,
  `page_id` varchar(250) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `grid_number` varchar(250) DEFAULT NULL,
  `grid_view_name` varchar(150) NOT NULL,
  `page_name` varchar(150) NOT NULL,
  `table_size` varchar(25) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `page_settings_details_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `columns` json NOT NULL,
  `page_settings_id` int(11) NOT NULL,
  `grid_title` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `palletCount_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(55) NOT NULL,
  `onHand` int(11) NOT NULL,
  `lastCounted` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `minMax` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=193 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `perm` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `page` varchar(155) NOT NULL,
  `perm` varchar(155) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `photo_checklist_instances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `work_order_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` int(11) NOT NULL,
  `status` enum('draft','in_progress','completed','submitted','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `started_date` datetime DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `submitted_date` datetime DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `template_id` (`template_id`),
  KEY `idx_work_order` (`work_order_number`),
  KEY `idx_part_number` (`part_number`),
  KEY `idx_status` (`status`),
  KEY `idx_assigned` (`assigned_to`),
  CONSTRAINT `photo_checklist_instances_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `photo_checklist_templates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `photo_checklist_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Short title for the photo task',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Detailed instructions for the photo',
  `sequence_order` int(11) NOT NULL DEFAULT '1',
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `photo_type` enum('image','video','both','none') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'image',
  `sample_photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Path to sample/reference photo',
  `validation_rules` json DEFAULT NULL COMMENT 'Custom validation rules',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int(11) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_template_sequence` (`template_id`,`sequence_order`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `photo_checklist_items_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `photo_checklist_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `photo_checklist_part_mappings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int(11) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_part_template` (`part_number`,`template_id`),
  KEY `template_id` (`template_id`),
  KEY `idx_part_number` (`part_number`),
  CONSTRAINT `photo_checklist_part_mappings_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `photo_checklist_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `photo_checklist_submissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `instance_id` int(11) NOT NULL,
  `checklist_item_id` int(11) NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','uploaded','approved','rejected','skipped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `uploaded_date` datetime DEFAULT NULL,
  `reviewed_date` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_instance_item` (`instance_id`,`checklist_item_id`),
  KEY `checklist_item_id` (`checklist_item_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `photo_checklist_submissions_ibfk_1` FOREIGN KEY (`instance_id`) REFERENCES `photo_checklist_instances` (`id`) ON DELETE CASCADE,
  CONSTRAINT `photo_checklist_submissions_ibfk_2` FOREIGN KEY (`checklist_item_id`) REFERENCES `photo_checklist_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `photo_checklist_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Template name (e.g., "360 Sign Standard", "LED Panel QC")',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Template description',
  `part_number_pattern` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Regex pattern for matching part numbers',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int(11) NOT NULL,
  `updated_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_part_pattern` (`part_number_pattern`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `photo_submissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `instance_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` enum('image','video') COLLATE utf8mb4_unicode_ci DEFAULT 'image',
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_metadata` json DEFAULT NULL,
  `submission_notes` text COLLATE utf8mb4_unicode_ci,
  `is_approved` tinyint(1) DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `idx_instance_item` (`instance_id`,`item_id`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_approval` (`is_approved`),
  KEY `idx_review` (`reviewed_by`,`reviewed_at`),
  CONSTRAINT `photo_submissions_ibfk_1` FOREIGN KEY (`instance_id`) REFERENCES `checklist_instances` (`id`) ON DELETE CASCADE,
  CONSTRAINT `photo_submissions_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `checklist_items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12698 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `physical_inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_date` datetime DEFAULT NULL,
  `first_count_print_dt` varchar(80) DEFAULT NULL,
  `first_count_tags` varchar(2000) DEFAULT NULL,
  `tag_nbr` int(11) DEFAULT NULL,
  `first_count_usrs` varchar(800) DEFAULT NULL,
  `second_count_print_dt` varchar(80) DEFAULT NULL,
  `second_count_tags` varchar(250) DEFAULT NULL,
  `second_count_usrs` varchar(250) DEFAULT NULL,
  `active` int(11) DEFAULT NULL,
  `type` varchar(15) NOT NULL,
  `third_count_print_dt` varchar(80) DEFAULT NULL,
  `third_count_tags` varchar(250) DEFAULT NULL,
  `third_count_usrs` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5072 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `placard` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(150) DEFAULT NULL,
  `part_number` varchar(150) DEFAULT NULL,
  `line_number` varchar(150) DEFAULT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `eyefi_wo_number` varchar(150) DEFAULT NULL,
  `po_number` varchar(150) DEFAULT NULL,
  `eyefi_so_number` varchar(150) DEFAULT NULL,
  `customer_co_por_so` varchar(150) DEFAULT NULL,
  `description` varchar(150) DEFAULT NULL,
  `eyefi_part_number` varchar(150) DEFAULT NULL,
  `customer_part_number` varchar(150) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `customer_serial_tag` varchar(150) DEFAULT NULL,
  `eyefi_serial_tag` varchar(150) DEFAULT NULL,
  `qty` varchar(150) DEFAULT NULL,
  `label_count` varchar(150) DEFAULT NULL,
  `total_label_count` varchar(150) DEFAULT NULL,
  `created_date` varchar(150) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `uom` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5239 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `plateforms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `production_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `work_order` varchar(100) NOT NULL,
  `queue` varchar(100) NOT NULL,
  `due_by` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `part_nbr` varchar(200) NOT NULL,
  `qty` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `product_dimensions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_number` varchar(150) DEFAULT NULL,
  `description` varchar(250) DEFAULT NULL,
  `length` decimal(20,1) DEFAULT NULL,
  `width` decimal(20,1) DEFAULT NULL,
  `height` decimal(20,1) DEFAULT NULL,
  `weight` decimal(20,1) DEFAULT NULL,
  `number_of_pallets` varchar(50) DEFAULT NULL,
  `number_of_boxes` varchar(50) DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `cycle_time` decimal(10,2) DEFAULT NULL,
  `pallet_size` varchar(90) DEFAULT NULL,
  `number_of_item_per_pallet` varchar(50) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=620 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `qa_capaComments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdDate` datetime NOT NULL,
  `createdBy` varchar(150) NOT NULL,
  `capaRequestId` int(11) NOT NULL,
  `action` varchar(700) DEFAULT NULL,
  `responsible` varchar(150) DEFAULT NULL,
  `targetDate` date DEFAULT NULL,
  `status` varchar(700) DEFAULT NULL,
  `remarks` varchar(700) DEFAULT NULL,
  `field` varchar(150) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `completedDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=185 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `qa_capaRequest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdBy` int(11) NOT NULL,
  `completedBy` varchar(100) DEFAULT NULL,
  `qir` varchar(255) DEFAULT NULL,
  `capaId` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `type1` varchar(150) DEFAULT NULL,
  `stakeholder` varchar(100) DEFAULT NULL,
  `owner` varchar(150) DEFAULT NULL,
  `priority` varchar(100) DEFAULT NULL,
  `createdDate` datetime NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `status` varchar(50) NOT NULL DEFAULT 'Open',
  `assignedTo` varchar(100) DEFAULT NULL,
  `assignedDate` varchar(50) DEFAULT NULL,
  `respondBy` varchar(50) DEFAULT NULL,
  `origRespondDate` date DEFAULT NULL,
  `issueComment` longtext,
  `issue_comment_html` longtext,
  `completedDate` datetime DEFAULT NULL,
  `verifiedBy` varchar(100) DEFAULT NULL,
  `verifiedDate` datetime DEFAULT NULL,
  `customerName` varchar(100) DEFAULT NULL,
  `purchaseOrder` varchar(100) DEFAULT NULL COMMENT 'WIll also include SO numbers',
  `CustomerPartNumber` varchar(200) DEFAULT NULL,
  `eyefiPartNumber` varchar(100) DEFAULT NULL,
  `confirmationCode` varchar(10) DEFAULT NULL,
  `firstName` varchar(150) DEFAULT NULL,
  `lastName` varchar(150) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `source` varchar(130) DEFAULT NULL,
  `failureType` varchar(150) DEFAULT NULL,
  `queueStatus` int(11) DEFAULT '0',
  `statusClosed` datetime DEFAULT NULL,
  `requestSubmitted` int(1) DEFAULT '0',
  `qtyAffected` int(11) DEFAULT NULL,
  `qtyAffected1` int(11) DEFAULT '0',
  `customerReportedDate` date DEFAULT NULL,
  `componentType` varchar(150) DEFAULT NULL,
  `platformType` varchar(150) DEFAULT NULL,
  `approved` int(1) NOT NULL DEFAULT '0',
  `cl_input_main_id` int(11) NOT NULL DEFAULT '0',
  `qaComments` varchar(5000) DEFAULT NULL,
  `supplierName` varchar(100) DEFAULT NULL,
  `casinoName` varchar(250) DEFAULT NULL,
  `typeSub` varchar(50) DEFAULT NULL,
  `eyefiSerialNumber` varchar(150) DEFAULT NULL,
  `fieldServiceSchedulerId` int(11) DEFAULT NULL,
  `installer` varchar(150) DEFAULT NULL,
  `lotNumber` varchar(150) DEFAULT NULL,
  `dueDate` varchar(250) DEFAULT NULL,
  `ncr_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `customerSerialNumber` text,
  `location` text,
  `cc_email` text,
  `warranty_replacement` varchar(50) DEFAULT NULL,
  `status_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `qir` (`qir`)
) ENGINE=InnoDB AUTO_INCREMENT=3924 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `qa_capaRootCause` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `comment` varchar(1200) NOT NULL,
  `rootCauseCode` varchar(150) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL,
  `capaRequestId` int(11) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=176 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `qa_capaTrans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` longtext,
  `n` longtext,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `so` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `partNumber` varchar(500) DEFAULT NULL,
  `capaId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11396 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `qa_form` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(150) NOT NULL,
  `name` varchar(600) NOT NULL,
  `description` varchar(800) NOT NULL DEFAULT '',
  `active` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `qir_response` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qir_number` int(11) DEFAULT '0',
  `findings` longtext,
  `document_control_response` longtext,
  `fs_engineering_reponse` longtext,
  `closure_date` longtext,
  `closure_by` longtext,
  `quality_team` longtext,
  `preliminary_investigation` date DEFAULT NULL,
  `customer_qir_number` text,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qir_number` (`qir_number`)
) ENGINE=InnoDB AUTO_INCREMENT=366 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `qir_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `code` varchar(50) DEFAULT NULL,
  `showInPublic` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=129 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `qualityPhotoChecklist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(500) NOT NULL,
  `checklist` varchar(500) NOT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `partNumber` varchar(100) NOT NULL,
  `samplePhoto` varchar(250) NOT NULL,
  `seq` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=282 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `qualityPhotos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `woNumber` int(11) NOT NULL,
  `name` varchar(500) NOT NULL,
  `checklist` varchar(500) NOT NULL,
  `fileUrl` varchar(800) DEFAULT NULL,
  `fileName` varchar(500) NOT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `submittedDate` datetime DEFAULT NULL,
  `submitedBy` int(11) DEFAULT NULL,
  `partNumber` varchar(255) DEFAULT NULL,
  `serialNumber` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `quality_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document_number` varchar(50) NOT NULL,
  `prefix` varchar(10) NOT NULL,
  `sequence_number` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL COMMENT 'Document category (e.g., quality_control, installation)',
  `department` enum('QA','ENG','OPS','MAINT') NOT NULL,
  `status` enum('draft','review','approved','obsolete') NOT NULL DEFAULT 'draft',
  `current_revision` int(11) NOT NULL DEFAULT '1',
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `obsoleted_by` varchar(100) DEFAULT NULL,
  `obsoleted_at` timestamp NULL DEFAULT NULL,
  `obsolete_reason` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_number` (`document_number`),
  KEY `idx_document_number` (`document_number`),
  KEY `idx_status` (`status`),
  KEY `idx_department` (`department`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_prefix_sequence` (`prefix`,`sequence_number`),
  CONSTRAINT `quality_documents_ibfk_1` FOREIGN KEY (`prefix`) REFERENCES `quality_document_sequences` (`prefix`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `quality_document_approvals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document_id` int(11) NOT NULL,
  `revision_id` int(11) NOT NULL,
  `approver_name` varchar(100) NOT NULL,
  `approver_role` varchar(50) NOT NULL,
  `approval_status` enum('pending','approved','rejected','delegated') NOT NULL DEFAULT 'pending',
  `approval_level` int(11) NOT NULL DEFAULT '1',
  `comments` text,
  `approved_at` timestamp NULL DEFAULT NULL,
  `delegated_to` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_document_approval` (`document_id`,`revision_id`),
  KEY `idx_approver` (`approver_name`),
  KEY `idx_status` (`approval_status`),
  KEY `idx_approval_level` (`approval_level`),
  KEY `revision_id` (`revision_id`),
  CONSTRAINT `quality_document_approvals_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `quality_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quality_document_approvals_ibfk_2` FOREIGN KEY (`revision_id`) REFERENCES `quality_revisions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `quality_document_sequences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prefix` varchar(10) NOT NULL,
  `current_number` int(11) NOT NULL DEFAULT '200',
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prefix` (`prefix`),
  KEY `idx_prefix` (`prefix`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `quality_permit_checklist_architects` (
  `id` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qpc_architect_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quality_permit_checklist_billing_defaults` (
  `form_type` enum('seismic','dca') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_key` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sort_order` int(11) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`form_type`,`fee_key`),
  KEY `idx_qpc_billing_defaults_sort` (`form_type`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quality_permit_checklist_customers` (
  `id` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qpc_customer_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quality_permit_checklist_tickets` (
  `ticket_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_type` enum('seismic','dca') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','saved','submitted','finalized','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `values_json` json NOT NULL,
  `field_updated_at_json` json NOT NULL,
  `process_notes_json` json NOT NULL,
  `financials_json` json NOT NULL,
  `attachments_json` json NOT NULL,
  PRIMARY KEY (`ticket_id`),
  KEY `idx_qpc_tickets_form_type` (`form_type`),
  KEY `idx_qpc_tickets_status` (`status`),
  KEY `idx_qpc_tickets_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quality_permit_checklist_transactions` (
  `id` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_timestamp` datetime NOT NULL,
  `actor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details_json` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_qpc_tx_ticket_id` (`ticket_id`),
  KEY `idx_qpc_tx_timestamp` (`event_timestamp`),
  CONSTRAINT `fk_qpc_tx_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `quality_permit_checklist_tickets` (`ticket_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quality_revisions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document_id` int(11) NOT NULL,
  `template_id` int(11) DEFAULT NULL COMMENT 'Links to checklist_templates',
  `revision_number` int(11) NOT NULL,
  `description` text NOT NULL,
  `changes_summary` text,
  `items_added` int(11) DEFAULT '0' COMMENT 'Number of checklist items added',
  `items_removed` int(11) DEFAULT '0' COMMENT 'Number of checklist items removed',
  `items_modified` int(11) DEFAULT '0' COMMENT 'Number of checklist items modified',
  `changes_detail` json DEFAULT NULL COMMENT 'Detailed change tracking from change detection',
  `status` enum('draft','review','approved','superseded') NOT NULL DEFAULT 'draft',
  `is_current` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `checksum` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_document_revision` (`document_id`,`revision_number`),
  KEY `idx_document_revision` (`document_id`,`revision_number`),
  KEY `idx_is_current` (`is_current`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_template` (`template_id`),
  CONSTRAINT `quality_revisions_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `quality_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=167 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `receiving` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` varchar(150) NOT NULL,
  `po_number` varchar(150) NOT NULL,
  `comments` varchar(800) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `title` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `inbound_or_pickup` varchar(150) DEFAULT NULL,
  `background_color` varchar(50) DEFAULT NULL,
  `text_color` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1261 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `refurb_incoming_inspections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_number` varchar(150) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `platform_type` varchar(150) NOT NULL,
  `component_type` varchar(150) NOT NULL,
  `part_number` varchar(150) NOT NULL,
  `condition_type` varchar(150) NOT NULL,
  `qty` int(11) NOT NULL,
  `serial_number` varchar(250) DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int(11) NOT NULL,
  `created_by_user` varchar(80) NOT NULL,
  `sales_type_transaction` varchar(50) DEFAULT NULL,
  `sales_transaction_date` datetime DEFAULT NULL,
  `sales_transaction_user` varchar(80) DEFAULT NULL,
  `logistics_type_transaction` varchar(50) DEFAULT NULL,
  `logistics_transaction_date` datetime DEFAULT NULL,
  `logistics_transaction_user` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `rfEquipment_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `sn` varchar(100) NOT NULL,
  `wifi` varchar(80) NOT NULL,
  `model` varchar(50) NOT NULL,
  `description` varchar(250) NOT NULL,
  `assignedTo` varchar(250) NOT NULL,
  `assignedDate` datetime DEFAULT NULL,
  `rfUsername` varchar(25) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `rfq` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_date` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT '0',
  `active` int(11) DEFAULT '1',
  `full_name` varchar(100) DEFAULT NULL,
  `emailToSendTo` text,
  `ccEmails` text,
  `bbEmails` text,
  `vendor` text,
  `subjectLine` text,
  `sod_nbr` text,
  `shipperName` text,
  `address` text,
  `city` text,
  `state` text,
  `zip` text,
  `phone` text,
  `requestorName` text,
  `contactName` text,
  `shippingHours` text,
  `readyDateTime` text,
  `puNumber` text,
  `poNumber` text,
  `poShippingFull` text,
  `appointmentRequired` text,
  `liftGateRequired` text,
  `bolFaxEmail` text,
  `dest_companyName` text,
  `dest_address` text,
  `dest_address2` text,
  `dest_city` text,
  `dest_state` text,
  `dest_zip` text,
  `dest_country` text,
  `dest_phone` text,
  `dest_contactName` text,
  `dest_deliveryNumber` text,
  `dest_deliveryDate` text,
  `dest_appointmentRequired` text,
  `descriptionOfProduct` text,
  `piecesQtyUoM` text,
  `piecesQty` text,
  `palletSizeInformationSendInfo` text,
  `weight` text,
  `value` text,
  `insuranceIncluded` text,
  `freightClass` text,
  `specialRequirements` text,
  `lines` text,
  `email_sent_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `rma` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rmaNumber` varchar(25) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `dateIssued3` varchar(20) DEFAULT NULL,
  `dateIssued` varchar(250) DEFAULT NULL,
  `customer` varchar(30) DEFAULT NULL,
  `partNumber` varchar(100) DEFAULT NULL,
  `qty` varchar(30) DEFAULT NULL,
  `tag_qn_number` varchar(30) DEFAULT NULL,
  `returnMethod` varchar(30) DEFAULT NULL,
  `returnType` varchar(50) DEFAULT NULL,
  `failureCode` varchar(80) DEFAULT NULL,
  `customerComment` varchar(1500) DEFAULT NULL,
  `notes` varchar(800) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `orderNumber` varchar(500) DEFAULT NULL,
  `partDescription` varchar(500) DEFAULT NULL,
  `qirNumber` varchar(500) DEFAULT NULL,
  `disposition` varchar(15) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=562 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `safety_incident` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(200) DEFAULT '',
  `last_name` varchar(200) DEFAULT '',
  `type_of_incident` varchar(200) DEFAULT '',
  `location_of_incident` varchar(200) DEFAULT '',
  `created_date` timestamp NULL DEFAULT NULL,
  `location_of_incident_other` varchar(300) DEFAULT '',
  `description_of_incident` varchar(2000) DEFAULT '',
  `created_by` int(11) DEFAULT NULL,
  `corrective_action_owner` varchar(300) DEFAULT '',
  `type_of_incident_other` varchar(300) DEFAULT '',
  `proposed_corrective_action` varchar(2000) DEFAULT '',
  `proposed_corrective_action_completion_date` varchar(300) DEFAULT '',
  `comments` varchar(2000) DEFAULT '',
  `confirmed_corrective_action_completion_date` varchar(100) DEFAULT '',
  `date_of_incident` date DEFAULT NULL,
  `time_of_incident` time DEFAULT NULL,
  `location_of_incident_other_other` varchar(300) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Open',
  `corrective_action_owner_user_id` int(11) DEFAULT NULL,
  `corrective_action_owner_user_email` text,
  `details_of_any_damage_or_personal_injury` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `safety_incident_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `notification_emails` text,
  `location` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=229 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `sales_order_report_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `serial_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eyefi_serial_id` int(11) NOT NULL COMMENT 'FK to eyefi_serial_numbers.id',
  `eyefi_serial_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Denormalized for quick access',
  `ul_label_id` int(11) DEFAULT NULL COMMENT 'FK to ul_labels.id (if applicable)',
  `ul_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Denormalized for quick access',
  `customer_type_id` int(11) NOT NULL COMMENT 'FK to customer_types.id',
  `customer_asset_id` int(11) DEFAULT NULL COMMENT 'FK to customer-specific table (polymorphic)',
  `generated_asset_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Generated asset number (denormalized)',
  `po_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_site` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wo_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Number',
  `wo_part` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Part Number',
  `wo_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Description',
  `wo_qty_ord` int(11) DEFAULT NULL COMMENT 'Work Order Ordered Quantity',
  `wo_due_date` date DEFAULT NULL COMMENT 'Work Order Due Date',
  `wo_routing` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Routing',
  `wo_line` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Line',
  `cp_cust_part` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer Part Number',
  `cp_cust` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer Name from WO',
  `inspector_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','consumed','cancelled','returned') COLLATE utf8mb4_unicode_ci DEFAULT 'consumed',
  `consumed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `consumed_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_voided` tinyint(1) DEFAULT '0' COMMENT '0=active, 1=voided',
  `voided_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` text COLLATE utf8mb4_unicode_ci,
  `requires_verification` tinyint(1) DEFAULT '0' COMMENT 'Whether this assignment requires physical verification',
  `verification_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'File path to verification photo',
  `verified_at` datetime DEFAULT NULL COMMENT 'When serial was physically verified',
  `verified_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Who verified the serial',
  `verification_session_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Session ID linking desktop and tablet',
  `verification_status` enum('pending','verified','failed','skipped') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'Verification status',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_type` enum('serial','asset_number') COLLATE utf8mb4_unicode_ci DEFAULT 'serial' COMMENT 'Type of EyeFi identifier: serial = traditional serial tag, asset_number = YYYYMMDDXXX format',
  `batch_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Groups assignments created together in a batch',
  PRIMARY KEY (`id`),
  KEY `idx_eyefi_serial_id` (`eyefi_serial_id`),
  KEY `idx_ul_label_id` (`ul_label_id`),
  KEY `idx_customer_type_id` (`customer_type_id`),
  KEY `idx_customer_asset_id` (`customer_asset_id`),
  KEY `idx_po_number` (`po_number`),
  KEY `idx_status` (`status`),
  KEY `idx_consumed_at` (`consumed_at`),
  KEY `idx_consumed_by` (`consumed_by`),
  KEY `idx_customer_po` (`customer_type_id`,`po_number`),
  KEY `idx_status_consumed` (`status`,`consumed_at`),
  KEY `idx_wo_number` (`wo_number`),
  KEY `idx_wo_part` (`wo_part`),
  KEY `idx_wo_due_date` (`wo_due_date`),
  KEY `idx_is_voided` (`is_voided`),
  KEY `idx_verification_session` (`verification_session_id`),
  KEY `idx_verification_status` (`verification_status`),
  KEY `idx_requires_verification` (`requires_verification`),
  KEY `idx_sa_asset_type` (`asset_type`),
  KEY `idx_batch_id` (`batch_id`),
  CONSTRAINT `fk_serial_assignments_customer_type` FOREIGN KEY (`customer_type_id`) REFERENCES `customer_types` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1688 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Serial number assignments with physical verification support via tablet companion system';

CREATE TABLE IF NOT EXISTS `serial_assignments_copy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eyefi_serial_id` int(11) NOT NULL COMMENT 'FK to eyefi_serial_numbers.id',
  `eyefi_serial_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Denormalized for quick access',
  `ul_label_id` int(11) DEFAULT NULL COMMENT 'FK to ul_labels.id (if applicable)',
  `ul_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Denormalized for quick access',
  `customer_type_id` int(11) NOT NULL COMMENT 'FK to customer_types.id',
  `customer_asset_id` int(11) DEFAULT NULL COMMENT 'FK to customer-specific table (polymorphic)',
  `generated_asset_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Generated asset number (denormalized)',
  `po_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_site` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wo_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Number',
  `wo_part` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Part Number',
  `wo_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Description',
  `wo_qty_ord` int(11) DEFAULT NULL COMMENT 'Work Order Ordered Quantity',
  `wo_due_date` date DEFAULT NULL COMMENT 'Work Order Due Date',
  `wo_routing` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Routing',
  `wo_line` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Line',
  `cp_cust_part` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer Part Number',
  `cp_cust` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer Name from WO',
  `inspector_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','consumed','cancelled','returned') COLLATE utf8mb4_unicode_ci DEFAULT 'consumed',
  `consumed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `consumed_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_voided` tinyint(1) DEFAULT '0' COMMENT '0=active, 1=voided',
  `voided_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` text COLLATE utf8mb4_unicode_ci,
  `requires_verification` tinyint(1) DEFAULT '0' COMMENT 'Whether this assignment requires physical verification',
  `verification_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'File path to verification photo',
  `verified_at` datetime DEFAULT NULL COMMENT 'When serial was physically verified',
  `verified_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Who verified the serial',
  `verification_session_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Session ID linking desktop and tablet',
  `verification_status` enum('pending','verified','failed','skipped') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'Verification status',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_type` enum('serial','asset_number') COLLATE utf8mb4_unicode_ci DEFAULT 'serial' COMMENT 'Type of EyeFi identifier: serial = traditional serial tag, asset_number = YYYYMMDDXXX format',
  `batch_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Groups assignments created together in a batch',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `unique_eyefi_serial_active` (`eyefi_serial_id`,`status`) USING BTREE,
  KEY `idx_eyefi_serial_id` (`eyefi_serial_id`) USING BTREE,
  KEY `idx_ul_label_id` (`ul_label_id`) USING BTREE,
  KEY `idx_customer_type_id` (`customer_type_id`) USING BTREE,
  KEY `idx_customer_asset_id` (`customer_asset_id`) USING BTREE,
  KEY `idx_po_number` (`po_number`) USING BTREE,
  KEY `idx_status` (`status`) USING BTREE,
  KEY `idx_consumed_at` (`consumed_at`) USING BTREE,
  KEY `idx_consumed_by` (`consumed_by`) USING BTREE,
  KEY `idx_customer_po` (`customer_type_id`,`po_number`) USING BTREE,
  KEY `idx_status_consumed` (`status`,`consumed_at`) USING BTREE,
  KEY `idx_wo_number` (`wo_number`) USING BTREE,
  KEY `idx_wo_part` (`wo_part`) USING BTREE,
  KEY `idx_wo_due_date` (`wo_due_date`) USING BTREE,
  KEY `idx_is_voided` (`is_voided`) USING BTREE,
  KEY `idx_verification_session` (`verification_session_id`) USING BTREE,
  KEY `idx_verification_status` (`verification_status`) USING BTREE,
  KEY `idx_requires_verification` (`requires_verification`) USING BTREE,
  KEY `idx_sa_asset_type` (`asset_type`) USING BTREE,
  KEY `idx_batch_id` (`batch_id`) USING BTREE,
  CONSTRAINT `serial_assignments_copy_ibfk_1` FOREIGN KEY (`customer_type_id`) REFERENCES `customer_types` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=661 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Serial number assignments with physical verification support via tablet companion system';

CREATE TABLE IF NOT EXISTS `serial_assignment_audit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignment_id` int(11) NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'created, voided, deleted, restored',
  `serial_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_id` int(11) NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_order_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_date` datetime DEFAULT NULL,
  `assigned_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci COMMENT 'Reason for void/delete',
  `performed_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User who performed this action',
  `performed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL COMMENT 'Additional context data',
  PRIMARY KEY (`id`),
  KEY `idx_assignment_id` (`assignment_id`),
  KEY `idx_serial_number` (`serial_number`),
  KEY `idx_work_order` (`work_order_number`),
  KEY `idx_performed_at` (`performed_at`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `serial_number_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `prefix` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template_id` (`template_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Templates for serial number generation';

CREATE TABLE IF NOT EXISTS `sgAssetGenerator` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timeStamp` datetime DEFAULT NULL,
  `poNumber` varchar(50) DEFAULT NULL,
  `property_site` varchar(50) DEFAULT NULL,
  `sgPartNumber` varchar(30) DEFAULT NULL,
  `inspectorName` varchar(40) DEFAULT NULL,
  `generated_SG_asset` varchar(150) DEFAULT NULL,
  `serialNumber` varchar(150) DEFAULT NULL,
  `lastUpdate` datetime DEFAULT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `manualUpdate` varchar(50) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6175 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `shipping_changes` (
  `data` json DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1432 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `shipping_cycle_times` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `partNumber` varchar(50) DEFAULT NULL,
  `desc1` text,
  `desc2` text,
  `part_type` text,
  `cycleTime` decimal(10,2) DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL,
  `updatedBy` varchar(150) DEFAULT NULL,
  `comments` varchar(900) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partNumber` (`partNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=22614 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `shipping_cycle_times_copy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `partNumber` varchar(50) DEFAULT NULL,
  `cycleTime` decimal(10,2) DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL,
  `comments` varchar(900) DEFAULT NULL,
  `updatedBy` varchar(150) DEFAULT NULL,
  `picking_updated_by` varchar(55) DEFAULT NULL,
  `picking_updated_date` datetime DEFAULT NULL,
  `picking_comments` varchar(500) DEFAULT NULL,
  `picking_cycle_time` int(11) DEFAULT NULL,
  `cycleTimeOriginal` varchar(155) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `partNumber` (`partNumber`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `shipping_priorities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(50) NOT NULL COMMENT 'Reference to the order (e.g., SO number or internal ID)',
  `sales_order_number` varchar(50) NOT NULL COMMENT 'Sales order number for easy reference',
  `sales_order_line` varchar(10) DEFAULT NULL COMMENT 'Sales order line number if applicable',
  `priority_level` int(11) NOT NULL COMMENT 'Priority level (1=highest priority)',
  `notes` text COMMENT 'Optional notes about why this order has priority',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) NOT NULL COMMENT 'User who set the priority',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(50) DEFAULT NULL COMMENT 'User who last updated the priority',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Whether this priority is currently active',
  PRIMARY KEY (`id`),
  KEY `idx_shipping_priorities_order_id` (`order_id`),
  KEY `idx_shipping_priorities_so_number` (`sales_order_number`),
  KEY `idx_shipping_priorities_priority` (`priority_level`),
  KEY `idx_shipping_priorities_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=1715 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `shortageRequest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `jobNumber` varchar(500) NOT NULL,
  `woNumber` varchar(300) DEFAULT NULL,
  `lineNumber` varchar(100) DEFAULT '0',
  `dueDate` date NOT NULL,
  `reasonPartNeeded` varchar(100) NOT NULL,
  `priority` varchar(11) DEFAULT 'false',
  `partNumber` varchar(50) NOT NULL,
  `qty` int(11) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT '1',
  `status` varchar(10) NOT NULL DEFAULT '',
  `deleted_main_date` datetime DEFAULT NULL,
  `deleted_main_user` varchar(150) DEFAULT NULL,
  `active_line` int(11) NOT NULL DEFAULT '1',
  `comments` varchar(700) DEFAULT '',
  `partDesc` varchar(150) DEFAULT NULL,
  `buyer` varchar(50) DEFAULT NULL,
  `assemblyNumber` varchar(150) DEFAULT NULL,
  `supplyCompleted` datetime DEFAULT NULL,
  `receivingCompleted` datetime DEFAULT NULL,
  `deliveredCompleted` datetime DEFAULT NULL,
  `supplyCompletedBy` int(11) DEFAULT '0',
  `receivingCompletedBy` int(11) DEFAULT '0',
  `deliveredCompletedBy` int(11) DEFAULT '0',
  `productionIssuedDate` datetime DEFAULT NULL,
  `productionIssuedBy` int(11) DEFAULT NULL,
  `graphicsShortage` varchar(11) DEFAULT 'false',
  `poNumber` varchar(150) DEFAULT '',
  `supplier` varchar(150) DEFAULT '',
  `mrfId` text,
  `mrf_line` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11076 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `signatures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(26) NOT NULL,
  `Title` varchar(39) NOT NULL,
  `Email` varchar(41) NOT NULL,
  `officePhone` varchar(23) DEFAULT NULL,
  `officePhone2` varchar(24) DEFAULT NULL,
  `mobilePhone` varchar(12) DEFAULT NULL,
  `Address1` varchar(27) DEFAULT NULL,
  `Address2` varchar(27) DEFAULT NULL,
  `location` varchar(50) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zipCode` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `so_overdue_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `so_line` varchar(500) NOT NULL DEFAULT '0',
  `so_nbr` text,
  `part_number` text,
  `open_qty` text,
  `due_date` date DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  `unique_id` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id` (`unique_id`)
) ENGINE=InnoDB AUTO_INCREMENT=274 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `so_priorities` (
  `so_number` varchar(50) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT '50',
  `updated_by` varchar(100) NOT NULL,
  `updated_date` datetime NOT NULL,
  `reason` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`so_number`),
  KEY `idx_so_priority_value` (`priority`),
  KEY `idx_so_priority_user` (`updated_by`),
  KEY `idx_so_priority_date` (`updated_date`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `states` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `abbr` varchar(23) NOT NULL,
  `name` varchar(250) NOT NULL,
  `country` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=53 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `supplyReviewCodes_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `supply_chain` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer` varchar(150) DEFAULT NULL,
  `partNumber` varchar(150) DEFAULT NULL,
  `subBom` varchar(150) DEFAULT NULL,
  `forecastType` varchar(150) DEFAULT NULL,
  `action` varchar(150) DEFAULT NULL,
  `qty` varchar(150) DEFAULT NULL,
  `createdDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partNumber` (`partNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=999 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tableFilterSettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `data` json NOT NULL,
  `pageId` varchar(250) NOT NULL,
  `userId` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tableNumber` varchar(250) DEFAULT NULL,
  `table_name` varchar(250) DEFAULT NULL,
  `table_description` varchar(250) DEFAULT NULL,
  `table_default` int(11) DEFAULT NULL,
  `created_by_user` tinytext,
  `tf_active` int(11) DEFAULT '1',
  `is_public` int(11) DEFAULT NULL,
  `total_filters_applied` int(11) DEFAULT NULL,
  `is_default` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `tableSettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `data` json NOT NULL,
  `pageId` varchar(250) NOT NULL,
  `userId` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tableNumber` varchar(250) DEFAULT NULL,
  `table_name` varchar(250) DEFAULT NULL,
  `table_description` varchar(250) DEFAULT NULL,
  `table_default` int(11) DEFAULT NULL,
  `created_by_user` tinytext,
  `allState` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=953 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `tableSettingsOriginal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `data` json NOT NULL,
  `pageId` varchar(250) NOT NULL,
  `userId` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tableNumber` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=467 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `time_tracker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `created_by_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=404 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `time_tracker_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `time_tracker_id` int(11) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=372 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `training_attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `sign_in_time` datetime NOT NULL,
  `attendance_duration` int(11) DEFAULT NULL,
  `badge_scanned` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_info` text,
  `is_late_arrival` tinyint(1) DEFAULT '0',
  `notes` text,
  `created_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_employee_attendance` (`session_id`,`employee_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_sign_in_time` (`sign_in_time`),
  KEY `idx_badge_scanned` (`badge_scanned`),
  KEY `idx_training_attendance_session_time` (`session_id`,`sign_in_time`),
  CONSTRAINT `training_attendance_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `training_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `training_attendees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `is_required` tinyint(1) DEFAULT '1',
  `notification_sent` tinyint(1) DEFAULT '0',
  `added_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `added_by` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_employee` (`session_id`,`employee_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_training_attendees_session_required` (`session_id`,`is_required`),
  CONSTRAINT `training_attendees_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `training_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=170 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `training_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `color_code` varchar(7) DEFAULT '#007bff',
  `icon_class` varchar(50) DEFAULT 'las la-graduation-cap',
  `is_active` tinyint(1) DEFAULT '1',
  `created_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `training_scan_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `badge_number` varchar(50) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `scan_result` enum('SUCCESS','BADGE_NOT_FOUND','ALREADY_SIGNED_IN','SESSION_NOT_FOUND','DATABASE_ERROR','VALIDATION_ERROR') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_info` text,
  `scan_timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_badge_number` (`badge_number`),
  KEY `idx_scan_timestamp` (`scan_timestamp`),
  KEY `idx_scan_result` (`scan_result`),
  CONSTRAINT `fk_scan_log_session` FOREIGN KEY (`session_id`) REFERENCES `training_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `training_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `purpose` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `duration_minutes` int(11) GENERATED ALWAYS AS ((time_to_sec(timediff(`end_time`,`start_time`)) / 60)) STORED,
  `location` varchar(255) NOT NULL,
  `facilitator_name` varchar(255) NOT NULL,
  `facilitator_signature` longtext,
  `status` enum('scheduled','in-progress','completed','cancelled') DEFAULT 'scheduled',
  `created_by` int(11) NOT NULL,
  `created_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category_id` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  KEY `category_id` (`category_id`),
  KEY `idx_training_sessions_date_status` (`date`,`status`),
  CONSTRAINT `training_sessions_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `training_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `training_session_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `title_template` varchar(255) NOT NULL,
  `description_template` text,
  `purpose_template` varchar(255) DEFAULT NULL,
  `default_duration_minutes` int(11) DEFAULT '60',
  `default_location` varchar(255) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int(11) NOT NULL,
  `created_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`),
  CONSTRAINT `training_session_templates_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `training_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ul_audit_signoffs` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `audit_date` date NOT NULL COMMENT 'Date of the audit',
  `auditor_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of the auditor',
  `auditor_signature` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Electronic signature',
  `items_audited` int(11) NOT NULL DEFAULT '0' COMMENT 'Number of items audited',
  `ul_numbers` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JSON array of UL numbers audited',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Audit notes',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_date` (`audit_date`),
  KEY `idx_auditor` (`auditor_name`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks UL New audit sign-offs';

CREATE TABLE IF NOT EXISTS `ul_labels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ul_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `certification_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `label_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `is_consumed` tinyint(1) DEFAULT '0' COMMENT 'True if UL label has been assigned/consumed',
  `consumed_at` datetime DEFAULT NULL COMMENT 'Timestamp when UL label was consumed',
  `consumed_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User who consumed the UL label',
  `assignment_id` int(11) DEFAULT NULL COMMENT 'FK to serial_assignments.id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ul_number` (`ul_number`),
  KEY `idx_ul_number` (`ul_number`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`),
  KEY `idx_expiry_date` (`expiry_date`),
  KEY `idx_ul_labels_created_at` (`created_at`),
  KEY `idx_ul_labels_manufacturer` (`manufacturer`),
  KEY `idx_ul_labels_part_number` (`part_number`),
  KEY `idx_is_consumed` (`is_consumed`),
  KEY `idx_consumed_at` (`consumed_at`),
  KEY `idx_assignment_id` (`assignment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ul_label_usages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ul_label_id` int(11) NOT NULL,
  `ul_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eyefi_serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_used` int(11) NOT NULL DEFAULT '1',
  `date_used` date NOT NULL,
  `user_signature` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `wo_nbr` int(11) DEFAULT NULL COMMENT 'Work Order Number',
  `wo_due_date` date DEFAULT NULL COMMENT 'Work Order Due Date',
  `wo_part` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Part Number',
  `wo_qty_ord` int(11) DEFAULT NULL COMMENT 'Work Order Quantity Ordered',
  `wo_routing` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Routing',
  `wo_line` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Work Order Line',
  `wo_description` text COLLATE utf8mb4_unicode_ci COMMENT 'Work Order Description',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `is_voided` tinyint(1) NOT NULL DEFAULT '0',
  `void_reason` text COLLATE utf8mb4_unicode_ci,
  `void_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ul_label_id` (`ul_label_id`),
  KEY `idx_ul_number` (`ul_number`),
  KEY `idx_date_used` (`date_used`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_eyefi_serial` (`eyefi_serial_number`),
  KEY `idx_user_name` (`user_name`),
  KEY `idx_ul_label_usages_created_at` (`created_at`),
  KEY `idx_wo_nbr` (`wo_nbr`),
  KEY `idx_wo_part` (`wo_part`),
  KEY `idx_wo_due_date` (`wo_due_date`),
  KEY `idx_is_voided` (`is_voided`),
  CONSTRAINT `ul_label_usages_ibfk_1` FOREIGN KEY (`ul_label_id`) REFERENCES `ul_labels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=300 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='UL Label usage tracking with work order information. Updated 2025-09-24 to include work order fields.';

CREATE TABLE IF NOT EXISTS `userTrans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `so` varchar(255) DEFAULT NULL,
  `type` varchar(100) NOT NULL,
  `partNumber` varchar(500) NOT NULL,
  `reasonCode` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=429788 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_department_assignments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL COMMENT 'User assigned to department',
  `department_id` bigint(20) NOT NULL COMMENT 'Department the user belongs to',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_department` (`user_id`,`department_id`),
  KEY `idx_user_dept_user` (`user_id`),
  KEY `idx_user_dept_department` (`department_id`),
  KEY `idx_user_dept_active` (`is_active`),
  CONSTRAINT `user_department_assignments_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Links users to departments for org chart';

CREATE TABLE IF NOT EXISTS `user_owners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'User ID from users table',
  `owner_id` int(11) NOT NULL COMMENT 'Owner ID from owners table',
  `can_assign` tinyint(1) DEFAULT '1' COMMENT 'Whether user can assign this owner to work orders',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_owner` (`user_id`,`owner_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_owner_id` (`owner_id`),
  CONSTRAINT `user_owners_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Maps which owners each user can see and assign';

CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(500) DEFAULT NULL,
  `user_id` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `user_permission_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(500) DEFAULT NULL,
  `value` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `vehicleInformation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `department` varchar(25) DEFAULT NULL,
  `vehicleMake` varchar(25) DEFAULT NULL,
  `year` varchar(5) DEFAULT NULL,
  `vin` varchar(150) DEFAULT NULL,
  `exp` varchar(50) DEFAULT NULL,
  `vehicleNumber` varchar(25) DEFAULT NULL,
  `mileage` int(11) DEFAULT NULL,
  `lastServiceDate` text,
  `typeOfService` text,
  `fuelType` varchar(25) DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `licensePlate` varchar(140) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `inMaintenance` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `verification_audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(50) NOT NULL,
  `assignment_id` int(11) DEFAULT NULL COMMENT 'Can be NULL for workflow verification',
  `action` varchar(50) NOT NULL COMMENT 'session_created, photo_uploaded, ocr_completed, verification_completed, session_expired',
  `details` json DEFAULT NULL COMMENT 'Additional action details',
  `performed_by` varchar(100) DEFAULT NULL,
  `performed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_assignment` (`assignment_id`),
  KEY `idx_action` (`action`),
  CONSTRAINT `verification_audit_log_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `serial_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb4 COMMENT='Audit trail for verification activities';

CREATE TABLE IF NOT EXISTS `verification_sessions` (
  `id` varchar(50) NOT NULL COMMENT 'Unique session ID (UUID)',
  `assignment_id` int(11) DEFAULT NULL COMMENT 'Foreign key to serial_assignments (NULL for workflow verification before DB save)',
  `expected_ul` varchar(100) DEFAULT NULL COMMENT 'The expected UL number for reference',
  `session_status` enum('active','completed','expired') DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL COMMENT 'Session expiration time (5 minutes)',
  `verified_at` datetime DEFAULT NULL,
  `match_result` enum('pending','partial','complete','mismatch') DEFAULT 'pending' COMMENT 'Batch verification status',
  `error_message` text,
  `expected_serials` json NOT NULL COMMENT 'JSON array of all expected serial numbers to verify',
  `captured_serials` json DEFAULT NULL COMMENT 'JSON array of serials found across all photos',
  `photos` json DEFAULT NULL COMMENT 'JSON array of photo submissions with extracted serials',
  `serials_found` int(11) DEFAULT '0' COMMENT 'Count of serials successfully matched',
  `serials_expected` int(11) DEFAULT '0' COMMENT 'Total count of expected serials',
  PRIMARY KEY (`id`),
  KEY `idx_assignment` (`assignment_id`),
  KEY `idx_status` (`session_status`),
  KEY `idx_expires` (`expires_at`),
  KEY `idx_match_result` (`match_result`),
  CONSTRAINT `verification_sessions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `serial_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks verification sessions between desktop and tablet';

CREATE TABLE IF NOT EXISTS `wedge_form` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_number` varchar(50) NOT NULL,
  `description` varchar(700) NOT NULL,
  `description_of_rework` varchar(700) NOT NULL,
  `packaging_labeling_details` varchar(700) NOT NULL,
  `part_rework` varchar(150) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `work_order_number` varchar(50) NOT NULL,
  `job_number` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `weekly_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employees` varchar(150) NOT NULL DEFAULT '11',
  `weekRange` varchar(150) DEFAULT NULL,
  `dateRange` varchar(250) DEFAULT NULL,
  `pickers` int(11) DEFAULT NULL,
  `date` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=197 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `weekly_users_copy_DELETE` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employees` varchar(150) NOT NULL DEFAULT '11',
  `weekRange` varchar(150) DEFAULT NULL,
  `dateRange` varchar(250) DEFAULT NULL,
  `pickers` int(11) DEFAULT NULL,
  `date` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `workOrderOwner` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userName` varchar(80) DEFAULT NULL,
  `so` varchar(250) NOT NULL,
  `fs_install` varchar(15) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `lastModDate` datetime DEFAULT NULL,
  `lastModUser` int(11) NOT NULL DEFAULT '0',
  `fs_install_date` date DEFAULT NULL,
  `arrivalDate` date DEFAULT NULL,
  `shipViaAccount` varchar(50) DEFAULT NULL,
  `source_inspection_required` varchar(50) DEFAULT NULL,
  `source_inspection_completed` varchar(50) DEFAULT NULL,
  `source_inspection_waived` varchar(10) DEFAULT 'false',
  `pallet_count` varchar(50) DEFAULT NULL,
  `container` varchar(350) DEFAULT NULL,
  `container_due_date` varchar(150) DEFAULT NULL,
  `last_mod_info` varchar(255) DEFAULT NULL,
  `tj_po_number` varchar(250) DEFAULT NULL,
  `tj_due_date` varchar(50) DEFAULT NULL,
  `g2e_comments` varchar(300) DEFAULT NULL,
  `shortages_review` varchar(11) DEFAULT NULL,
  `recoveryDate` varchar(80) DEFAULT NULL,
  `lateReasonCode` varchar(150) DEFAULT NULL,
  `lateReasonCodePerfDate` varchar(150) DEFAULT NULL,
  `recoveryDateComment` varchar(800) DEFAULT NULL,
  `supplyReview` varchar(150) DEFAULT NULL,
  `shipping_db_status` varchar(300) DEFAULT NULL,
  `clear_to_build_status` varchar(160) DEFAULT NULL,
  `hot_order` varchar(50) DEFAULT NULL,
  `lateReasonCodeComment` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so` (`so`)
) ENGINE=InnoDB AUTO_INCREMENT=48807 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `workOrderOwner_V1` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userName` varchar(80) DEFAULT NULL,
  `so` varchar(250) NOT NULL,
  `fs_install` varchar(15) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `lastModDate` datetime DEFAULT NULL,
  `lastModUser` int(11) NOT NULL DEFAULT '0',
  `fs_install_date` date DEFAULT NULL,
  `arrivalDate` date DEFAULT NULL,
  `shipViaAccount` varchar(50) DEFAULT NULL,
  `source_inspection_required` varchar(50) DEFAULT NULL,
  `source_inspection_completed` varchar(50) DEFAULT NULL,
  `source_inspection_waived` varchar(10) DEFAULT 'false',
  `pallet_count` varchar(50) DEFAULT NULL,
  `container` varchar(350) DEFAULT NULL,
  `container_due_date` varchar(150) DEFAULT NULL,
  `last_mod_info` varchar(255) DEFAULT NULL,
  `tj_po_number` varchar(250) DEFAULT NULL,
  `tj_due_date` varchar(50) DEFAULT NULL,
  `g2e_comments` varchar(300) DEFAULT NULL,
  `shortages_review` varchar(11) DEFAULT NULL,
  `recoveryDate` varchar(80) DEFAULT NULL,
  `lateReasonCode` varchar(150) DEFAULT NULL,
  `lateReasonCodePerfDate` varchar(150) DEFAULT NULL,
  `recoveryDateComment` varchar(800) DEFAULT NULL,
  `supplyReview` varchar(150) DEFAULT NULL,
  `shipping_db_status` varchar(300) DEFAULT NULL,
  `clear_to_build_status` varchar(160) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `so` (`so`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=38974 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `workOrderPrintDetails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignedTo` varchar(250) NOT NULL,
  `printedDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` int(11) NOT NULL,
  `workOrder` int(11) NOT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `filterSelections` varchar(150) DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `workOrder` (`workOrder`)
) ENGINE=InnoDB AUTO_INCREMENT=27555 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `work_order_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_number` varchar(60) NOT NULL,
  `qty_required` varchar(50) NOT NULL,
  `due_date` date NOT NULL,
  `notes` varchar(800) NOT NULL,
  `created_by` varchar(105) NOT NULL,
  `created_date` datetime NOT NULL,
  `completed_date` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ws` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(250) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1 COMMENT='Wood Shop Categories';

CREATE TABLE IF NOT EXISTS `ws_auto` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `partNumber` varchar(25) DEFAULT NULL,
  `palletSize` varchar(14) DEFAULT NULL,
  `palletQty` varchar(11) DEFAULT NULL,
  `onHand` int(11) DEFAULT NULL,
  `lastCountDate` datetime DEFAULT NULL,
  `pallet_size_qad` varchar(255) NOT NULL,
  `qtyPer` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partNumber` (`partNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=995 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `ws_header` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(250) NOT NULL,
  `ws_list_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ws_input` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrder` int(11) NOT NULL,
  `qtyCompleted` int(11) NOT NULL,
  `palletQty` int(11) NOT NULL,
  `palletSize` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ws_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ws_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ws_req` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `typeOfRequest` varchar(150) NOT NULL,
  `size` varchar(250) NOT NULL,
  `productionDemand` int(11) NOT NULL,
  `comments` varchar(550) DEFAULT '',
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dueDate` date NOT NULL,
  `jobNumber` varchar(30) DEFAULT NULL,
  `qtyCompleted` int(11) NOT NULL DEFAULT '0',
  `productionLine` varchar(50) DEFAULT NULL,
  `workOrderNumber` varchar(250) DEFAULT NULL,
  `partNumber` varchar(255) DEFAULT NULL,
  `qtyOnSalesOrder` int(11) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `transferNumber` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=842 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ws_trans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `so` varchar(255) DEFAULT NULL,
  `type` varchar(100) NOT NULL,
  `partNumber` varchar(500) NOT NULL,
  `reasonCode` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1904 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `yellowfishMostUsed` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `partNumber` varchar(50) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `date` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1197 DEFAULT CHARSET=utf8;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
