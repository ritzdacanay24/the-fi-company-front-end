-- Quality Version Control Database Schema
-- This schema supports the quality document management system with version control
-- following the format QA-FRM-202, rev2

-- Drop views if they exist (for clean reinstall)
DROP VIEW IF EXISTS document_audit_trail;
DROP VIEW IF EXISTS pending_approvals;
DROP VIEW IF EXISTS quality_document_summary;

-- Drop stored procedures if they exist (for clean reinstall)
DROP PROCEDURE IF EXISTS ApproveDocument;
DROP PROCEDURE IF EXISTS CreateNewRevision;
DROP PROCEDURE IF EXISTS CreateDocumentWithRevision;
DROP PROCEDURE IF EXISTS GetNextDocumentNumber;

-- Drop triggers if they exist (for clean reinstall)
DROP TRIGGER IF EXISTS update_document_status_on_approval;
DROP TRIGGER IF EXISTS update_document_current_revision;
DROP TRIGGER IF EXISTS update_document_sequence;

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS quality_document_approvals;
DROP TABLE IF EXISTS quality_revisions;
DROP TABLE IF EXISTS quality_documents;
DROP TABLE IF EXISTS quality_document_sequences;

-- Create sequence tracking table for document numbering
CREATE TABLE quality_document_sequences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    prefix VARCHAR(10) NOT NULL UNIQUE,
    current_number INT NOT NULL DEFAULT 200,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_prefix (prefix)
);

-- Insert initial sequences for different document types
INSERT INTO quality_document_sequences (prefix, current_number, description) VALUES
('QA-FRM', 200, 'Quality Assurance Forms'),
('QA-SOP', 100, 'Quality Standard Operating Procedures'),
('QA-WI', 150, 'Quality Work Instructions'),
('QA-CHK', 175, 'Quality Checklists'),
('QA-POL', 50, 'Quality Policies');

-- Main quality documents table
CREATE TABLE quality_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_number VARCHAR(50) NOT NULL UNIQUE,
    prefix VARCHAR(10) NOT NULL,
    sequence_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department ENUM('QA', 'ENG', 'OPS', 'MAINT') NOT NULL,
    status ENUM('draft', 'review', 'approved', 'obsolete') NOT NULL DEFAULT 'draft',
    current_revision INT NOT NULL DEFAULT 1,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_by VARCHAR(100) NULL,
    approved_at TIMESTAMP NULL,
    obsoleted_by VARCHAR(100) NULL,
    obsoleted_at TIMESTAMP NULL,
    obsolete_reason TEXT NULL,
    
    INDEX idx_document_number (document_number),
    INDEX idx_status (status),
    INDEX idx_department (department),
    INDEX idx_created_by (created_by),
    INDEX idx_prefix_sequence (prefix, sequence_number),
    
    FOREIGN KEY (prefix) REFERENCES quality_document_sequences(prefix) ON UPDATE CASCADE
);

-- Document revisions table
CREATE TABLE quality_revisions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    revision_number INT NOT NULL,
    description TEXT NOT NULL,
    changes_summary TEXT,
    status ENUM('draft', 'review', 'approved', 'superseded') NOT NULL DEFAULT 'draft',
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(100) NULL,
    approved_at TIMESTAMP NULL,
    file_path VARCHAR(500) NULL,
    file_size INT NULL,
    checksum VARCHAR(64) NULL,
    
    INDEX idx_document_revision (document_id, revision_number),
    INDEX idx_is_current (is_current),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    
    FOREIGN KEY (document_id) REFERENCES quality_documents(id) ON DELETE CASCADE,
    UNIQUE KEY unique_document_revision (document_id, revision_number)
);

-- Document approval workflow table
CREATE TABLE quality_document_approvals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    revision_id INT NOT NULL,
    approver_name VARCHAR(100) NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    approval_status ENUM('pending', 'approved', 'rejected', 'delegated') NOT NULL DEFAULT 'pending',
    approval_level INT NOT NULL DEFAULT 1,
    comments TEXT,
    approved_at TIMESTAMP NULL,
    delegated_to VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_document_approval (document_id, revision_id),
    INDEX idx_approver (approver_name),
    INDEX idx_status (approval_status),
    INDEX idx_approval_level (approval_level),
    
    FOREIGN KEY (document_id) REFERENCES quality_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (revision_id) REFERENCES quality_revisions(id) ON DELETE CASCADE
);

-- Create triggers for maintaining data integrity

