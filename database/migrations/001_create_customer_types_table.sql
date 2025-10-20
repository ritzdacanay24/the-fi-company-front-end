-- Migration: Create customer_types table
-- Purpose: Master configuration table for all customer types
-- Date: 2025-10-17
-- Author: System

-- Create customer_types table
CREATE TABLE IF NOT EXISTS eyefidb.customer_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Short code: sg, ags, igt, etc.',
    customer_name VARCHAR(100) NOT NULL COMMENT 'Display name: Light and Wonder, AGS, IGT',
    requires_asset_generation BOOLEAN DEFAULT FALSE COMMENT 'True if this customer needs auto-generated asset numbers',
    asset_generation_class VARCHAR(100) COMMENT 'PHP class name for generation logic',
    asset_table_name VARCHAR(100) COMMENT 'Table where generated assets are stored',
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer_code (customer_code),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Master configuration table for customer types';

-- Insert initial customer types
INSERT INTO eyefidb.customer_types 
(customer_code, customer_name, requires_asset_generation, asset_generation_class, asset_table_name) 
VALUES
('sg', 'Light and Wonder', TRUE, 'SgAssetGenerator', 'sgAssetGenerator'),
('ags', 'AGS', TRUE, 'AgsSerialGenerator', 'agsSerialGenerator'),
('igt', 'IGT', FALSE, NULL, 'igtAssets');

-- Add more customer types as needed:
-- ('aristocrat', 'Aristocrat', TRUE, 'AristocratGenerator', 'aristocratAssets'),
-- ('ainsworth', 'Ainsworth', TRUE, 'AinsworthGenerator', 'ainsworthAssets'),
-- ('konami', 'Konami', TRUE, 'KonamiGenerator', 'konamiAssets'),
-- etc.

-- Verify
SELECT * FROM eyefidb.customer_types;
