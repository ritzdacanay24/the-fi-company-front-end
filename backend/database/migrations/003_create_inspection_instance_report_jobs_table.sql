-- Migration: Create inspection_instance_report_jobs table
-- Purpose: Queue and track final PDF generation jobs for submitted inspection checklist instances
-- Date: 2026-05-13
-- Author: Copilot

CREATE TABLE IF NOT EXISTS eyefidb.inspection_instance_report_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instance_id INT NOT NULL,
    template_id INT NULL,
    template_revision_id INT NULL COMMENT 'Checklist template quality revision id at queue time',
    status ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued',
    error_message TEXT NULL,
    report_file_name VARCHAR(1024) NULL COMMENT 'Stored as URL/path to generated PDF for backward compatibility',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inspection_report_job_instance
      FOREIGN KEY (instance_id) REFERENCES eyefidb.checklist_instances(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_inspection_report_job_template
      FOREIGN KEY (template_id) REFERENCES eyefidb.checklist_templates(id)
      ON DELETE SET NULL,

    INDEX idx_report_job_instance_status (instance_id, status),
    INDEX idx_report_job_template_id (template_id),
    INDEX idx_report_job_template_revision_id (template_revision_id),
    INDEX idx_report_job_status_created (status, created_at),
    INDEX idx_report_job_instance_updated (instance_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Queue/state table for inspection checklist final PDF generation jobs';

-- Optional backfill: create jobs for already-submitted instances that do not yet have a completed report
INSERT INTO eyefidb.inspection_instance_report_jobs (instance_id, template_id, template_revision_id, status, created_at, updated_at)
SELECT ci.id, ci.template_id, ct.quality_revision_id, 'queued', NOW(), NOW()
FROM eyefidb.checklist_instances ci
LEFT JOIN eyefidb.checklist_templates ct ON ct.id = ci.template_id
LEFT JOIN eyefidb.inspection_instance_report_jobs rj
  ON rj.instance_id = ci.id
  AND rj.status IN ('queued', 'processing', 'completed')
WHERE ci.status = 'submitted'
  AND rj.id IS NULL;
