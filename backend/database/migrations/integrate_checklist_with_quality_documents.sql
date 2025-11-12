-- ===============================================================
-- INTEGRATE CHECKLIST TEMPLATES WITH EXISTING QUALITY DOCUMENTS
-- ===============================================================
-- Purpose: Link checklist_templates to existing quality_documents system
-- Approach: Extend existing tables rather than create new ones
-- Date: 2025-11-12
-- ===============================================================

-- ==============================================
-- 1. Add document control fields to checklist_templates
-- ==============================================
-- Check and add quality_document_id column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'checklist_templates'
    AND COLUMN_NAME = 'quality_document_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE checklist_templates ADD COLUMN quality_document_id INT NULL COMMENT ''Links to quality_documents table'' AFTER id',
    'SELECT ''Column quality_document_id already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add quality_revision_id column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'checklist_templates'
    AND COLUMN_NAME = 'quality_revision_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE checklist_templates ADD COLUMN quality_revision_id INT NULL COMMENT ''Links to quality_revisions table'' AFTER quality_document_id',
    'SELECT ''Column quality_revision_id already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes if they don't exist
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'checklist_templates'
    AND INDEX_NAME = 'idx_quality_document'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE checklist_templates ADD INDEX idx_quality_document (quality_document_id)',
    'SELECT ''Index idx_quality_document already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'checklist_templates'
    AND INDEX_NAME = 'idx_quality_revision'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE checklist_templates ADD INDEX idx_quality_revision (quality_revision_id)',
    'SELECT ''Index idx_quality_revision already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys (if they don't exist)
SET @fk_doc_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'checklist_templates'
    AND CONSTRAINT_NAME = 'fk_checklist_quality_document'
);

SET @fk_rev_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'checklist_templates'
    AND CONSTRAINT_NAME = 'fk_checklist_quality_revision'
);

