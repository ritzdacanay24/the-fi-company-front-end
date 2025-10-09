-- EyeFi Serial Numbers Table
-- This table stores EyeFi device serial numbers for tracking and assignment
CREATE TABLE eyefi_serial_numbers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    product_model VARCHAR(100) NOT NULL DEFAULT 'EyeFi Pro X1',
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    batch_number VARCHAR(100) NULL,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NULL,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Indexes for performance
    INDEX idx_eyefi_serial_numbers_serial_number (serial_number),
    INDEX idx_eyefi_serial_numbers_status (status),
    INDEX idx_eyefi_serial_numbers_product_model (product_model),
    INDEX idx_eyefi_serial_numbers_batch_number (batch_number),
    INDEX idx_eyefi_serial_numbers_created_at (created_at),
    
    -- Constraints
    CONSTRAINT chk_eyefi_serial_numbers_status CHECK (status IN ('available', 'assigned', 'shipped', 'returned', 'defective')),
    CONSTRAINT chk_eyefi_serial_numbers_product_model CHECK (product_model IN ('EyeFi Pro X1', 'EyeFi Standard S2', 'EyeFi Enterprise E3', 'EyeFi Lite L1', 'EyeFi Advanced A2')),
    CONSTRAINT chk_eyefi_serial_numbers_serial_format CHECK (CHAR_LENGTH(serial_number) >= 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assignment tracking table for customer/work order assignments
CREATE TABLE eyefi_serial_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_po VARCHAR(100) NULL,
    work_order_number VARCHAR(100) NULL,
    wo_part VARCHAR(100) NULL,
    wo_qty_ord INT NULL,
    wo_due_date DATE NULL,
    wo_description VARCHAR(500) NULL,
    assigned_date DATE NOT NULL,
    assigned_by_name VARCHAR(100) NOT NULL,
    shipped_date DATE NULL,
    tracking_number VARCHAR(100) NULL,
    notes VARCHAR(1000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NULL,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Foreign key to serial numbers
    FOREIGN KEY (serial_number) REFERENCES eyefi_serial_numbers(serial_number) ON UPDATE CASCADE ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_eyefi_assignments_serial_number (serial_number),
    INDEX idx_eyefi_assignments_customer_name (customer_name),
    INDEX idx_eyefi_assignments_work_order (work_order_number),
    INDEX idx_eyefi_assignments_assigned_date (assigned_date),
    INDEX idx_eyefi_assignments_shipped_date (shipped_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE eyefi_serial_numbers COMMENT = 'Stores EyeFi device serial numbers for tracking and lifecycle management';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN id BIGINT AUTO_INCREMENT COMMENT 'Unique identifier for the serial number record';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN serial_number VARCHAR(100) NOT NULL COMMENT 'The actual EyeFi device serial number';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN product_model VARCHAR(100) NOT NULL DEFAULT 'EyeFi Pro X1' COMMENT 'EyeFi product model: Pro X1, Standard S2, Enterprise E3, Lite L1, Advanced A2';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'available' COMMENT 'Status: available, assigned, shipped, returned, defective';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN hardware_version VARCHAR(50) NULL COMMENT 'Device hardware version (e.g., 1.2.0)';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN firmware_version VARCHAR(50) NULL COMMENT 'Device firmware version (e.g., 2.1.4)';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN manufacture_date DATE NULL COMMENT 'Date the device was manufactured';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN batch_number VARCHAR(100) NULL COMMENT 'Manufacturing batch number for tracking';
ALTER TABLE eyefi_serial_numbers MODIFY COLUMN qr_code VARCHAR(200) NULL COMMENT 'QR code associated with the device';

ALTER TABLE eyefi_serial_assignments COMMENT = 'Tracks customer and work order assignments for EyeFi devices';
ALTER TABLE eyefi_serial_assignments MODIFY COLUMN serial_number VARCHAR(100) NOT NULL COMMENT 'Reference to the assigned EyeFi serial number';
ALTER TABLE eyefi_serial_assignments MODIFY COLUMN customer_name VARCHAR(200) NOT NULL COMMENT 'Customer receiving the device';
ALTER TABLE eyefi_serial_assignments MODIFY COLUMN work_order_number VARCHAR(100) NULL COMMENT 'Associated work order number';
ALTER TABLE eyefi_serial_assignments MODIFY COLUMN assigned_date DATE NOT NULL COMMENT 'Date the device was assigned to customer';

-- Create views for common queries
CREATE OR REPLACE VIEW vw_eyefi_serial_summary AS
SELECT 
    esn.serial_number,
    esn.product_model,
    esn.status,
    esn.hardware_version,
    esn.firmware_version,
    esn.manufacture_date,
    esn.batch_number,
    esn.qr_code,
    esn.created_at,
    esa.customer_name,
    esa.work_order_number,
    esa.assigned_date,
    esa.shipped_date,
    esa.tracking_number,
    CASE 
        WHEN esn.status = 'available' THEN 'Ready for assignment'
        WHEN esn.status = 'assigned' THEN CONCAT('Assigned to ', esa.customer_name)
        WHEN esn.status = 'shipped' THEN CONCAT('Shipped to ', esa.customer_name, 
            CASE WHEN esa.tracking_number IS NOT NULL THEN CONCAT(' (', esa.tracking_number, ')') ELSE '' END)
        WHEN esn.status = 'returned' THEN 'Returned from customer'
        WHEN esn.status = 'defective' THEN CONCAT('Defective', 
            CASE WHEN esn.defective_reason IS NOT NULL THEN CONCAT(' - ', esn.defective_reason) ELSE '' END)
        ELSE esn.status
    END as status_description
FROM eyefi_serial_numbers esn
LEFT JOIN eyefi_serial_assignments esa ON esn.serial_number = esa.serial_number AND esa.is_active = 1
WHERE esn.is_active = 1;

-- Create statistics view
CREATE OR REPLACE VIEW vw_eyefi_statistics AS
SELECT 
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_count,
    COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_count,
    COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_count,
    COUNT(CASE WHEN status = 'defective' THEN 1 END) as defective_count,
    ROUND(COUNT(CASE WHEN status = 'available' THEN 1 END) * 100.0 / COUNT(*), 2) as available_percentage,
    COUNT(DISTINCT product_model) as model_count,
    COUNT(DISTINCT batch_number) as batch_count
FROM eyefi_serial_numbers 
WHERE is_active = 1;

-- Sample data for testing (optional)
INSERT INTO eyefi_serial_numbers (
    serial_number,
    product_model,
    status,
    hardware_version,
    firmware_version,
    manufacture_date,
    batch_number,
    created_by
) VALUES 
('eyefi-001', 'EyeFi Pro X1', 'available', '1.2.0', '2.1.4', '2024-10-01', 'BATCH-2024-1001', 'system'),
('eyefi-002', 'EyeFi Pro X1', 'available', '1.2.0', '2.1.4', '2024-10-01', 'BATCH-2024-1001', 'system'),
('eyefi-003', 'EyeFi Standard S2', 'available', '1.1.0', '2.0.3', '2024-10-02', 'BATCH-2024-1002', 'system'),
('eyefi-004', 'EyeFi Enterprise E3', 'available', '2.0.0', '3.1.2', '2024-10-03', 'BATCH-2024-1003', 'system'),
('eyefi-005', 'EyeFi Lite L1', 'available', '1.0.0', '1.5.1', '2024-10-03', 'BATCH-2024-1003', 'system');