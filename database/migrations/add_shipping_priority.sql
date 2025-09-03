-- Create shipping priority table to support order prioritization
-- This allows users to set unique priorities for shipping orders

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

-- Add indexes for performance
CREATE INDEX idx_shipping_priorities_order_id ON shipping_priorities(order_id);
CREATE INDEX idx_shipping_priorities_so_number ON shipping_priorities(sales_order_number);
CREATE INDEX idx_shipping_priorities_priority ON shipping_priorities(priority_level);
CREATE INDEX idx_shipping_priorities_active ON shipping_priorities(is_active);

-- Add unique constraint to prevent duplicate priorities (only for active records)
CREATE UNIQUE INDEX idx_unique_active_priority 
ON shipping_priorities(priority_level) 
WHERE is_active = TRUE;

-- Add unique constraint to prevent duplicate order priorities (only for active records)
CREATE UNIQUE INDEX idx_unique_active_order 
ON shipping_priorities(order_id) 
WHERE is_active = TRUE;

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

-- Sample data for testing (remove in production)
-- INSERT INTO shipping_priorities (order_id, sales_order_number, sales_order_line, priority_level, created_by, notes) 
-- VALUES 
--     ('12345', 'SO001234', '1', 1, 'admin', 'Rush order for important client'),
--     ('12346', 'SO001235', '2', 2, 'admin', 'Customer requested expedited shipping');