SET @sql = IF(@fk_doc_exists = 0,
    'ALTER TABLE checklist_templates ADD CONSTRAINT fk_checklist_quality_document FOREIGN KEY (quality_document_id) REFERENCES quality_documents(id) ON DELETE SET NULL',
    'SELECT "Foreign key fk_checklist_quality_document already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@fk_rev_exists = 0,
    'ALTER TABLE checklist_templates ADD CONSTRAINT fk_checklist_quality_revision FOREIGN KEY (quality_revision_id) REFERENCES quality_revisions(id) ON DELETE SET NULL',
    'SELECT "Foreign key fk_checklist_quality_revision already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==============================================
-- 2. Extend quality_revisions to store checklist-specific data
-- ==============================================
-- Check and add template_id column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quality_revisions'
    AND COLUMN_NAME = 'template_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE quality_revisions ADD COLUMN template_id INT NULL COMMENT ''Links to checklist_templates'' AFTER document_id',
    'SELECT ''Column template_id already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add items_added column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quality_revisions'
    AND COLUMN_NAME = 'items_added'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE quality_revisions ADD COLUMN items_added INT DEFAULT 0 COMMENT ''Number of checklist items added'' AFTER changes_summary',
    'SELECT ''Column items_added already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add items_removed column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quality_revisions'
    AND COLUMN_NAME = 'items_removed'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE quality_revisions ADD COLUMN items_removed INT DEFAULT 0 COMMENT ''Number of checklist items removed'' AFTER items_added',
    'SELECT ''Column items_removed already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add items_modified column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quality_revisions'
    AND COLUMN_NAME = 'items_modified'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE quality_revisions ADD COLUMN items_modified INT DEFAULT 0 COMMENT ''Number of checklist items modified'' AFTER items_removed',
    'SELECT ''Column items_modified already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add changes_detail column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quality_revisions'
    AND COLUMN_NAME = 'changes_detail'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE quality_revisions ADD COLUMN changes_detail JSON NULL COMMENT ''Detailed change tracking from change detection'' AFTER items_modified',
    'SELECT ''Column changes_detail already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on template_id
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quality_revisions'
    AND INDEX_NAME = 'idx_template'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE quality_revisions ADD INDEX idx_template (template_id)',
    'SELECT ''Index idx_template already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==============================================
-- 3. Add category field to quality_documents (if needed)
-- ==============================================
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'quality_documents'
    AND COLUMN_NAME = 'category'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE quality_documents ADD COLUMN category VARCHAR(100) NULL COMMENT ''Document category (e.g., quality_control, installation)'' AFTER description',
    'SELECT ''Column category already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==============================================
-- 4. Create view: Active Checklist Documents
-- ==============================================
CREATE OR REPLACE VIEW vw_active_checklist_documents AS
SELECT 
    qd.document_number,
    qd.title AS document_title,
    qd.description,
    qd.department,
    qd.status AS document_status,
    qd.current_revision,
    qd.created_by,
    qd.created_at,
    qd.approved_by,
    qd.approved_at,
    qr.id AS revision_id,
    qr.revision_number,
    qr.description AS revision_description,
    qr.changes_summary,
    qr.items_added,
    qr.items_removed,
    qr.items_modified,
    qr.is_current,
    qr.template_id,
    ct.name AS template_name,
    ct.part_number,
    ct.is_active AS template_active
FROM quality_documents qd
LEFT JOIN quality_revisions qr ON qr.document_id = qd.id AND qr.is_current = 1
LEFT JOIN checklist_templates ct ON ct.id = qr.template_id
WHERE qd.status IN ('approved', 'review')
ORDER BY qd.document_number;

-- ==============================================
-- 5. Create view: Checklist Revision History
-- ==============================================
CREATE OR REPLACE VIEW vw_checklist_revision_history AS
SELECT 
    qd.document_number,
    qd.title AS document_title,
    qr.revision_number,
    qr.description AS revision_description,
    qr.status,
    qr.items_added,
    qr.items_removed,
    qr.items_modified,
    qr.is_current,
    qr.created_by,
    qr.created_at,
    qr.approved_by,
    qr.approved_at,
    qr.template_id,
    ct.name AS template_name,
    ct.part_number
FROM quality_revisions qr
INNER JOIN quality_documents qd ON qd.id = qr.document_id
LEFT JOIN checklist_templates ct ON ct.id = qr.template_id
ORDER BY qd.document_number, qr.revision_number DESC;

-- ==============================================
-- 6. Stored Procedure: Create Checklist Document with Initial Revision
-- ==============================================
DELIMITER //

DROP PROCEDURE IF EXISTS CreateChecklistDocument//

CREATE PROCEDURE CreateChecklistDocument(
    IN p_prefix VARCHAR(10),
    IN p_title VARCHAR(255),
    IN p_description TEXT,
    IN p_department ENUM('QA','ENG','OPS','MAINT'),
    IN p_category VARCHAR(100),
    IN p_template_id INT,
    IN p_created_by VARCHAR(100),
    IN p_revision_description TEXT,
    OUT p_document_id INT,
    OUT p_document_number VARCHAR(50),
    OUT p_revision_id INT
)
BEGIN
    DECLARE v_sequence INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get next sequence number
    SELECT current_number + 1 INTO v_sequence
    FROM quality_document_sequences
    WHERE prefix = p_prefix
    FOR UPDATE;
    
    -- Update sequence
    UPDATE quality_document_sequences
    SET current_number = v_sequence,
        updated_at = CURRENT_TIMESTAMP
    WHERE prefix = p_prefix;
    
    -- Generate document number
    SET p_document_number = CONCAT(p_prefix, '-', LPAD(v_sequence, 3, '0'));
    
    -- Create document
    INSERT INTO quality_documents (
        document_number,
        prefix,
        sequence_number,
        title,
        description,
        department,
        category,
        status,
        current_revision,
        created_by
    ) VALUES (
        p_document_number,
        p_prefix,
        v_sequence,
        p_title,
        p_description,
        p_department,
        p_category,
        'draft',
        1,
        p_created_by
    );
    
    SET p_document_id = LAST_INSERT_ID();
    
    -- Create initial revision (Rev 1)
    INSERT INTO quality_revisions (
        document_id,
        revision_number,
        description,
        status,
        is_current,
        created_by,
        template_id
    ) VALUES (
        p_document_id,
        1,
        p_revision_description,
        'draft',
        1,
        p_created_by,
        p_template_id
    );
    
    SET p_revision_id = LAST_INSERT_ID();
    
    -- Link template to document and revision
    UPDATE checklist_templates
    SET quality_document_id = p_document_id,
        quality_revision_id = p_revision_id
    WHERE id = p_template_id;
    
    COMMIT;
END//

DELIMITER ;

-- ==============================================
-- 7. Stored Procedure: Create New Checklist Revision
-- ==============================================
DELIMITER //

DROP PROCEDURE IF EXISTS CreateChecklistRevision//

CREATE PROCEDURE CreateChecklistRevision(
    IN p_document_id INT,
    IN p_template_id INT,
    IN p_revision_description TEXT,
    IN p_changes_summary TEXT,
    IN p_items_added INT,
    IN p_items_removed INT,
    IN p_items_modified INT,
    IN p_changes_detail JSON,
    IN p_created_by VARCHAR(100),
    OUT p_revision_id INT,
    OUT p_revision_number INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get next revision number
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO p_revision_number
    FROM quality_revisions
    WHERE document_id = p_document_id;
    
    -- Mark all previous revisions as not current
    UPDATE quality_revisions
    SET is_current = 0
    WHERE document_id = p_document_id;
    
    -- Create new revision
    INSERT INTO quality_revisions (
        document_id,
        revision_number,
        description,
        changes_summary,
        items_added,
        items_removed,
        items_modified,
        changes_detail,
        status,
        is_current,
        created_by,
        template_id
    ) VALUES (
        p_document_id,
        p_revision_number,
        p_revision_description,
        p_changes_summary,
        p_items_added,
        p_items_removed,
        p_items_modified,
        p_changes_detail,
        'draft',
        1,
        p_created_by,
        p_template_id
    );
    
    SET p_revision_id = LAST_INSERT_ID();
    
    -- Update document current revision
    UPDATE quality_documents
    SET current_revision = p_revision_number
    WHERE id = p_document_id;
    
    -- Link new template to document and revision
    UPDATE checklist_templates
    SET quality_document_id = p_document_id,
        quality_revision_id = p_revision_id
    WHERE id = p_template_id;
    
    COMMIT;
END//

DELIMITER ;

-- ==============================================
-- 8. Stored Procedure: Approve Checklist Revision
-- ==============================================
DELIMITER //

DROP PROCEDURE IF EXISTS ApproveChecklistRevision//

CREATE PROCEDURE ApproveChecklistRevision(
    IN p_revision_id INT,
    IN p_approved_by VARCHAR(100)
)
BEGIN
    DECLARE v_document_id INT;
    DECLARE v_revision_number INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get revision details
    SELECT document_id, revision_number
    INTO v_document_id, v_revision_number
    FROM quality_revisions
    WHERE id = p_revision_id;
    
    -- Update revision status
    UPDATE quality_revisions
    SET status = 'approved',
        approved_by = p_approved_by,
        approved_at = CURRENT_TIMESTAMP
    WHERE id = p_revision_id;
    
    -- Update document status
    UPDATE quality_documents
    SET status = 'approved',
        approved_by = p_approved_by,
        approved_at = CURRENT_TIMESTAMP
    WHERE id = v_document_id;
    
    -- Mark older revisions as superseded
    UPDATE quality_revisions
    SET status = 'superseded'
    WHERE document_id = v_document_id
      AND revision_number < v_revision_number
      AND status = 'approved';
    
    COMMIT;
END//

DELIMITER ;

-- ==============================================
-- 9. Initialize default prefixes (if not exist)
-- ==============================================
INSERT IGNORE INTO quality_document_sequences (prefix, current_number, description) VALUES
('QA-FRM', 200, 'Quality Forms'),
('QA-CHK', 200, 'Quality Checklists'),
('QA-PROC', 200, 'Quality Procedures'),
('ENG-WI', 200, 'Engineering Work Instructions'),
('OPS-SOP', 200, 'Operations Standard Operating Procedures');

-- ==============================================
-- DONE!
-- ==============================================
SELECT 'Checklist integration with quality documents completed successfully!' AS Status;
