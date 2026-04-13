-- Migration: Create serial_assignments table
-- Purpose: Central tracking table for all serial number assignments
-- Date: 2025-10-17
-- Author: System

-- Create serial_assignments table
CREATE TABLE IF NOT EXISTS eyefidb.serial_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Serial Numbers (from various source tables)
    eyefi_serial_id INT NOT NULL COMMENT 'FK to eyefi_serial_numbers.id',
    eyefi_serial_number VARCHAR(50) NOT NULL COMMENT 'Denormalized for quick access',
    ul_label_id INT COMMENT 'FK to ul_labels.id (if applicable)',
    ul_number VARCHAR(50) COMMENT 'Denormalized for quick access',
    
    -- Customer & Asset Info
    customer_type_id INT NOT NULL COMMENT 'FK to customer_types.id',
    customer_asset_id INT COMMENT 'FK to customer-specific table (polymorphic)',
    generated_asset_number VARCHAR(100) COMMENT 'Generated asset number (denormalized)',
    
    -- Assignment Details
    po_number VARCHAR(50),
    property_site VARCHAR(100),
    part_number VARCHAR(100),
    inspector_name VARCHAR(100),
    
    -- Status & Tracking
    status ENUM('active', 'consumed', 'cancelled', 'returned') DEFAULT 'consumed',
    consumed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    consumed_by VARCHAR(100),
    
    -- Metadata
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_eyefi_serial_id (eyefi_serial_id),
    INDEX idx_eyefi_serial_number (eyefi_serial_number),
    INDEX idx_ul_label_id (ul_label_id),
    INDEX idx_customer_type_id (customer_type_id),
    INDEX idx_customer_asset_id (customer_asset_id),
    INDEX idx_po_number (po_number),
    INDEX idx_status (status),
    INDEX idx_consumed_at (consumed_at),
    INDEX idx_consumed_by (consumed_by),
    
    -- Composite indexes for common queries
    INDEX idx_customer_po (customer_type_id, po_number),
    INDEX idx_status_consumed (status, consumed_at),
    
    -- Unique constraint to prevent double consumption
    UNIQUE KEY unique_eyefi_serial_active (eyefi_serial_id, status),
    
    -- Foreign Keys (add after ensuring tables exist)
    CONSTRAINT fk_serial_assignments_customer_type 
        FOREIGN KEY (customer_type_id) REFERENCES customer_types(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    
    -- Note: FK to eyefi_serial_numbers will be added after verifying table structure
    -- Note: FK to ul_labels will be added after verifying table structure
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Central tracking table for all serial number assignments';

-- Verify
SELECT COUNT(*) as row_count FROM eyefidb.serial_assignments;
