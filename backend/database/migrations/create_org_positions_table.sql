-- Migration: Create org_positions table
-- Purpose: Store dedicated open positions for org chart vacancies
-- Created: 2026-05-29

CREATE TABLE IF NOT EXISTS db.org_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    reports_to_user_id INT DEFAULT NULL,
    department VARCHAR(120) DEFAULT NULL,
    city VARCHAR(120) DEFAULT NULL,
    state VARCHAR(120) DEFAULT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    status ENUM('open', 'filled', 'closed') NOT NULL DEFAULT 'open',
    org_chart_order INT NOT NULL DEFAULT 0,
    created_by INT DEFAULT NULL,
    filled_by_user_id INT DEFAULT NULL,
    filled_at DATETIME DEFAULT NULL,
    closed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status_active (status, active),
    INDEX idx_reports_to_user_id (reports_to_user_id),
    INDEX idx_department (department),
    INDEX idx_location (city, state),
    INDEX idx_org_chart_order (org_chart_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE db.org_positions COMMENT = 'Dedicated open positions/vacancies rendered in org chart';