-- Trigger to update document sequence when new document is created
DELIMITER ;;
CREATE TRIGGER update_document_sequence
    AFTER INSERT ON quality_documents
    FOR EACH ROW
BEGIN
    UPDATE quality_document_sequences 
    SET current_number = GREATEST(current_number, NEW.sequence_number)
    WHERE prefix = NEW.prefix;
END;;

-- Trigger to update document current revision number
CREATE TRIGGER update_document_current_revision
    AFTER INSERT ON quality_revisions
    FOR EACH ROW
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE quality_documents 
        SET current_revision = NEW.revision_number,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.document_id;
    END IF;
END;;

-- Trigger to update document status when revision is approved
CREATE TRIGGER update_document_status_on_approval
    AFTER UPDATE ON quality_revisions
    FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.is_current = TRUE THEN
        UPDATE quality_documents 
        SET status = 'approved',
            approved_by = NEW.approved_by,
            approved_at = NEW.approved_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.document_id;
    END IF;
END;;
DELIMITER ;

-- Create views for common queries

-- View for document summary with latest revision info
CREATE VIEW quality_document_summary AS
SELECT 
    d.id,
    d.document_number,
    d.prefix,
    d.sequence_number,
    d.title,
    d.description,
    d.department,
    d.status,
    d.current_revision,
    d.created_by,
    d.created_at,
    d.updated_at,
    d.approved_by,
    d.approved_at,
    r.description as current_revision_description,
    r.created_by as current_revision_created_by,
    r.created_at as current_revision_created_at,
    r.file_path as current_revision_file_path
FROM quality_documents d
LEFT JOIN quality_revisions r ON d.id = r.document_id AND r.is_current = TRUE;

-- View for pending approvals
CREATE VIEW pending_approvals AS
SELECT 
    a.id as approval_id,
    d.document_number,
    d.title,
    r.revision_number,
    r.description as revision_description,
    a.approver_name,
    a.approver_role,
    a.approval_level,
    a.created_at as pending_since,
    a.comments
FROM quality_document_approvals a
JOIN quality_documents d ON a.document_id = d.id
JOIN quality_revisions r ON a.revision_id = r.id
WHERE a.approval_status = 'pending'
ORDER BY a.created_at ASC;

-- View for document audit trail
CREATE VIEW document_audit_trail AS
SELECT 
    d.document_number,
    'Document Created' as action_type,
    d.created_by as performed_by,
    d.created_at as action_date,
    CONCAT('Document ', d.document_number, ' created') as description
FROM quality_documents d

UNION ALL

SELECT 
    d.document_number,
    'Revision Created' as action_type,
    r.created_by as performed_by,
    r.created_at as action_date,
    CONCAT('Revision ', r.revision_number, ' created: ', r.description) as description
FROM quality_revisions r
JOIN quality_documents d ON r.document_id = d.id

UNION ALL

SELECT 
    d.document_number,
    'Approval Action' as action_type,
    a.approver_name as performed_by,
    a.updated_at as action_date,
    CONCAT('Revision ', r.revision_number, ' ', a.approval_status, 
           CASE WHEN a.comments IS NOT NULL THEN CONCAT(' - ', a.comments) ELSE '' END) as description
FROM quality_document_approvals a
JOIN quality_documents d ON a.document_id = d.id
JOIN quality_revisions r ON a.revision_id = r.id
WHERE a.approval_status != 'pending'

ORDER BY action_date DESC;

-- Stored procedures for common operations

-- Procedure to get next document number
DELIMITER ;;
CREATE PROCEDURE GetNextDocumentNumber(
    IN p_prefix VARCHAR(10),
    OUT p_document_number VARCHAR(50)
)
BEGIN
    DECLARE v_next_number INT;
    
    -- Get and increment the sequence
    UPDATE quality_document_sequences 
    SET current_number = current_number + 1 
    WHERE prefix = p_prefix;
    
    -- Get the new number
    SELECT current_number INTO v_next_number 
    FROM quality_document_sequences 
    WHERE prefix = p_prefix;
    
    -- Format the document number
    SET p_document_number = CONCAT(p_prefix, '-', LPAD(v_next_number, 3, '0'));
END;;

