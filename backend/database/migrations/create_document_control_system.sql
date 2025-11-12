-- ===============================================================
-- ENTERPRISE DOCUMENT CONTROL SYSTEM
-- ===============================================================
-- Purpose: Implement proper document control for quality forms
-- Format: QA-FRM-373, Rev 1.00 (Document Number, Revision)
-- Complies with: ISO 9001, AS9100, and other quality standards
-- Date: 2025-11-12
-- ===============================================================

-- ==============================================
-- 1. Document Control Master Table
-- ==============================================
-- This table manages document numbers and metadata
-- One entry per document family (e.g., QA-FRM-373)
CREATE TABLE IF NOT EXISTS document_control (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Document Identification
    document_number VARCHAR(50) NOT NULL UNIQUE,  -- e.g., "QA-FRM-373"
    document_prefix VARCHAR(20) NOT NULL,          -- e.g., "QA-FRM"
    document_sequence INT NOT NULL,                -- e.g., 373
    document_title VARCHAR(255) NOT NULL,          -- e.g., "Pre-Deployment Checklist"
    
    -- Document Type & Category
    document_type ENUM('form', 'procedure', 'work_instruction', 'checklist', 'specification', 'drawing') DEFAULT 'form',
    category VARCHAR(100),                         -- e.g., "quality_control", "engineering"
    department VARCHAR(100),                       -- e.g., "Quality", "Engineering"
    
    -- Current Status
    current_revision VARCHAR(20) NOT NULL DEFAULT '1.00',  -- Current active revision
    current_template_id INT,                       -- Links to active checklist_template
    status ENUM('draft', 'in_review', 'approved', 'obsolete', 'superseded') DEFAULT 'draft',
    
    -- Ownership & Responsibility
    document_owner_id INT,                         -- Person responsible for document
    document_owner_name VARCHAR(100),
    approver_id INT,                               -- Person who approves changes
    approver_name VARCHAR(100),
    
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for fast lookup
    INDEX idx_doc_number (document_number),
    INDEX idx_prefix_sequence (document_prefix, document_sequence),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_owner (document_owner_id)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Master document control table - one record per document number';

-- ==============================================
-- 2. Document Revisions Table
-- ==============================================
-- Tracks all revisions of a document
-- Multiple entries per document (one per revision)
CREATE TABLE IF NOT EXISTS document_revisions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Links to document control
    document_control_id INT NOT NULL,
    document_number VARCHAR(50) NOT NULL,          -- Denormalized for easy queries
    
    -- Revision Information
    revision_number VARCHAR(20) NOT NULL,          -- e.g., "1.00", "2.00", "2.01"
    revision_major INT NOT NULL,                   -- e.g., 1, 2, 3
    revision_minor INT NOT NULL DEFAULT 0,         -- e.g., 00, 01, 02
    revision_letter VARCHAR(5),                    -- Optional: A, B, C (for draft revisions)
    
    -- Links to actual template
    template_id INT NOT NULL,                      -- Links to checklist_templates
    
    -- Revision Details
    revision_type ENUM('major', 'minor', 'correction', 'editorial') DEFAULT 'major',
    revision_description TEXT NOT NULL,            -- What changed
    reason_for_change TEXT,                        -- Why it changed
    
    -- Change Summary
    changes_summary JSON,                          -- Detailed changes from change detection
    items_added INT DEFAULT 0,
    items_removed INT DEFAULT 0,
    items_modified INT DEFAULT 0,
    
    -- Review & Approval
    status ENUM('draft', 'in_review', 'approved', 'rejected', 'obsolete') DEFAULT 'draft',
    reviewed_by INT,
    reviewed_by_name VARCHAR(100),
    reviewed_at TIMESTAMP NULL,
    approved_by INT,
    approved_by_name VARCHAR(100),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    
    -- Effectivity
    effective_date DATE,                           -- When this revision becomes active
    obsolete_date DATE,                            -- When superseded by newer revision
    
    -- Metadata
    created_by INT NOT NULL,
    created_by_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (document_control_id) REFERENCES document_control(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
    UNIQUE KEY uk_doc_revision (document_number, revision_number),
    
    -- Indexes
    INDEX idx_doc_control (document_control_id),
    INDEX idx_template (template_id),
    INDEX idx_status (status),
    INDEX idx_revision (revision_major, revision_minor),
    INDEX idx_effective_date (effective_date)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks all revisions of controlled documents';

-- ==============================================
-- 3. Update checklist_templates table
-- ==============================================
-- Add document control fields to existing templates
ALTER TABLE checklist_templates
ADD COLUMN IF NOT EXISTS document_number VARCHAR(50) NULL AFTER part_number,
ADD COLUMN IF NOT EXISTS revision_number VARCHAR(20) NULL AFTER document_number,
ADD COLUMN IF NOT EXISTS document_control_id INT NULL AFTER revision_number,
ADD INDEX idx_document_number (document_number),
ADD INDEX idx_document_control (document_control_id);

-- Add foreign key (if not exists)
-- Note: Run this separately if the column already exists
-- ALTER TABLE checklist_templates
-- ADD CONSTRAINT fk_template_document_control 
-- FOREIGN KEY (document_control_id) REFERENCES document_control(id) ON DELETE SET NULL;

-- ==============================================
-- 4. Document Control Audit Log
-- ==============================================
-- Tracks all changes to documents (who, what, when)
CREATE TABLE IF NOT EXISTS document_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    document_control_id INT NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    revision_id INT,
    
    -- Action Details
    action_type ENUM('created', 'modified', 'reviewed', 'approved', 'rejected', 'obsoleted', 'superseded', 'restored') NOT NULL,
    action_description TEXT,
    
    -- Change Details
    old_value TEXT,
    new_value TEXT,
    field_changed VARCHAR(100),
    
    -- User Info
    performed_by INT NOT NULL,
    performed_by_name VARCHAR(100),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Context
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    
    INDEX idx_document (document_control_id),
    INDEX idx_revision (revision_id),
    INDEX idx_action_type (action_type),
    INDEX idx_performed_at (performed_at),
    
    FOREIGN KEY (document_control_id) REFERENCES document_control(id) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Complete audit trail of document control activities';

-- ==============================================
-- 5. Document Sequence Counter
-- ==============================================
-- Auto-generates document numbers (QA-FRM-373, QA-FRM-374, etc.)
CREATE TABLE IF NOT EXISTS document_sequences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    prefix VARCHAR(20) NOT NULL UNIQUE,            -- e.g., "QA-FRM"
    current_sequence INT NOT NULL DEFAULT 0,       -- Last used number
    description VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_prefix (prefix)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Auto-increment sequences for document numbers';

-- ==============================================
-- 6. Initialize Default Sequences
-- ==============================================
INSERT INTO document_sequences (prefix, current_sequence, description) VALUES
('QA-FRM', 372, 'Quality Forms'),
('ENG-DWG', 0, 'Engineering Drawings'),
('MFG-WI', 0, 'Manufacturing Work Instructions'),
('QA-PROC', 0, 'Quality Procedures'),
('INST', 0, 'Installation Instructions')
ON DUPLICATE KEY UPDATE current_sequence = current_sequence;

-- ==============================================
-- 7. Stored Procedure: Get Next Document Number
-- ==============================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetNextDocumentNumber(
    IN p_prefix VARCHAR(20),
    OUT p_document_number VARCHAR(50)
)
BEGIN
    DECLARE v_sequence INT;
    
    -- Lock the row for update
    SELECT current_sequence + 1 INTO v_sequence
    FROM document_sequences
    WHERE prefix = p_prefix
    FOR UPDATE;
    
    -- Update the sequence
    UPDATE document_sequences
    SET current_sequence = v_sequence,
        updated_at = CURRENT_TIMESTAMP
    WHERE prefix = p_prefix;
    
    -- Format the document number
    SET p_document_number = CONCAT(p_prefix, '-', LPAD(v_sequence, 3, '0'));
END //

DELIMITER ;

-- ==============================================
-- 8. Stored Procedure: Create New Revision
-- ==============================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS CreateDocumentRevision(
    IN p_document_number VARCHAR(50),
    IN p_template_id INT,
    IN p_revision_type VARCHAR(20),
    IN p_revision_description TEXT,
    IN p_created_by INT,
    IN p_created_by_name VARCHAR(100),
    OUT p_revision_id INT,
    OUT p_revision_number VARCHAR(20)
)
BEGIN
    DECLARE v_doc_control_id INT;
    DECLARE v_major INT;
    DECLARE v_minor INT;
    
    -- Get document control ID
    SELECT id INTO v_doc_control_id
    FROM document_control
    WHERE document_number = p_document_number;
    
    -- Get current revision numbers
    SELECT 
        COALESCE(MAX(revision_major), 0),
        COALESCE(MAX(revision_minor), 0)
    INTO v_major, v_minor
    FROM document_revisions
    WHERE document_control_id = v_doc_control_id;
    
    -- Increment based on revision type
    IF p_revision_type = 'major' THEN
        SET v_major = v_major + 1;
        SET v_minor = 0;
    ELSE
        SET v_minor = v_minor + 1;
    END IF;
    
    -- Format revision number
    SET p_revision_number = CONCAT(v_major, '.', LPAD(v_minor, 2, '0'));
    
    -- Insert new revision
    INSERT INTO document_revisions (
        document_control_id,
        document_number,
        revision_number,
        revision_major,
        revision_minor,
        template_id,
        revision_type,
        revision_description,
        created_by,
        created_by_name,
        status
    ) VALUES (
        v_doc_control_id,
        p_document_number,
        p_revision_number,
        v_major,
        v_minor,
        p_template_id,
        p_revision_type,
        p_revision_description,
        p_created_by,
        p_created_by_name,
        'draft'
    );
    
    SET p_revision_id = LAST_INSERT_ID();
    
    -- Log the action
    INSERT INTO document_audit_log (
        document_control_id,
        document_number,
        revision_id,
        action_type,
        action_description,
        performed_by,
        performed_by_name
    ) VALUES (
        v_doc_control_id,
        p_document_number,
        p_revision_id,
        'created',
        CONCAT('Created revision ', p_revision_number),
        p_created_by,
        p_created_by_name
    );
END //

DELIMITER ;

-- ==============================================
-- 9. View: Active Documents
-- ==============================================
CREATE OR REPLACE VIEW vw_active_documents AS
SELECT 
    dc.document_number,
    dc.document_title,
    dc.current_revision,
    dc.status AS doc_status,
    dr.revision_description,
    dr.effective_date,
    dr.approved_by_name,
    dr.approved_at,
    ct.name AS template_name,
    ct.id AS template_id,
    dc.department,
    dc.document_owner_name
FROM document_control dc
LEFT JOIN document_revisions dr ON dr.id = (
    SELECT id 
    FROM document_revisions 
    WHERE document_control_id = dc.id 
    AND status = 'approved'
    ORDER BY revision_major DESC, revision_minor DESC 
    LIMIT 1
)
LEFT JOIN checklist_templates ct ON ct.id = dc.current_template_id
WHERE dc.status IN ('approved', 'in_review')
ORDER BY dc.document_number;

-- ==============================================
-- 10. View: Revision History
-- ==============================================
CREATE OR REPLACE VIEW vw_revision_history AS
SELECT 
    dr.document_number,
    dr.revision_number,
    dr.revision_type,
    dr.revision_description,
    dr.status,
    dr.items_added,
    dr.items_removed,
    dr.items_modified,
    dr.created_by_name,
    dr.created_at,
    dr.approved_by_name,
    dr.approved_at,
    dr.effective_date,
    ct.name AS template_name,
    ct.id AS template_id
FROM document_revisions dr
LEFT JOIN checklist_templates ct ON ct.id = dr.template_id
ORDER BY dr.document_number, dr.revision_major DESC, dr.revision_minor DESC;

-- ==============================================
-- DONE!
-- ==============================================
SELECT 'Document Control System Created Successfully!' AS Status;
