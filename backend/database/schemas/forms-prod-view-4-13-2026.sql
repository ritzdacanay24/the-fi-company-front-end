/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE TABLE IF NOT EXISTS `authCode` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(500) NOT NULL,
  `description` varchar(150) NOT NULL,
  `name1` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `changeLog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `version` varchar(150) NOT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` varchar(150) NOT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `description` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `changeLogDetails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `changeLogId` int(11) NOT NULL,
  `type` varchar(150) NOT NULL,
  `description` varchar(500) NOT NULL,
  `title` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dashPerformance` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `memoryUsage` decimal(18,2) DEFAULT NULL,
  `memoryUsageConvert` varchar(100) DEFAULT NULL,
  `processes` int(11) DEFAULT NULL,
  `dateTime` datetime DEFAULT NULL,
  `cpuUsage` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=110785 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dashSupport` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `createdBy` int(11) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `details` longtext,
  `createDate` datetime DEFAULT NULL,
  `link` varchar(250) DEFAULT NULL,
  `status` int(11) DEFAULT '0',
  `priority` varchar(50) DEFAULT NULL,
  `active` int(1) NOT NULL DEFAULT '1',
  `noHtmlComment` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dashSupportCodes` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dashSupportComments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `comments` longtext NOT NULL,
  `createdBy` int(11) NOT NULL,
  `createdDate` datetime NOT NULL,
  `dashSupportId` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `db_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(64) NOT NULL,
  `option_value` longtext NOT NULL,
  `autoload` varchar(20) NOT NULL DEFAULT 'yes',
  `active` int(11) NOT NULL DEFAULT '1',
  `description` longtext NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `option_name` (`option_name`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=latin1;

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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores department structure and hierarchy for organizational chart';

CREATE TABLE IF NOT EXISTS `emp` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Division` varchar(10) DEFAULT NULL,
  `Location` varchar(9) DEFAULT NULL,
  `LastName` varchar(17) DEFAULT NULL,
  `FirstName` varchar(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `errors` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `file` varchar(500) DEFAULT NULL,
  `user` varchar(50) DEFAULT NULL,
  `dateTime` datetime DEFAULT NULL,
  `errorCode` varchar(500) DEFAULT NULL,
  `errorDetail` varchar(755) DEFAULT NULL,
  `query` varchar(755) DEFAULT NULL,
  `link` varchar(755) DEFAULT NULL,
  `field` varchar(150) NOT NULL,
  `ipAddress` varchar(150) NOT NULL,
  `computerName` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=167779 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `jobPositions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `licences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(150) NOT NULL,
  `product` varchar(25) NOT NULL,
  `keyNum` varchar(500) NOT NULL,
  `experationDate` date DEFAULT NULL,
  `maintenance` varchar(50) NOT NULL,
  `description` varchar(250) NOT NULL,
  `orderNum` varchar(150) NOT NULL,
  `orderedDate` date DEFAULT NULL,
  `serialNumber` varchar(70) NOT NULL,
  `link` varchar(700) NOT NULL,
  `userId` varchar(300) NOT NULL,
  `price` varchar(250) NOT NULL,
  `contactNumber` varchar(30) NOT NULL,
  `company` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `userId` int(11) DEFAULT NULL,
  `userName` varchar(150) DEFAULT NULL,
  `link` varchar(400) NOT NULL,
  `hashPath` varchar(200) NOT NULL,
  `ipaddress` varchar(100) DEFAULT NULL,
  `dateTime` datetime DEFAULT NULL,
  `filename` varchar(200) DEFAULT NULL,
  `query` varchar(800) DEFAULT NULL,
  `source` varchar(200) DEFAULT NULL,
  `browserName` varchar(100) DEFAULT NULL,
  `browserVersion` varchar(100) DEFAULT NULL,
  `browserPlatform` varchar(100) DEFAULT NULL,
  `userAgent` varchar(200) DEFAULT NULL,
  `loadTime` decimal(20,2) DEFAULT NULL,
  `computerName` varchar(100) NOT NULL,
  `lng` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `regionCode` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `regionName` varchar(100) DEFAULT NULL,
  `lat` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=33024 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `logInfo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `path` varchar(250) NOT NULL,
  `userId` varchar(150) NOT NULL,
  `createdDate` datetime NOT NULL,
  `userAgent` varchar(500) NOT NULL,
  `browserName` varchar(150) NOT NULL,
  `browserVersion` varchar(150) NOT NULL,
  `browserPlatform` varchar(150) NOT NULL,
  `query` varchar(800) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `name` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1142125 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `navigation` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `pid` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `active` int(11) DEFAULT '1',
  `seq` int(11) DEFAULT NULL,
  `path` varchar(100) NOT NULL,
  `icon` varchar(150) NOT NULL,
  `accessReq` varchar(1) NOT NULL DEFAULT 'Y',
  `display` varchar(1) NOT NULL DEFAULT 'Y',
  `icomoon` varchar(150) NOT NULL,
  `controller` varchar(150) NOT NULL,
  `controllerAs` varchar(150) NOT NULL,
  `controllerFiles` longtext NOT NULL,
  `template` varchar(150) NOT NULL,
  `cache` int(1) NOT NULL DEFAULT '1',
  `activated` int(11) NOT NULL DEFAULT '1',
  `otherFiles` varchar(800) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `path` (`path`)
) ENGINE=InnoDB AUTO_INCREMENT=242 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `navigationFavorites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pageId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `path` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=443 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orgTrans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createDate` datetime DEFAULT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `type` varchar(100) NOT NULL,
  `createdBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `qadTableNames` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(250) DEFAULT NULL,
  `tbl` varchar(100) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT '0',
  `noData` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1387 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `queries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `query` longtext NOT NULL,
  `createdDate` datetime NOT NULL,
  `createdBy` int(11) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `roles` varchar(255) NOT NULL,
  `userId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` char(255) NOT NULL,
  `data` longtext NOT NULL,
  `last_accessed` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `value` tinyint(1) NOT NULL DEFAULT '0',
  `text` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings_bk` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `value` tinyint(1) NOT NULL DEFAULT '0',
  `text` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `shipment_report` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ship_date` date NOT NULL,
  `shipped_value` decimal(10,3) NOT NULL,
  `due_date` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `test` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ipaddress` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `token` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(400) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  `field` varchar(255) DEFAULT NULL,
  `createdDate` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `trans` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `field` varchar(500) DEFAULT NULL,
  `o` varchar(500) DEFAULT NULL,
  `n` varchar(500) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `ipAddress` varchar(100) DEFAULT NULL,
  `computerName` varchar(100) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14817 DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks UL New audit sign-offs';

CREATE TABLE IF NOT EXISTS `useraccess` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `active` int(11) DEFAULT '1',
  `userId` int(11) DEFAULT NULL,
  `writeGranted` int(1) NOT NULL DEFAULT '0',
  `readGranted` int(1) NOT NULL DEFAULT '0',
  `pageId` int(11) NOT NULL,
  `route_name` varchar(250) DEFAULT NULL,
  `route_title` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=496 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `parentId` varchar(255) DEFAULT '329',
  `first` varchar(255) DEFAULT NULL,
  `last` varchar(255) DEFAULT NULL,
  `workArea` varchar(1200) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `area` varchar(100) DEFAULT NULL,
  `department` mediumtext,
  `email` varchar(255) DEFAULT NULL,
  `workPhone` varchar(15) DEFAULT NULL,
  `createdDate` varchar(100) DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `pass` varchar(255) DEFAULT NULL,
  `admin` int(1) DEFAULT '0',
  `attempts` int(3) DEFAULT NULL,
  `access` varchar(50) DEFAULT NULL,
  `employeeType1` varchar(150) DEFAULT NULL,
  `loggedIn` int(1) DEFAULT '0',
  `state` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `type` int(11) NOT NULL DEFAULT '0' COMMENT '0 = employee, 1 = host, 2 = internal, 3 = departments, 4 = external',
  `employeeType` int(1) DEFAULT NULL COMMENT '-1 = Dev., 0 = regular, 1 = lead, 2 = supervisor, 3 = manager, 4 director',
  `lastUpdate` datetime DEFAULT NULL,
  `lastLoggedIn` datetime DEFAULT NULL,
  `image` varchar(150) DEFAULT 'https://dashboard.eye-fi.com/attachments/images/employees/default-user.png',
  `fileName` varchar(150) DEFAULT 'default-logo.jpg',
  `address` varchar(150) DEFAULT NULL,
  `address1` varchar(150) DEFAULT NULL,
  `zipCode` int(11) DEFAULT NULL,
  `settings` varchar(500) DEFAULT NULL,
  `leadInstaller` int(1) DEFAULT '0' COMMENT 'Used for field service',
  `orgChartPlaceHolder` int(1) DEFAULT '0',
  `company_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `isEmployee` int(11) DEFAULT '1',
  `enableTwostep` int(11) DEFAULT '0',
  `showImage` int(11) DEFAULT '1',
  `openPosition` int(11) DEFAULT '0',
  `hire_date` mediumtext,
  `org_chart_department` text,
  `org_chart_expand` int(11) DEFAULT '0',
  `color` text,
  `geo_location_consent` datetime DEFAULT NULL,
  `card_number` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=635 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `usersTemp` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parentId` int(11) NOT NULL,
  `first` varchar(50) NOT NULL,
  `last` varchar(50) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `users_copy` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `parentId` varchar(255) NOT NULL DEFAULT '297',
  `first` varchar(255) DEFAULT NULL,
  `last` varchar(255) DEFAULT NULL,
  `workArea` varchar(150) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `area` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `workPhone` varchar(15) DEFAULT NULL,
  `createdDate` datetime DEFAULT NULL,
  `active` int(11) DEFAULT '1',
  `pass` varchar(255) DEFAULT NULL,
  `admin` int(1) DEFAULT '0',
  `attempts` int(3) DEFAULT '0',
  `access` int(1) DEFAULT '0',
  `employeeType1` varchar(150) DEFAULT NULL,
  `loggedIn` int(1) DEFAULT '0',
  `state` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `type` int(11) NOT NULL DEFAULT '0' COMMENT '0 = employee, 1 = host, 2 = internal, 3 = departments, 4 = external',
  `employeeType` int(1) NOT NULL DEFAULT '0' COMMENT '-1 = Dev., 0 = regular, 1 = lead, 2 = supervisor, 3 = manager, 4 director',
  `lastUpdate` datetime DEFAULT NULL,
  `lastLoggedIn` datetime DEFAULT NULL,
  `image` varchar(150) DEFAULT '/img/default-logo.jpg',
  `fileName` varchar(150) DEFAULT 'default-logo.jpg',
  `address` varchar(150) DEFAULT NULL,
  `address1` varchar(150) DEFAULT NULL,
  `zipCode` int(11) DEFAULT NULL,
  `settings` varchar(500) DEFAULT NULL,
  `leadInstaller` int(1) DEFAULT '0' COMMENT 'Used for field service',
  `orgChartPlaceHolder` int(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=346 DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS `user_permissions` (
  `up_id` int(11) NOT NULL AUTO_INCREMENT,
  `up_user_id` int(11) DEFAULT NULL,
  `up_name` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`up_id`),
  UNIQUE KEY `up_name` (`up_name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `user_permission_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(500) DEFAULT NULL,
  `value` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `user_rates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `rate` decimal(10,2) NOT NULL,
  `rate1` decimal(10,2) NOT NULL,
  `rate_old` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `forklift_checklist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date_created` datetime NOT NULL,
  `department` varchar(150) NOT NULL,
  `operator` varchar(150) NOT NULL,
  `model_number` varchar(50) NOT NULL,
  `shift` varchar(50) NOT NULL,
  `comments` varchar(800) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4566 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `forklift_checklist_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_name` varchar(250) NOT NULL,
  `checklist_name` varchar(250) NOT NULL,
  `status` varchar(5) NOT NULL,
  `need_maint` varchar(5) DEFAULT NULL,
  `forklift_checklist_id` int(11) NOT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `resolved_message` text,
  `resolved_date` datetime DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `resolved_confirmed_date` datetime DEFAULT NULL,
  `resolved_confirmed_by` int(11) DEFAULT NULL,
  `resolved_confirmed_message` text,
  `not_used` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100123 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `forklift_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `pickup_form` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requestorName` varchar(50) NOT NULL,
  `emailAddress` varchar(80) NOT NULL,
  `pickupDateTime` datetime NOT NULL,
  `streetAddress` varchar(150) NOT NULL,
  `city` varchar(50) NOT NULL,
  `state` varchar(50) NOT NULL,
  `zipCode` varchar(10) NOT NULL,
  `contactName` varchar(50) NOT NULL,
  `phoneNumber` varchar(15) DEFAULT NULL,
  `internalDeliveryLocation` varchar(50) NOT NULL,
  `comments` varchar(800) DEFAULT NULL,
  `createdDate` datetime NOT NULL,
  `createdById` int(11) NOT NULL,
  `completedDate` datetime DEFAULT NULL,
  `completedBy` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `shipping_checklist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `so` varchar(50) NOT NULL,
  `line` int(11) NOT NULL,
  `data` json DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_date` datetime NOT NULL,
  `pallets` int(11) NOT NULL,
  `boxes` int(11) NOT NULL,
  `shipping_qty` int(11) NOT NULL,
  `submitted_date` datetime DEFAULT NULL,
  `part_number` varchar(80) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=188 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `shipping_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requestorName` varchar(50) NOT NULL,
  `emailAddress` varchar(50) NOT NULL,
  `companyName` varchar(150) DEFAULT NULL,
  `streetAddress` varchar(150) DEFAULT NULL,
  `streetAddress1` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `zipCode` int(11) DEFAULT NULL,
  `contactName` varchar(150) NOT NULL,
  `phoneNumber` varchar(50) NOT NULL,
  `freightCharges` varchar(150) NOT NULL,
  `thridPartyAccountNumber` varchar(150) NOT NULL,
  `serviceTypeName` varchar(150) NOT NULL,
  `saturdayDelivery` varchar(10) DEFAULT NULL,
  `cost` int(11) DEFAULT NULL,
  `sendTrackingNumberTo` varchar(150) DEFAULT NULL,
  `comments` varchar(1500) DEFAULT NULL,
  `createdDate` datetime NOT NULL,
  `createdById` int(11) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  `serviceType` varchar(50) NOT NULL,
  `completedDate` timestamp NULL DEFAULT NULL,
  `completedBy` varchar(50) DEFAULT NULL,
  `trackingNumber` varchar(150) DEFAULT NULL,
  `sendTrackingEmail` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=317 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `truck_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start_location` varchar(250) DEFAULT NULL,
  `end_location` varchar(250) DEFAULT NULL,
  `start_mileage` int(11) DEFAULT NULL,
  `end_mileage` int(11) DEFAULT NULL,
  `date_time` datetime DEFAULT NULL,
  `created_by` varchar(150) NOT NULL,
  `created_date` datetime NOT NULL,
  `active` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `vehicleInspectionForm` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `licensePlateNumber` varchar(150) DEFAULT NULL,
  `comments` varchar(500) NOT NULL,
  `loadStraps` varchar(10) NOT NULL,
  `gas` varchar(15) NOT NULL,
  `oil` varchar(15) NOT NULL,
  `tires` varchar(15) NOT NULL,
  `fluids` varchar(15) NOT NULL,
  `electric` varchar(15) NOT NULL,
  `fireExt` varchar(15) NOT NULL,
  `image` longblob NOT NULL,
  `created_by` int(11) NOT NULL,
  `inspector_name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `vehicle_inspection_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_name` varchar(250) NOT NULL,
  `checklist_name` varchar(250) NOT NULL,
  `status` varchar(5) NOT NULL,
  `forklift_checklist_id` int(11) NOT NULL,
  `need_maint` varchar(5) DEFAULT NULL,
  `resolved_by` varchar(50) DEFAULT NULL,
  `resolved_by_date` date DEFAULT NULL,
  `resolved_by_notes` varchar(255) DEFAULT NULL,
  `resolved_confirmed_by` varchar(50) DEFAULT NULL,
  `resolved_confirmed_date` date DEFAULT NULL,
  `resolved_confirmed_notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10733 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `vehicle_inspection_header` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date_created` datetime NOT NULL,
  `truck_license_plate` varchar(250) NOT NULL,
  `comments` varchar(800) NOT NULL,
  `created_by` varchar(150) NOT NULL,
  `mileage` varchar(500) DEFAULT NULL,
  `not_used` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1709 DEFAULT CHARSET=latin1;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
