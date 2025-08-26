-- Views for serial number management

-- View for active templates with usage statistics
CREATE VIEW v_serial_number_templates AS
SELECT 
    t.id,
    t.template_id,
    t.name,
    t.description,
    t.config,
    t.is_default,
    t.is_active,
    t.created_at,
    t.updated_at,
    COUNT(g.id) as usage_count,
    COUNT(CASE WHEN g.is_used = TRUE THEN 1 END) as used_count,
    COUNT(CASE WHEN g.is_used = FALSE THEN 1 END) as unused_count
FROM serial_number_templates t
LEFT JOIN generated_serial_numbers g ON t.template_id = g.template_id
WHERE t.is_active = TRUE
GROUP BY t.id, t.template_id, t.name, t.description, t.config, 
         t.is_default, t.is_active, t.created_at, t.updated_at;

-- View for generated serial numbers with template info
CREATE VIEW v_generated_serial_numbers AS
SELECT 
    g.id,
    g.serial_number,
    g.template_id,
    t.name as template_name,
    g.used_for,
    g.reference_id,
    g.reference_table,
    g.is_used,
    g.generated_by,
    g.generated_at,
    g.used_at,
    g.notes,
    CASE 
        WHEN g.is_used = TRUE THEN 'Used'
        WHEN g.is_used = FALSE THEN 'Available'
        ELSE 'Unknown'
    END as status
FROM generated_serial_numbers g
LEFT JOIN serial_number_templates t ON g.template_id = t.template_id;

-- View for batch summary information
CREATE VIEW v_serial_number_batches AS
SELECT 
    b.id,
    b.batch_id,
    b.template_id,
    t.name as template_name,
    b.total_count,
    b.generated_count,
    b.used_count,
    b.status,
    b.purpose,
    b.created_by,
    b.created_at,
    b.completed_at,
    CASE 
        WHEN b.total_count > 0 THEN 
            ROUND((b.generated_count / b.total_count) * 100, 2)
        ELSE 0 
    END as generation_progress_percent,
    CASE 
        WHEN b.generated_count > 0 THEN 
            ROUND((b.used_count / b.generated_count) * 100, 2)
        ELSE 0 
    END as usage_percent
FROM serial_number_batches b
LEFT JOIN serial_number_templates t ON b.template_id = t.template_id;

-- View for audit trail with user-friendly information
CREATE VIEW v_serial_number_audit AS
SELECT 
    a.id,
    a.operation_type,
    a.serial_number,
    a.template_id,
    t.name as template_name,
    a.reference_table,
    a.reference_id,
    a.performed_by,
    a.performed_at,
    a.notes,
    DATE(a.performed_at) as performed_date,
    TIME(a.performed_at) as performed_time
FROM serial_number_audit a
LEFT JOIN serial_number_templates t ON a.template_id = t.template_id;

-- View for sequence status
CREATE VIEW v_serial_number_sequences AS
SELECT 
    s.id,
    s.sequence_name,
    s.prefix,
    s.current_value,
    s.increment_by,
    s.min_value,
    s.max_value,
    s.format_template,
    s.is_active,
    s.created_at,
    s.updated_at,
    ROUND(((s.current_value - s.min_value) / (s.max_value - s.min_value)) * 100, 2) as usage_percent,
    (s.max_value - s.current_value) as remaining_values
FROM serial_number_sequences s;

-- View for daily serial number generation statistics
CREATE VIEW v_daily_serial_stats AS
SELECT 
    DATE(generated_at) as generation_date,
    template_id,
    used_for,
    COUNT(*) as total_generated,
    COUNT(CASE WHEN is_used = TRUE THEN 1 END) as total_used,
    COUNT(CASE WHEN is_used = FALSE THEN 1 END) as total_available
FROM generated_serial_numbers
WHERE generated_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(generated_at), template_id, used_for
ORDER BY generation_date DESC, template_id;

-- View for monthly serial number statistics
CREATE VIEW v_monthly_serial_stats AS
SELECT 
    YEAR(generated_at) as year,
    MONTH(generated_at) as month,
    MONTHNAME(generated_at) as month_name,
    template_id,
    COUNT(*) as total_generated,
    COUNT(CASE WHEN is_used = TRUE THEN 1 END) as total_used,
    COUNT(CASE WHEN is_used = FALSE THEN 1 END) as total_available
FROM generated_serial_numbers
WHERE generated_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
GROUP BY YEAR(generated_at), MONTH(generated_at), template_id
ORDER BY year DESC, month DESC, template_id;

-- View for unused serial numbers (potential waste tracking)
CREATE VIEW v_unused_serial_numbers AS
SELECT 
    g.id,
    g.serial_number,
    g.template_id,
    t.name as template_name,
    g.used_for,
    g.generated_by,
    g.generated_at,
    DATEDIFF(CURRENT_DATE, DATE(g.generated_at)) as days_unused,
    CASE 
        WHEN DATEDIFF(CURRENT_DATE, DATE(g.generated_at)) > 90 THEN 'Stale'
        WHEN DATEDIFF(CURRENT_DATE, DATE(g.generated_at)) > 30 THEN 'Old'
        ELSE 'Recent'
    END as age_category
FROM generated_serial_numbers g
LEFT JOIN serial_number_templates t ON g.template_id = t.template_id
WHERE g.is_used = FALSE
ORDER BY g.generated_at DESC;
