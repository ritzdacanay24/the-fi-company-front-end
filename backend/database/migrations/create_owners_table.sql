-- Create owners table for managing order owners/assignees
-- This allows admins to manage a centralized list of owners that can be assigned to orders
-- Compatible with MySQL 5.7+ and 8.0+

-- =============================================================================
-- OWNERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Full name of the owner',
    email VARCHAR(150) DEFAULT NULL COMMENT 'Email address of the owner',
    department VARCHAR(100) DEFAULT NULL COMMENT 'Department the owner belongs to',
    display_order INT DEFAULT 999 COMMENT 'Sort order for dropdown display',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this owner is currently active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL COMMENT 'User who created this owner',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) DEFAULT NULL COMMENT 'User who last updated this owner',
    UNIQUE KEY unique_owner_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Centralized owner management table';

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX idx_owners_active ON owners(is_active);
CREATE INDEX idx_owners_department ON owners(department);
CREATE INDEX idx_owners_display_order ON owners(display_order);
CREATE INDEX idx_owners_name ON owners(name);

-- =============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =============================================================================

-- Insert some default owners
-- Uncomment to add sample data:
/*
INSERT INTO owners (name, email, department, display_order, created_by) VALUES
('Unassigned', NULL, NULL, 0, 'system'),
('Production Team', 'production@company.com', 'Production', 1, 'system'),
('Shipping Team', 'shipping@company.com', 'Shipping', 2, 'system'),
('Quality Control', 'qc@company.com', 'Quality', 3, 'system'),
('Engineering', 'engineering@company.com', 'Engineering', 4, 'system');
*/

-- =============================================================================
-- VIEWS FOR EASY QUERYING
-- =============================================================================

-- Create a view for active owners only (for dropdowns)
CREATE OR REPLACE VIEW active_owners AS
SELECT 
    id,
    name,
    email,
    department,
    description,
    display_order
FROM owners
WHERE is_active = TRUE
ORDER BY display_order ASC, name ASC;

-- =============================================================================
-- MIGRATION ROLLBACK (IF NEEDED)
-- =============================================================================

-- To rollback this migration, uncomment and run:
-- DROP VIEW IF EXISTS active_owners;
-- DROP TABLE IF EXISTS owners;
