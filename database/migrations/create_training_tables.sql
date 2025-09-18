-- Training Management System Database Schema
-- Created: 2025-09-17
-- Description: Database tables for comprehensive training management with badge scanning

-- Training Sessions Table
CREATE TABLE training_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    purpose VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT GENERATED ALWAYS AS (TIME_TO_SEC(TIMEDIFF(end_time, start_time)) / 60) STORED,
    location VARCHAR(255) NOT NULL,
    facilitator_name VARCHAR(255) NOT NULL,
    facilitator_signature LONGTEXT NULL,
    status ENUM('scheduled', 'in-progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    created_by INT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Training Expected Attendees Table
CREATE TABLE training_attendees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    employee_id INT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    notification_sent BOOLEAN DEFAULT FALSE,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by INT NOT NULL,
    
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_employee (session_id, employee_id),
    INDEX idx_session_id (session_id),
    INDEX idx_employee_id (employee_id)
);

-- Training Actual Attendance Table
CREATE TABLE training_attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    employee_id INT NOT NULL,
    sign_in_time DATETIME NOT NULL,
    attendance_duration INT NULL, -- Duration in minutes, calculated from session start
    badge_scanned VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NULL,
    device_info TEXT NULL,
    is_late_arrival BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_employee_attendance (session_id, employee_id),
    INDEX idx_session_id (session_id),
    INDEX idx_employee_id (employee_id),
    INDEX idx_sign_in_time (sign_in_time),
    INDEX idx_badge_scanned (badge_scanned)
);

-- Training Categories Table (for future expansion)
CREATE TABLE training_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    color_code VARCHAR(7) DEFAULT '#007bff', -- Hex color for UI
    icon_class VARCHAR(50) DEFAULT 'las la-graduation-cap',
    is_active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default training categories
INSERT INTO training_categories (name, description, color_code, icon_class) VALUES
('Safety Training', 'Workplace safety and compliance training', '#dc3545', 'las la-shield-alt'),
('Equipment Training', 'Equipment operation and maintenance training', '#28a745', 'las la-tools'),
('Quality Training', 'Quality control and assurance training', '#007bff', 'las la-check-circle'),
('Compliance Training', 'Regulatory and compliance training', '#ffc107', 'las la-balance-scale'),
('Skills Development', 'Professional development and skills training', '#6f42c1', 'las la-user-graduate');

-- Add category_id to training_sessions (optional)
ALTER TABLE training_sessions 
ADD COLUMN category_id INT NULL,
ADD FOREIGN KEY (category_id) REFERENCES training_categories(id);

-- Training Session Templates Table (for future expansion)
CREATE TABLE training_session_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    description_template TEXT,
    purpose_template VARCHAR(255),
    default_duration_minutes INT DEFAULT 60,
    default_location VARCHAR(255) NULL,
    category_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES training_categories(id),
    INDEX idx_category_id (category_id)
);

-- Insert default training templates
INSERT INTO training_session_templates (name, title_template, description_template, purpose_template, default_duration_minutes, category_id, created_by) VALUES
('Forklift Safety', 'Forklift Safety Training', 'Comprehensive forklift operation and safety training including pre-operation inspection, safe driving practices, and OSHA compliance requirements.', 'Safety compliance and certification', 120, 1, 1),
('Workplace Safety', 'Workplace Safety Orientation', 'General workplace safety training covering hazard identification, emergency procedures, and personal protective equipment usage.', 'Safety awareness and accident prevention', 90, 1, 1),
('Quality Management', 'Quality Management Training', 'Training on quality management systems, inspection procedures, and continuous improvement processes.', 'Quality standards and procedures', 60, 3, 1);

-- Create views for reporting
CREATE VIEW training_session_summary AS
SELECT 
    ts.id,
    ts.title,
    ts.date,
    ts.start_time,
    ts.end_time,
    ts.location,
    ts.facilitator_name,
    ts.status,
    tc.name as category_name,
    tc.color_code as category_color,
    COUNT(DISTINCT ta.employee_id) as expected_count,
    COUNT(DISTINCT att.employee_id) as completed_count,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT ta.employee_id) > 0 
            THEN (COUNT(DISTINCT att.employee_id) * 100.0 / COUNT(DISTINCT ta.employee_id))
            ELSE 0 
        END, 2
    ) as completion_rate
FROM training_sessions ts
LEFT JOIN training_categories tc ON ts.category_id = tc.id
LEFT JOIN training_attendees ta ON ts.id = ta.session_id
LEFT JOIN training_attendance att ON ts.id = att.session_id
GROUP BY ts.id, ts.title, ts.date, ts.start_time, ts.end_time, ts.location, ts.facilitator_name, ts.status, tc.name, tc.color_code;

-- Create indexes for performance
CREATE INDEX idx_training_sessions_date_status ON training_sessions(date, status);
CREATE INDEX idx_training_attendance_session_time ON training_attendance(session_id, sign_in_time);
CREATE INDEX idx_training_attendees_session_required ON training_attendees(session_id, is_required);

-- Add constraints for data integrity
ALTER TABLE training_sessions 
ADD CONSTRAINT chk_valid_time CHECK (start_time < end_time),
ADD CONSTRAINT chk_future_date CHECK (date >= CURDATE() OR status IN ('completed', 'cancelled'));

ALTER TABLE training_attendance 
ADD CONSTRAINT chk_positive_duration CHECK (attendance_duration IS NULL OR attendance_duration >= 0);

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON training_sessions TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON training_attendees TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON training_attendance TO 'app_user'@'%';
-- GRANT SELECT ON training_categories TO 'app_user'@'%';
-- GRANT SELECT ON training_session_templates TO 'app_user'@'%';
-- GRANT SELECT ON training_session_summary TO 'app_user'@'%';