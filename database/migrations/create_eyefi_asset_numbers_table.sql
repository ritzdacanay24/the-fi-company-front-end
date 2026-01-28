-- =============================================
-- EYEFI Asset Number System
-- Migration: Create eyefi_asset_numbers table
-- Format: YYYYMMDDXXX (e.g., 20251105001)
-- =============================================

CREATE TABLE IF NOT EXISTS eyefi_asset_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Asset Number (format: YYYYMMDDXXX)
    asset_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Generation Metadata
    generation_date DATE NOT NULL,
    daily_sequence INT NOT NULL,
    
    -- Status Management
    status ENUM('available', 'assigned', 'consumed', 'voided') DEFAULT 'available',
    
    -- Category
    category ENUM('New', 'Used') DEFAULT 'New',
    
    -- Assignment Information
    assigned_to_wo VARCHAR(50) DEFAULT NULL,
    assigned_at DATETIME DEFAULT NULL,
    assigned_by VARCHAR(100) DEFAULT NULL,
    
    -- Consumption Information
    consumed_at DATETIME DEFAULT NULL,
    consumed_by VARCHAR(100) DEFAULT NULL,
    
    -- Audit Trail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT NULL,
    
    -- Indexes for performance
    INDEX idx_asset_number (asset_number),
    INDEX idx_generation_date (generation_date),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_assigned_wo (assigned_to_wo),
    
    -- Unique constraint on date + sequence
    UNIQUE KEY unique_daily_sequence (generation_date, daily_sequence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Update existing serial_assignments table to support Asset Numbers
-- Reuse the existing table and generated_asset_number column
-- =============================================

-- Add columns to serial_assignments table for Asset Number tracking
ALTER TABLE serial_assignments 
ADD COLUMN IF NOT EXISTS eyefi_asset_number_id INT DEFAULT NULL COMMENT 'Foreign key to eyefi_asset_numbers table',
ADD COLUMN IF NOT EXISTS eyefi_part_number VARCHAR(100) DEFAULT NULL COMMENT 'EYEFI part number for label',
ADD COLUMN IF NOT EXISTS volts VARCHAR(20) DEFAULT NULL COMMENT 'Voltage specification',
ADD COLUMN IF NOT EXISTS hz VARCHAR(20) DEFAULT NULL COMMENT 'Frequency specification',
ADD COLUMN IF NOT EXISTS amps VARCHAR(20) DEFAULT NULL COMMENT 'Current specification';

-- Add index for the new foreign key column
CREATE INDEX IF NOT EXISTS idx_sa_eyefi_asset_number_id ON serial_assignments(eyefi_asset_number_id);

-- Add foreign key constraint to eyefi_asset_numbers
ALTER TABLE serial_assignments
ADD CONSTRAINT fk_serial_assignments_asset_number 
FOREIGN KEY (eyefi_asset_number_id) REFERENCES eyefi_asset_numbers(id) ON DELETE SET NULL;

-- =============================================
-- Note: serial_assignments table now tracks:
-- - EyeFi Serial Numbers (eyefi_serial_id, eyefi_serial_number)
-- - EyeFi Asset Numbers (eyefi_asset_number_id, generated_asset_number) <- Uses existing column!
-- - UL Labels (ul_label_id, ul_number)
-- - Customer Assets (customer_asset_id, customer_asset_number)
-- - Work Order Info (work_order_number, wo_part, etc.)
-- - Product Specs (eyefi_part_number, volts, hz, amps) <- NEW
--
-- The generated_asset_number column will store:
--   - EYEFI Asset Numbers (YYYYMMDDXXX format) when eyefi_asset_number_id is set
--   - Customer Asset Numbers (IGT, SG, AGS formats) when customer_asset_id is set
-- =============================================
