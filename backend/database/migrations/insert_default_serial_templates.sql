-- Insert default serial number templates
-- These provide common starting configurations for users

INSERT INTO serial_number_templates (template_id, name, description, config, is_default, is_active) VALUES
('standard-product', 'Standard Product', 'Standard format for product serial numbers', 
 JSON_OBJECT(
    'prefix', 'SN',
    'includeDate', true,
    'includeTime', false,
    'dateFormat', 'YYYYMMDD',
    'includeRandomNumbers', true,
    'randomNumberLength', 4,
    'separator', '-',
    'suffix', ''
 ), true, true),

('asset-tag', 'Asset Tag', 'Format for asset tracking tags', 
 JSON_OBJECT(
    'prefix', 'AT',
    'includeDate', true,
    'includeTime', false,
    'dateFormat', 'YYMMDD',
    'includeRandomNumbers', true,
    'randomNumberLength', 4,
    'separator', '-',
    'suffix', ''
 ), true, true),

('work-order', 'Work Order', 'Format for work order numbers', 
 JSON_OBJECT(
    'prefix', 'WO',
    'includeDate', true,
    'includeTime', true,
    'dateFormat', 'YYYYMMDD',
    'timeFormat', 'HHmmss',
    'includeRandomNumbers', true,
    'randomNumberLength', 4,
    'separator', '-',
    'suffix', ''
 ), true, true),

('ags-serial', 'AGS Serial', 'Format for AGS serial numbers', 
 JSON_OBJECT(
    'prefix', 'AGS',
    'includeDate', true,
    'includeTime', false,
    'dateFormat', 'YYYYMMDD',
    'includeRandomNumbers', true,
    'randomNumberLength', 6,
    'separator', '-',
    'suffix', ''
 ), true, true),

('simple-sequential', 'Simple Sequential', 'Simple sequential numbering with date', 
 JSON_OBJECT(
    'prefix', '',
    'includeDate', true,
    'includeTime', false,
    'dateFormat', 'YYMMDD',
    'includeRandomNumbers', true,
    'randomNumberLength', 3,
    'separator', '',
    'suffix', ''
 ), true, true),

('timestamp-based', 'Timestamp Based', 'Unix timestamp with random suffix', 
 JSON_OBJECT(
    'customFormat', '{TIMESTAMP}-{RANDOM:4}'
 ), true, true),

('detailed-product', 'Detailed Product', 'Detailed format with date, time and random numbers', 
 JSON_OBJECT(
    'prefix', 'PROD',
    'includeDate', true,
    'includeTime', true,
    'dateFormat', 'YYYYMMDD',
    'timeFormat', 'HHmmss',
    'includeRandomNumbers', true,
    'randomNumberLength', 6,
    'separator', '-',
    'suffix', ''
 ), true, true),

('part-number', 'Part Number', 'Format for part numbers', 
 JSON_OBJECT(
    'prefix', 'PN',
    'includeDate', false,
    'includeTime', false,
    'includeRandomNumbers', true,
    'randomNumberLength', 8,
    'separator', '-',
    'suffix', ''
 ), true, true);

-- Insert default sequences
INSERT INTO serial_number_sequences (sequence_name, prefix, current_value, format_template, is_active) VALUES
('work_order_seq', 'WO', 1000, 'WO-{SEQUENCE:6}-{DATE:YYYYMMDD}', true),
('asset_tag_seq', 'AT', 5000, 'AT-{SEQUENCE:6}', true),
('product_seq', 'PROD', 10000, 'PROD-{SEQUENCE:8}', true),
('serial_number_seq', 'SN', 100000, 'SN-{DATE:YYYYMMDD}-{SEQUENCE:6}', true),
('ags_serial_seq', 'AGS', 1000, 'AGS-{DATE:YYYYMMDD}-{SEQUENCE:6}', true);
