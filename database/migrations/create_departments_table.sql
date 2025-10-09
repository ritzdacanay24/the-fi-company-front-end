-- Departments Table
-- This table stores department information for organizing the org chart
CREATE TABLE departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    parent_department_id BIGINT NULL,
    department_head_user_id BIGINT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key for parent department (self-referencing)
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_departments_name (department_name),
    INDEX idx_departments_parent (parent_department_id),
    INDEX idx_departments_head (department_head_user_id),
    INDEX idx_departments_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Department Assignments Table
-- This table links users to departments
CREATE TABLE user_department_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_dept_user (user_id),
    INDEX idx_user_dept_department (department_id),
    INDEX idx_user_dept_active (is_active),
    
    -- Unique constraint to prevent duplicate assignments
    UNIQUE KEY uk_user_department (user_id, department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE departments COMMENT = 'Stores department structure and hierarchy for organizational chart';
ALTER TABLE departments MODIFY COLUMN department_name VARCHAR(100) NOT NULL COMMENT 'Department name';
ALTER TABLE departments MODIFY COLUMN parent_department_id BIGINT NULL COMMENT 'Reference to parent department for hierarchy';
ALTER TABLE departments MODIFY COLUMN department_head_user_id BIGINT NULL COMMENT 'User ID of department head/manager';
ALTER TABLE departments MODIFY COLUMN display_order INT NOT NULL DEFAULT 0 COMMENT 'Display order in org chart';

ALTER TABLE user_department_assignments COMMENT = 'Links users to departments for org chart';
ALTER TABLE user_department_assignments MODIFY COLUMN user_id BIGINT NOT NULL COMMENT 'User assigned to department';
ALTER TABLE user_department_assignments MODIFY COLUMN department_id BIGINT NOT NULL COMMENT 'Department the user belongs to';

-- Create view for org chart data
CREATE OR REPLACE VIEW vw_org_chart_structure AS
SELECT 
    d.id,
    d.department_name,
    d.parent_department_id,
    d.department_head_user_id,
    d.display_order,
    d.is_active,
    (SELECT COUNT(*) 
     FROM user_department_assignments uda 
     WHERE uda.department_id = d.id 
     AND uda.is_active = 1) as user_count
FROM departments d
WHERE d.is_active = 1
ORDER BY d.display_order, d.department_name;

-- Sample department data
INSERT INTO departments (
    department_name, 
    parent_department_id, 
    display_order
) VALUES 
-- Top level departments
('Executive', NULL, 1),
('Information Technology', NULL, 2),
('Human Resources', NULL, 3),
('Finance', NULL, 4),
('Operations', NULL, 5),
('Quality Assurance', NULL, 6),

-- Sub-departments under IT
('Development', 2, 1),
('Infrastructure', 2, 2),
('Support', 2, 3),

-- Sub-departments under Operations
('Production', 5, 1),
('Maintenance', 5, 2),
('Shipping', 5, 3);

-- Sample user assignments (replace with actual user IDs from your users table)
INSERT INTO user_department_assignments (user_id, department_id) VALUES 
(1, 1), -- User 1 in Executive
(2, 2), -- User 2 in IT
(3, 3), -- User 3 in HR
(4, 4), -- User 4 in Finance
(5, 5), -- User 5 in Operations
(6, 6); -- User 6 in QA