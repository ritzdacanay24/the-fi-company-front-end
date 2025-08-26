-- Job Connections Implementation - New Relationship Table
-- Create a new table specifically for job relationships (most robust solution)

CREATE TABLE `fs_job_connections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_job_id` int(11) NOT NULL,
  `connected_job_id` int(11) NOT NULL,
  `relationship_type` varchar(50) NOT NULL DEFAULT 'Related',
  `notes` text,
  `created_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100),
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_parent_job` (`parent_job_id`),
  KEY `idx_connected_job` (`connected_job_id`),
  KEY `idx_active` (`active`),
  UNIQUE KEY `unique_connection` (`parent_job_id`, `connected_job_id`, `relationship_type`),
  FOREIGN KEY (`parent_job_id`) REFERENCES `fs_scheduler`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`connected_job_id`) REFERENCES `fs_scheduler`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some sample data for testing (optional)
-- INSERT INTO `fs_job_connections` (`parent_job_id`, `connected_job_id`, `relationship_type`, `notes`, `created_by`) VALUES
-- (1, 2, 'Dependent', 'Job 2 depends on Job 1 completion', 'system'),
-- (1, 3, 'Related', 'Related installation work', 'system');

-- Add indexes for better performance
ALTER TABLE `fs_job_connections` ADD INDEX `idx_relationship_type` (`relationship_type`);
ALTER TABLE `fs_job_connections` ADD INDEX `idx_created_date` (`created_date`);
