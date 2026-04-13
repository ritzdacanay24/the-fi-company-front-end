-- Create user_owners junction table for assigning specific owners to users
-- This allows restricting which owners a user can see/assign in dropdowns

CREATE TABLE IF NOT EXISTS user_owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'User ID from users table',
    owner_id INT NOT NULL COMMENT 'Owner ID from owners table',
    can_assign BOOLEAN DEFAULT TRUE COMMENT 'Whether user can assign this owner to work orders',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    UNIQUE KEY unique_user_owner (user_id, owner_id),
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_owner_id (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Maps which owners each user can see and assign';

-- Create view for easy querying
CREATE OR REPLACE VIEW user_owner_assignments AS
SELECT 
    uo.id,
    uo.user_id,
    u.first,
    u.last,
    CONCAT(u.first, ' ', u.last) as user_full_name,
    uo.owner_id,
    o.name as owner_name,
    o.department as owner_department,
    o.description as owner_description,
    uo.can_assign,
    uo.created_at,
    uo.created_by
FROM user_owners uo
JOIN db.users u ON uo.user_id = u.id
JOIN owners o ON uo.owner_id = o.id
WHERE o.is_active = TRUE AND u.active = 1
ORDER BY u.first, u.last, o.display_order, o.name;

-- Helper view: Get all owners available to a specific user
-- Usage: SELECT * FROM user_available_owners WHERE user_id = 123
CREATE OR REPLACE VIEW user_available_owners AS
SELECT DISTINCT
    u.id as user_id,
    o.id as owner_id,
    o.name as owner_name,
    o.email as owner_email,
    o.department as owner_department,
    o.description as owner_description,
    o.display_order,
    CASE 
        WHEN uo.id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as is_assigned_to_user
FROM db.users u
CROSS JOIN owners o
LEFT JOIN user_owners uo ON uo.user_id = u.id AND uo.owner_id = o.id
WHERE o.is_active = TRUE AND u.active = 1
ORDER BY u.id, o.display_order, o.name;

-- Add admin users list (users who can see all owners)
-- This can be managed via a separate table or checking user roles
CREATE TABLE IF NOT EXISTS owner_admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'User ID who has admin access to all owners',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    UNIQUE KEY unique_admin_user (user_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Users who have admin access to see and assign all owners';

-- Example: Add yourself as an admin (update user_id to your actual ID)
-- INSERT INTO owner_admin_users (user_id, created_by) VALUES (1, 'system');