-- Procedure to create document with initial revision
CREATE PROCEDURE CreateDocumentWithRevision(
    IN p_prefix VARCHAR(10),
    IN p_title VARCHAR(255),
    IN p_description TEXT,
    IN p_department VARCHAR(10),
    IN p_created_by VARCHAR(100),
    OUT p_document_id INT,
    OUT p_document_number VARCHAR(50)
)
BEGIN
    DECLARE v_sequence_number INT;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Get next document number
    CALL GetNextDocumentNumber(p_prefix, p_document_number);
    
    -- Extract sequence number
    SET v_sequence_number = CAST(SUBSTRING(p_document_number, LENGTH(p_prefix) + 2) AS UNSIGNED);
    
    -- Create document
    INSERT INTO quality_documents (
        document_number, prefix, sequence_number, title, description, department, created_by
    ) VALUES (
        p_document_number, p_prefix, v_sequence_number, p_title, p_description, p_department, p_created_by
    );
    
    SET p_document_id = LAST_INSERT_ID();
    
    -- Create initial revision
    INSERT INTO quality_revisions (
        document_id, revision_number, description, created_by, is_current
    ) VALUES (
        p_document_id, 1, 'Initial version', p_created_by, TRUE
    );
    
    COMMIT;
END;;

-- Procedure to create new revision
CREATE PROCEDURE CreateNewRevision(
    IN p_document_id INT,
    IN p_description TEXT,
    IN p_created_by VARCHAR(100),
    OUT p_revision_number INT
)
BEGIN
    DECLARE v_next_revision INT;
    
    -- Get next revision number
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_next_revision
    FROM quality_revisions 
    WHERE document_id = p_document_id;
    
    -- Set all existing revisions for this document as not current
    UPDATE quality_revisions 
    SET is_current = FALSE 
    WHERE document_id = p_document_id AND is_current = TRUE;
    
    -- Create the new revision as current
    INSERT INTO quality_revisions (
        document_id, 
        revision_number, 
        description, 
        created_by, 
        is_current
    ) VALUES (
        p_document_id, 
        v_next_revision, 
        p_description, 
        p_created_by, 
        TRUE
    );
    
    SET p_revision_number = v_next_revision;
END;;

-- Procedure to approve document
CREATE PROCEDURE ApproveDocument(
    IN p_document_id INT,
    IN p_approved_by VARCHAR(100)
)
BEGIN
    DECLARE v_current_revision_id INT;
    
    -- Get current revision
    SELECT id INTO v_current_revision_id
    FROM quality_revisions 
    WHERE document_id = p_document_id AND is_current = TRUE;
    
    -- Update revision status
    UPDATE quality_revisions 
    SET status = 'approved',
        approved_by = p_approved_by,
        approved_at = CURRENT_TIMESTAMP
    WHERE id = v_current_revision_id;
    
    -- Update any pending approvals
    UPDATE quality_document_approvals 
    SET approval_status = 'approved',
        approved_at = CURRENT_TIMESTAMP
    WHERE revision_id = v_current_revision_id AND approval_status = 'pending';
END;;
DELIMITER ;

-- Insert sample data for testing
INSERT INTO quality_documents (document_number, prefix, sequence_number, title, description, department, status, created_by) VALUES
('QA-FRM-201', 'QA-FRM', 201, 'Material Inspection Checklist', 'Checklist for incoming material inspection process', 'QA', 'approved', 'john.doe'),
('QA-FRM-202', 'QA-FRM', 202, 'Final Product Quality Check', 'Final inspection checklist before product shipment', 'QA', 'review', 'jane.smith'),
('QA-SOP-101', 'QA-SOP', 101, 'Non-Conformance Handling Procedure', 'Standard procedure for handling non-conforming products', 'QA', 'approved', 'mike.johnson');

INSERT INTO quality_revisions (document_id, revision_number, description, status, is_current, created_by) VALUES
(1, 1, 'Initial version of material inspection checklist', 'approved', FALSE, 'john.doe'),
(1, 2, 'Added temperature requirements and updated inspection criteria', 'approved', TRUE, 'john.doe'),
(2, 1, 'Initial version of final product quality check', 'review', TRUE, 'jane.smith'),
(3, 1, 'Initial version of non-conformance handling procedure', 'approved', TRUE, 'mike.johnson');

INSERT INTO quality_document_approvals (document_id, revision_id, approver_name, approver_role, approval_status, approval_level) VALUES
(2, 3, 'quality.manager', 'Quality Manager', 'pending', 1),
(2, 3, 'operations.director', 'Operations Director', 'pending', 2);

-- Update sequences to reflect inserted data
UPDATE quality_document_sequences SET current_number = 202 WHERE prefix = 'QA-FRM';
UPDATE quality_document_sequences SET current_number = 101 WHERE prefix = 'QA-SOP';
