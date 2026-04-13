-- Create kanban priority table to support work order prioritization
-- This allows users to set unique priorities for kanban/production orders
-- Compatible with MySQL 5.7+ and 8.0+

-- =============================================================================
-- KANBAN PRIORITIES TABLE
-- =============================================================================

-- Create new table for kanban priorities
CREATE TABLE kanban_priorities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL COMMENT 'Reference to the order (e.g., SO number or internal ID)',
    sales_order_number VARCHAR(50) NOT NULL COMMENT 'Sales order number for easy reference',
    sales_order_line VARCHAR(10) DEFAULT NULL COMMENT 'Sales order line number if applicable',
    priority_level INT NOT NULL COMMENT 'Priority level (1=highest priority)',
    notes TEXT DEFAULT NULL COMMENT 'Optional notes about why this order has priority',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL COMMENT 'User who set the priority',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(50) DEFAULT NULL COMMENT 'User who last updated the priority',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this priority is currently active'
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Add indexes for performance
CREATE INDEX idx_kanban_priorities_order_id ON kanban_priorities(order_id);
CREATE INDEX idx_kanban_priorities_so_number ON kanban_priorities(sales_order_number);
CREATE INDEX idx_kanban_priorities_priority ON kanban_priorities(priority_level);
CREATE INDEX idx_kanban_priorities_active ON kanban_priorities(is_active);

-- =============================================================================
-- TRIGGERS FOR BUSINESS RULE ENFORCEMENT
-- =============================================================================
-- Triggers removed to allow flexible reordering operations
-- Business rules will be enforced at the application level

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS prevent_duplicate_kanban_priority_insert;
DROP TRIGGER IF EXISTS prevent_duplicate_kanban_priority_update;

-- =============================================================================
-- VIEWS FOR EASY QUERYING
-- =============================================================================

-- Create a view for easy querying of active priority orders
CREATE OR REPLACE VIEW active_kanban_priorities AS
SELECT 
    kp.*,
    CONCAT(kp.sales_order_number, 
           CASE 
               WHEN kp.sales_order_line IS NOT NULL 
               THEN CONCAT('-', kp.sales_order_line) 
               ELSE '' 
           END) as full_order_reference
FROM kanban_priorities kp
WHERE kp.is_active = TRUE
ORDER BY kp.priority_level ASC;

-- =============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =============================================================================

-- Uncomment the following lines to add sample test data
-- INSERT INTO kanban_priorities (order_id, sales_order_number, sales_order_line, priority_level, created_by, notes) 
-- VALUES 
--     ('SO001234-1', 'SO001234', '1', 1, 'admin', 'Rush production order for important client'),
--     ('SO001235-2', 'SO001235', '2', 2, 'admin', 'Customer requested expedited production'),
--     ('SO001236-1', 'SO001236', '1', 3, 'admin', 'Production line dependency');

-- =============================================================================
-- MIGRATION ROLLBACK (IF NEEDED)
-- =============================================================================

-- To rollback this migration, uncomment and run the following:
-- DROP TRIGGER IF EXISTS prevent_duplicate_kanban_priority_insert;
-- DROP TRIGGER IF EXISTS prevent_duplicate_kanban_priority_update;
-- DROP VIEW IF EXISTS active_kanban_priorities;
-- DROP TABLE IF EXISTS kanban_priorities;
