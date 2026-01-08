-- Migration: Create org_chart_tokens table
-- Purpose: Store temporary access tokens for sharing org charts externally
-- Created: 2025-01-XX

CREATE TABLE IF NOT EXISTS org_chart_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    generated_by INT DEFAULT NULL,
    access_count INT DEFAULT 0,
    last_accessed_at DATETIME DEFAULT NULL,
    is_revoked TINYINT(1) DEFAULT 0,
    revoked_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_revoked (is_revoked),
    INDEX idx_generated_by (generated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE org_chart_tokens COMMENT = 'Stores temporary access tokens for external org chart sharing';
