-- ============================================
-- EyeFi Serial Numbers Database Setup Script
-- Run this script to create all required tables and views
-- ============================================

USE eyefidb;

-- Drop existing objects if they exist (for clean reinstall)
DROP VIEW IF EXISTS vw_eyefi_statistics;
DROP VIEW IF EXISTS vw_eyefi_serial_summary;
DROP TABLE IF EXISTS eyefi_serial_assignments;
DROP TABLE IF EXISTS eyefi_serial_numbers;

-- Create main serial numbers table
CREATE TABLE eyefi_serial_numbers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    product_model VARCHAR(100) NOT NULL DEFAULT 'EyeFi Pro X1',
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    hardware_version VARCHAR(50) NULL,
    firmware_version VARCHAR(50) NULL,
    manufacture_date DATE NULL,
    batch_number VARCHAR(100) NULL,
    qr_code VARCHAR(200) NULL,
    notes VARCHAR(500) NULL,
    defective_reason VARCHAR(500) NULL,
    assigned_at DATETIME NULL,
    assigned_by VARCHAR(100) NULL,
    shipped_at DATETIME NULL,
    shipped_by VARCHAR(100) NULL,
    returned_at DATETIME NULL,
    returned_by VARCHAR(100) NULL,
    defective_at DATETIME NULL,
    defective_by VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NULL,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    
    INDEX idx_eyefi_serial_numbers_serial_number (serial_number),
    INDEX idx_eyefi_serial_numbers_status (status),
    INDEX idx_eyefi_serial_numbers_product_model (product_model),
    INDEX idx_eyefi_serial_numbers_batch_number (batch_number),
    INDEX idx_eyefi_serial_numbers_created_at (created_at),
    
    CONSTRAINT chk_eyefi_serial_numbers_status CHECK (status IN ('available', 'assigned', 'shipped', 'returned', 'defective'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create assignments tracking table
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
    
    FOREIGN KEY (serial_number) REFERENCES eyefi_serial_numbers(serial_number) ON UPDATE CASCADE ON DELETE CASCADE,
    
    INDEX idx_eyefi_assignments_serial_number (serial_number),
    INDEX idx_eyefi_assignments_customer_name (customer_name),
    INDEX idx_eyefi_assignments_work_order (work_order_number),
    INDEX idx_eyefi_assignments_assigned_date (assigned_date),
    INDEX idx_eyefi_assignments_shipped_date (shipped_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create summary view for serial numbers with assignment info
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
        WHEN esn.status = 'assigned' THEN CONCAT('Assigned to ', COALESCE(esa.customer_name, 'Unknown'))
        WHEN esn.status = 'shipped' THEN CONCAT('Shipped to ', COALESCE(esa.customer_name, 'Unknown'), 
            CASE WHEN esa.tracking_number IS NOT NULL THEN CONCAT(' (', esa.tracking_number, ')') ELSE '' END)
        WHEN esn.status = 'returned' THEN 'Returned from customer'
        WHEN esn.status = 'defective' THEN CONCAT('Defective', 
            CASE WHEN esn.defective_reason IS NOT NULL THEN CONCAT(' - ', esn.defective_reason) ELSE '' END)
        ELSE esn.status
    END as status_description
FROM eyefi_serial_numbers esn
LEFT JOIN (
    SELECT serial_number, customer_name, work_order_number, assigned_date, shipped_date, tracking_number
    FROM eyefi_serial_assignments
    WHERE is_active = 1
    ORDER BY created_at DESC
    LIMIT 1
) esa ON esn.serial_number = esa.serial_number
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
    ROUND(COUNT(CASE WHEN status = 'available' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as available_percentage,
    COUNT(DISTINCT product_model) as model_count,
    COUNT(DISTINCT batch_number) as batch_count
FROM eyefi_serial_numbers 
WHERE is_active = 1;

-- Insert sample data for testing
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
('EYEFI-001', 'EyeFi Pro X1', 'available', '1.2.0', '2.1.4', '2024-10-01', 'BATCH-2024-1001', 'system'),
('EYEFI-002', 'EyeFi Pro X1', 'available', '1.2.0', '2.1.4', '2024-10-01', 'BATCH-2024-1001', 'system'),
('EYEFI-003', 'EyeFi Standard S2', 'available', '1.1.0', '2.0.3', '2024-10-02', 'BATCH-2024-1002', 'system'),
('EYEFI-004', 'EyeFi Enterprise E3', 'available', '2.0.0', '3.1.2', '2024-10-03', 'BATCH-2024-1003', 'system'),
('EYEFI-005', 'EyeFi Lite L1', 'available', '1.0.0', '1.5.1', '2024-10-03', 'BATCH-2024-1003', 'system'),
('EYEFI-006', 'EyeFi Advanced A2', 'available', '2.1.0', '3.2.0', '2024-10-04', 'BATCH-2024-1004', 'system'),
('EYEFI-007', 'EyeFi Pro X1', 'available', '1.2.0', '2.1.4', '2024-10-05', 'BATCH-2024-1005', 'system'),
('EYEFI-008', 'EyeFi Standard S2', 'available', '1.1.0', '2.0.3', '2024-10-05', 'BATCH-2024-1005', 'system'),
('EYEFI-009', 'EyeFi Pro X1', 'available', '1.2.0', '2.1.4', '2024-10-06', 'BATCH-2024-1006', 'system'),
('EYEFI-010', 'EyeFi Enterprise E3', 'available', '2.0.0', '3.1.2', '2024-10-06', 'BATCH-2024-1006', 'system');

-- Verify the setup
SELECT 'Tables created successfully!' as status;
SELECT * FROM vw_eyefi_statistics;
SELECT COUNT(*) as sample_records FROM eyefi_serial_numbers;
