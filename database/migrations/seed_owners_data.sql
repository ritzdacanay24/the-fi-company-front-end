-- Seed initial owner data
-- Run this after creating the owners table to populate it with sample data

INSERT INTO owners (name, email, department, display_order, is_active, created_by) VALUES
('Unassigned', NULL, NULL, 0, TRUE, 'system'),
('Production Team', 'production@eye-fi.com', 'Production', 1, TRUE, 'system'),
('Shipping Team', 'shipping@eye-fi.com', 'Shipping', 2, TRUE, 'system'),
('Quality Control', 'qc@eye-fi.com', 'Quality', 3, TRUE, 'system'),
('Engineering', 'engineering@eye-fi.com', 'Engineering', 4, TRUE, 'system'),
('Warehouse', 'warehouse@eye-fi.com', 'Warehouse', 5, TRUE, 'system'),
('Assembly', 'assembly@eye-fi.com', 'Assembly', 6, TRUE, 'system')
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    department = VALUES(department),
    display_order = VALUES(display_order),
    is_active = VALUES(is_active);

-- Verify the data was inserted
SELECT * FROM owners ORDER BY display_order;
