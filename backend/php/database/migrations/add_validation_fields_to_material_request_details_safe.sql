-- Safe Migration: Add validation fields to mrf_det table and create review tracking table
-- Date: 2024-01-XX
-- Description: Add validation fields to existing mrf_det table with existence checks

-- Check and add validation fields to mrf_det table safely
-- This approach checks if columns exist before adding them

-- Add validationStatus column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mrf_det' 
     AND COLUMN_NAME = 'validationStatus') = 0,
    'ALTER TABLE mrf_det ADD COLUMN validationStatus ENUM(''pending'', ''approved'', ''rejected'') DEFAULT ''pending''',
    'SELECT "validationStatus column already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add validationComment column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mrf_det' 
     AND COLUMN_NAME = 'validationComment') = 0,
    'ALTER TABLE mrf_det ADD COLUMN validationComment TEXT',
    'SELECT "validationComment column already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add validatedBy column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mrf_det' 
     AND COLUMN_NAME = 'validatedBy') = 0,
    'ALTER TABLE mrf_det ADD COLUMN validatedBy INT(11)',
    'SELECT "validatedBy column already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add validatedAt column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mrf_det' 
     AND COLUMN_NAME = 'validatedAt') = 0,
    'ALTER TABLE mrf_det ADD COLUMN validatedAt DATETIME',
    'SELECT "validatedAt column already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add modifiedDate column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mrf_det' 
     AND COLUMN_NAME = 'modifiedDate') = 0,
    'ALTER TABLE mrf_det ADD COLUMN modifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'SELECT "modifiedDate column already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create separate review tracking table for multi-department reviews
CREATE TABLE IF NOT EXISTS mrf_det_reviews (
    id INT(11) NOT NULL AUTO_INCREMENT,
    mrf_det_id INT(11) NOT NULL,
    reviewerId INT(11) NOT NULL,
    department VARCHAR(100) NOT NULL,
    reviewStatus ENUM('pending_review', 'approved', 'rejected', 'needs_info') DEFAULT 'pending_review',
    reviewNote TEXT,
    reviewPriority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    reviewDecision ENUM('approved', 'rejected', 'needs_clarification') NULL,
    reviewComment TEXT,
    sentForReviewAt DATETIME NOT NULL,
    sentForReviewBy INT(11) NOT NULL,
    reviewedAt DATETIME NULL,
    createdDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active INT(1) NOT NULL DEFAULT 1,
    
    PRIMARY KEY (id),
    
    -- Foreign key to mrf_det table
    CONSTRAINT FK_mrf_det_reviews_mrf_det 
        FOREIGN KEY (mrf_det_id) REFERENCES mrf_det(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_mrf_det_reviews_item (mrf_det_id),
    INDEX idx_mrf_det_reviews_reviewer (reviewerId),
    INDEX idx_mrf_det_reviews_status (reviewStatus),
    INDEX idx_mrf_det_reviews_department (department),
    INDEX idx_mrf_det_reviews_priority (reviewPriority),
    
    -- Ensure one active review per item/reviewer/department combination
    UNIQUE KEY unique_active_review (mrf_det_id, reviewerId, department, active)
    
) ENGINE=InnoDB COLLATE='latin1_swedish_ci';

-- Create view for easy querying of items with review status
CREATE OR REPLACE VIEW vw_mrf_det_with_reviews AS
SELECT 
    md.*,
    -- Review summary fields
    COUNT(r.id) as total_reviews_assigned,
    COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) as pending_reviews,
    COUNT(CASE WHEN r.reviewStatus = 'approved' THEN 1 END) as approved_reviews,
    COUNT(CASE WHEN r.reviewStatus = 'rejected' THEN 1 END) as rejected_reviews,
    COUNT(CASE WHEN r.reviewStatus = 'needs_info' THEN 1 END) as needs_info_reviews,
    
    -- Check if all required reviews are complete
    CASE 
        WHEN COUNT(r.id) = 0 THEN 'no_reviews_required'
        WHEN COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) > 0 THEN 'pending_reviews'
        WHEN COUNT(CASE WHEN r.reviewStatus = 'needs_info' THEN 1 END) > 0 THEN 'needs_information'
        WHEN COUNT(CASE WHEN r.reviewStatus = 'rejected' THEN 1 END) > 0 THEN 'rejected_by_reviewer'
        WHEN COUNT(r.id) = COUNT(CASE WHEN r.reviewStatus = 'approved' THEN 1 END) THEN 'all_reviews_approved'
        ELSE 'mixed_reviews'
    END as overall_review_status,
    
    -- Departments involved in review
    GROUP_CONCAT(DISTINCT r.department) as reviewing_departments,
    
    -- Highest priority among pending reviews
    MAX(CASE WHEN r.reviewStatus = 'pending_review' THEN 
        CASE r.reviewPriority 
            WHEN 'urgent' THEN 4
            WHEN 'high' THEN 3
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 1
        END
    END) as highest_pending_priority

FROM mrf_det md
LEFT JOIN mrf_det_reviews r ON md.id = r.mrf_det_id AND r.active = 1
GROUP BY md.id;

-- Add indexes to existing mrf_det table for better performance
-- Using safe index creation
CREATE INDEX IF NOT EXISTS idx_mrf_det_validation_status ON mrf_det(validationStatus);
CREATE INDEX IF NOT EXISTS idx_mrf_det_validated_by ON mrf_det(validatedBy);
CREATE INDEX IF NOT EXISTS idx_mrf_det_mrf_id ON mrf_det(mrf_id);

-- Optional: Add foreign key constraints if users table exists
-- Uncomment these if you have a users table with proper structure
-- ALTER TABLE mrf_det 
-- ADD CONSTRAINT FK_mrf_det_validated_by 
-- FOREIGN KEY (validatedBy) REFERENCES users(id) ON DELETE SET NULL;

-- ALTER TABLE mrf_det_reviews 
-- ADD CONSTRAINT FK_mrf_det_reviews_reviewer 
-- FOREIGN KEY (reviewerId) REFERENCES users(id) ON DELETE CASCADE;

-- ALTER TABLE mrf_det_reviews 
-- ADD CONSTRAINT FK_mrf_det_reviews_sent_by 
-- FOREIGN KEY (sentForReviewBy) REFERENCES users(id) ON DELETE CASCADE;
