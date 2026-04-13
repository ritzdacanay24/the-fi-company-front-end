-- Create shipping priority table to support order prioritization
-- This allows users to set unique priorities for shipping orders
-- Compatible with MySQL 5.7+ and 8.0+

-- =============================================================================
-- SHIPPING PRIORITIES TABLE
-- =============================================================================

-- Create new table for shipping priorities
CREATE TABLE shipping_priorities (
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
CREATE INDEX idx_shipping_priorities_order_id ON shipping_priorities(order_id);
CREATE INDEX idx_shipping_priorities_so_number ON shipping_priorities(sales_order_number);
CREATE INDEX idx_shipping_priorities_priority ON shipping_priorities(priority_level);
CREATE INDEX idx_shipping_priorities_active ON shipping_priorities(is_active);

-- =============================================================================
-- TRIGGERS FOR BUSINESS RULE ENFORCEMENT
-- =============================================================================
-- Triggers removed to allow flexible reordering operations
-- Business rules will be enforced at the application level

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS prevent_duplicate_priority_insert;
DROP TRIGGER IF EXISTS prevent_duplicate_priority_update;

-- =============================================================================
-- VIEWS FOR EASY QUERYING
-- =============================================================================

-- Create a view for easy querying of active priority orders
CREATE OR REPLACE VIEW active_shipping_priorities AS
SELECT 
    sp.*,
    CONCAT(sp.sales_order_number, 
           CASE 
               WHEN sp.sales_order_line IS NOT NULL 
               THEN CONCAT('-', sp.sales_order_line) 
               ELSE '' 
           END) as full_order_reference
FROM shipping_priorities sp
WHERE sp.is_active = TRUE
ORDER BY sp.priority_level ASC;

-- =============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =============================================================================

-- Uncomment the following lines to add sample test data
-- INSERT INTO shipping_priorities (order_id, sales_order_number, sales_order_line, priority_level, created_by, notes) 
-- VALUES 
--     ('SO001234-1', 'SO001234', '1', 1, 'admin', 'Rush order for important client'),
--     ('SO001235-2', 'SO001235', '2', 2, 'admin', 'Customer requested expedited shipping'),
--     ('SO001236-1', 'SO001236', '1', 3, 'admin', 'Production line dependency');

-- =============================================================================
-- MIGRATION ROLLBACK (IF NEEDED)
-- =============================================================================

-- To rollback this migration, uncomment and run the following:
-- DROP TRIGGER IF EXISTS prevent_duplicate_priority_insert;
-- DROP TRIGGER IF EXISTS prevent_duplicate_priority_update;
-- DROP VIEW IF EXISTS active_shipping_priorities;
-- DROP TABLE IF EXISTS shipping_priorities;
