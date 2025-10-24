-- Create table for tracking serial number sequence mismatch reports
-- This enables data-driven investigation of inventory tracking issues

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'eyefi_serial_mismatch_reports')
BEGIN
    CREATE TABLE eyefi_serial_mismatch_reports (
        id INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Auto-captured information
        work_order_number VARCHAR(50) NOT NULL,
        category VARCHAR(10) NOT NULL DEFAULT 'new', -- 'new' or 'used'
        reported_by VARCHAR(100) NOT NULL,
        reported_by_user_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        
        -- Mismatch details
        row_index INT NOT NULL, -- 0-based index
        row_number INT NOT NULL, -- 1-based display number
        expected_eyefi_serial VARCHAR(100) NOT NULL,
        expected_ul_number VARCHAR(100) NULL,
        physical_eyefi_serial VARCHAR(100) NOT NULL,
        physical_ul_number VARCHAR(100) NULL,
        
        -- Additional context
        notes TEXT NULL,
        photo_base64 TEXT NULL, -- Base64 encoded image
        contact_method VARCHAR(20) NULL DEFAULT 'workstation', -- 'workstation' or 'phone'
        contact_info VARCHAR(100) NULL,
        
        -- Investigation tracking
        status VARCHAR(20) NOT NULL DEFAULT 'reported', -- 'reported', 'investigating', 'resolved', 'cancelled'
        investigated_by VARCHAR(100) NULL,
        investigated_by_user_id INT NULL,
        investigation_notes TEXT NULL,
        resolution_action TEXT NULL,
        root_cause VARCHAR(50) NULL, -- 'receiving_error', 'mislabeling', 'already_consumed', 'physical_wrong_order', 'duplicate', 'other'
        resolution_date DATETIME NULL,
        updated_at DATETIME NULL DEFAULT GETDATE(),
        
        -- Indexes for performance
        INDEX idx_work_order (work_order_number),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_reported_by_user (reported_by_user_id)
    );
    
    PRINT 'Table eyefi_serial_mismatch_reports created successfully';
END
ELSE
BEGIN
    PRINT 'Table eyefi_serial_mismatch_reports already exists';
END
GO

-- Create view for dashboard summary
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'v_mismatch_report_summary')
BEGIN
    EXEC('
    CREATE VIEW v_mismatch_report_summary AS
    SELECT 
        status,
        COUNT(*) as report_count,
        AVG(CASE 
            WHEN resolution_date IS NOT NULL 
            THEN DATEDIFF(HOUR, created_at, resolution_date) 
            ELSE NULL 
        END) as avg_resolution_hours,
        MIN(created_at) as oldest_report,
        MAX(created_at) as newest_report
    FROM eyefi_serial_mismatch_reports
    GROUP BY status
    ');
    
    PRINT 'View v_mismatch_report_summary created successfully';
END
GO

-- Create view for root cause analysis
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'v_mismatch_root_cause_analysis')
BEGIN
    EXEC('
    CREATE VIEW v_mismatch_root_cause_analysis AS
    SELECT 
        root_cause,
        COUNT(*) as occurrence_count,
        COUNT(DISTINCT work_order_number) as affected_work_orders,
        AVG(DATEDIFF(HOUR, created_at, resolution_date)) as avg_resolution_hours
    FROM eyefi_serial_mismatch_reports
    WHERE root_cause IS NOT NULL AND status = ''resolved''
    GROUP BY root_cause
    ');
    
    PRINT 'View v_mismatch_root_cause_analysis created successfully';
END
GO

-- Sample query for admin dashboard
-- SELECT * FROM v_mismatch_report_summary ORDER BY report_count DESC;
-- SELECT * FROM v_mismatch_root_cause_analysis ORDER BY occurrence_count DESC;

PRINT 'Mismatch report system migration completed successfully';
