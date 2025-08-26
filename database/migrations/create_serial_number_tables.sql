-- Serial Number Generator Database Schema
-- Created: August 19, 2025
-- Purpose: Store serial number configurations, templates, and generated serial numbers

-- Table for storing serial number templates/configurations
CREATE TABLE serial_number_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config JSON NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_template_id (template_id),
    INDEX idx_name (name),
    INDEX idx_created_by (created_by),
    INDEX idx_is_active (is_active)
);

-- Table for storing generated serial numbers for tracking and uniqueness
CREATE TABLE generated_serial_numbers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(255) NOT NULL,
    template_id VARCHAR(50),
    config JSON,
    used_for VARCHAR(100), -- e.g., 'product', 'asset', 'work_order', etc.
    reference_id VARCHAR(100), -- ID of the item this serial was assigned to
    reference_table VARCHAR(50), -- Table name where this serial is used
    is_used BOOLEAN DEFAULT FALSE,
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    notes TEXT,
    INDEX idx_serial_number (serial_number),
    INDEX idx_template_id (template_id),
    INDEX idx_used_for (used_for),
    INDEX idx_reference (reference_table, reference_id),
    INDEX idx_generated_by (generated_by),
    INDEX idx_generated_at (generated_at),
    UNIQUE KEY unique_serial (serial_number)
);

-- Table for storing serial number sequences/counters
CREATE TABLE serial_number_sequences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sequence_name VARCHAR(100) UNIQUE NOT NULL,
    prefix VARCHAR(50),
    current_value BIGINT DEFAULT 0,
    increment_by INT DEFAULT 1,
    min_value BIGINT DEFAULT 1,
    max_value BIGINT DEFAULT 999999999999,
    format_template VARCHAR(255), -- e.g., 'PREFIX-{SEQUENCE:6}-{DATE:YYYYMMDD}'
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sequence_name (sequence_name),
    INDEX idx_prefix (prefix),
    INDEX idx_is_active (is_active)
);

-- Table for audit trail of serial number operations
CREATE TABLE serial_number_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    operation_type ENUM('GENERATE', 'USE', 'RESERVE', 'RELEASE', 'DELETE') NOT NULL,
    serial_number VARCHAR(255) NOT NULL,
    template_id VARCHAR(50),
    reference_table VARCHAR(50),
    reference_id VARCHAR(100),
    old_data JSON,
    new_data JSON,
    performed_by INT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    notes TEXT,
    INDEX idx_serial_number (serial_number),
    INDEX idx_operation_type (operation_type),
    INDEX idx_performed_by (performed_by),
    INDEX idx_performed_at (performed_at),
    INDEX idx_reference (reference_table, reference_id)
);

-- Table for batch generation tracking
CREATE TABLE serial_number_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    template_id VARCHAR(50),
    config JSON,
    total_count INT NOT NULL,
    generated_count INT DEFAULT 0,
    used_count INT DEFAULT 0,
    status ENUM('GENERATING', 'COMPLETED', 'CANCELLED') DEFAULT 'GENERATING',
    purpose VARCHAR(255),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_batch_id (batch_id),
    INDEX idx_template_id (template_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- Junction table linking batches to individual serial numbers
CREATE TABLE batch_serial_numbers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    serial_number_id BIGINT NOT NULL,
    sequence_in_batch INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_id (batch_id),
    INDEX idx_serial_number_id (serial_number_id),
    FOREIGN KEY (batch_id) REFERENCES serial_number_batches(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (serial_number_id) REFERENCES generated_serial_numbers(id) ON DELETE CASCADE
);
