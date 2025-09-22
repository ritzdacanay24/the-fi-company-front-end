-- Allocation Management Tables
-- These tables support manual allocation override and audit functionality

-- Manual allocations table to store user-defined work order to sales order assignments
CREATE TABLE IF NOT EXISTS manual_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wo_number VARCHAR(50) NOT NULL,
    so_number VARCHAR(50) NOT NULL,
    part_number VARCHAR(50) NOT NULL,
    allocated_quantity DECIMAL(15,4) NOT NULL,
    allocation_type ENUM('MANUAL', 'PRIORITY') NOT NULL DEFAULT 'MANUAL',
    priority INT NOT NULL DEFAULT 999,
    locked_by VARCHAR(100) NOT NULL,
    locked_date DATETIME NOT NULL,
    reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_manual_alloc_part (part_number),
    INDEX idx_manual_alloc_wo (wo_number),
    INDEX idx_manual_alloc_so (so_number),
    INDEX idx_manual_alloc_active (is_active),
    INDEX idx_manual_alloc_priority (priority),
    
    UNIQUE KEY uk_manual_alloc (wo_number, so_number, part_number, is_active)
);

-- Allocation locks to prevent automatic reallocation of specific WO/SO pairs
CREATE TABLE IF NOT EXISTS allocation_locks (
    wo_number VARCHAR(50) NOT NULL,
    so_number VARCHAR(50) NOT NULL,
    locked_by VARCHAR(100) NOT NULL,
    locked_date DATETIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (wo_number, so_number),
    INDEX idx_alloc_lock_user (locked_by),
    INDEX idx_alloc_lock_date (locked_date)
);

-- Sales order priorities for influencing allocation logic
CREATE TABLE IF NOT EXISTS so_priorities (
    so_number VARCHAR(50) PRIMARY KEY,
    priority INT NOT NULL DEFAULT 50,
    updated_by VARCHAR(100) NOT NULL,
    updated_date DATETIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_so_priority_value (priority),
    INDEX idx_so_priority_user (updated_by),
    INDEX idx_so_priority_date (updated_date)
);

-- Audit trail for all allocation changes
CREATE TABLE IF NOT EXISTS allocation_audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wo_number VARCHAR(50) NOT NULL,
    so_number VARCHAR(50) NOT NULL,
    part_number VARCHAR(50) NOT NULL,
    action ENUM('ALLOCATE', 'DEALLOCATE', 'REASSIGN', 'PRIORITY_CHANGE') NOT NULL,
    previous_allocation TEXT,
    new_allocation TEXT NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    user_id VARCHAR(100) NOT NULL,
    timestamp DATETIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_part (part_number),
    INDEX idx_audit_wo (wo_number),
    INDEX idx_audit_so (so_number),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_action (action)
);

-- Sample data for testing priorities
INSERT INTO so_priorities (so_number, priority, updated_by, updated_date, reason) VALUES
('SO001', 1, 'system', NOW(), 'Critical customer order'),
('SO002', 5, 'system', NOW(), 'High priority production'),
('SO003', 50, 'system', NOW(), 'Standard priority')
ON DUPLICATE KEY UPDATE 
    priority = VALUES(priority),
    updated_by = VALUES(updated_by),
    updated_date = VALUES(updated_date),
    reason = VALUES(reason);