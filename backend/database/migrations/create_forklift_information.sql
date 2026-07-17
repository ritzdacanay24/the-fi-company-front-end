CREATE TABLE IF NOT EXISTS `forklift_information` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `forklift_type` varchar(120) DEFAULT NULL,
  `unit_number` varchar(60) DEFAULT NULL,
  `model_name` varchar(120) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `department` varchar(60) DEFAULT NULL,
  `fuel_type` varchar(60) DEFAULT NULL,
  `year` varchar(10) DEFAULT NULL,
  `created_by` int(11) NOT NULL DEFAULT 0,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_forklift_information_unit_number` (`unit_number`),
  KEY `idx_forklift_information_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
