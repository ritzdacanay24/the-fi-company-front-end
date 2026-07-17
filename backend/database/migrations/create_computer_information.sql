CREATE TABLE IF NOT EXISTS `computer_information` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `computer_type` varchar(120) DEFAULT NULL,
  `asset_tag` varchar(80) DEFAULT NULL,
  `computer_name` varchar(120) DEFAULT NULL,
  `model_name` varchar(120) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `department` varchar(60) DEFAULT NULL,
  `assigned_to` varchar(120) DEFAULT NULL,
  `operating_system` varchar(120) DEFAULT NULL,
  `created_by` int(11) NOT NULL DEFAULT 0,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT 1,
  `include_in_inspection_report` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_computer_information_asset_tag` (`asset_tag`),
  KEY `idx_computer_information_active` (`active`),
  KEY `idx_computer_information_include_report` (`include_in_inspection_report`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
