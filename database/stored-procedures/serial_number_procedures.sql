-- Stored procedures for serial number operations

DELIMITER //

-- Procedure to generate a serial number using a template
CREATE PROCEDURE GenerateSerialNumber(
    IN p_template_id VARCHAR(50),
    IN p_used_for VARCHAR(100),
    IN p_reference_id VARCHAR(100),
    IN p_reference_table VARCHAR(50),
    IN p_generated_by INT,
    OUT p_serial_number VARCHAR(255)
)
BEGIN
    DECLARE v_config JSON;
    DECLARE v_template_name VARCHAR(100);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Get template configuration
    SELECT config, name INTO v_config, v_template_name
    FROM serial_number_templates 
    WHERE template_id = p_template_id AND is_active = TRUE;

    IF v_config IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Template not found or inactive';
    END IF;

    -- Generate a unique serial number (this would be implemented in the application layer)
    -- For now, we'll create a placeholder that will be updated by the application
    SET p_serial_number = CONCAT('TEMP_', UNIX_TIMESTAMP(), '_', CONNECTION_ID());

    -- Insert the generated serial number
    INSERT INTO generated_serial_numbers (
        serial_number, template_id, config, used_for, 
        reference_id, reference_table, generated_by
    ) VALUES (
        p_serial_number, p_template_id, v_config, p_used_for,
        p_reference_id, p_reference_table, p_generated_by
    );

    -- Log the generation
    INSERT INTO serial_number_audit (
        operation_type, serial_number, template_id, 
        reference_table, reference_id, performed_by,
        new_data
    ) VALUES (
        'GENERATE', p_serial_number, p_template_id,
        p_reference_table, p_reference_id, p_generated_by,
        JSON_OBJECT('template_name', v_template_name, 'config', v_config)
    );

    COMMIT;
END //

-- Procedure to mark a serial number as used
CREATE PROCEDURE UseSerialNumber(
    IN p_serial_number VARCHAR(255),
    IN p_reference_id VARCHAR(100),
    IN p_reference_table VARCHAR(50),
    IN p_used_by INT,
    IN p_notes TEXT
)
BEGIN
    DECLARE v_already_used BOOLEAN DEFAULT FALSE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if already used
    SELECT is_used INTO v_already_used
    FROM generated_serial_numbers 
    WHERE serial_number = p_serial_number;

    IF v_already_used THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Serial number already used';
    END IF;

    -- Mark as used
    UPDATE generated_serial_numbers 
    SET 
        is_used = TRUE,
        used_at = CURRENT_TIMESTAMP,
        reference_id = p_reference_id,
        reference_table = p_reference_table,
        notes = p_notes
    WHERE serial_number = p_serial_number;

    -- Log the usage
    INSERT INTO serial_number_audit (
        operation_type, serial_number, reference_table, 
        reference_id, performed_by, new_data
    ) VALUES (
        'USE', p_serial_number, p_reference_table,
        p_reference_id, p_used_by,
        JSON_OBJECT('notes', p_notes, 'used_at', NOW())
    );

    COMMIT;
END //

-- Procedure to get next sequence value
CREATE PROCEDURE GetNextSequenceValue(
    IN p_sequence_name VARCHAR(100),
    OUT p_next_value BIGINT
)
BEGIN
    DECLARE v_increment_by INT;
    DECLARE v_max_value BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Get current sequence info
    SELECT current_value, increment_by, max_value 
    INTO p_next_value, v_increment_by, v_max_value
    FROM serial_number_sequences 
    WHERE sequence_name = p_sequence_name AND is_active = TRUE
    FOR UPDATE;

    IF p_next_value IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sequence not found or inactive';
    END IF;

    -- Calculate next value
    SET p_next_value = p_next_value + v_increment_by;

    -- Check if exceeds max value
    IF p_next_value > v_max_value THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sequence exceeded maximum value';
    END IF;

    -- Update sequence
    UPDATE serial_number_sequences 
    SET current_value = p_next_value,
        updated_at = CURRENT_TIMESTAMP
    WHERE sequence_name = p_sequence_name;

    COMMIT;
END //

-- Procedure to create a batch of serial numbers
CREATE PROCEDURE CreateSerialNumberBatch(
    IN p_batch_id VARCHAR(50),
    IN p_template_id VARCHAR(50),
    IN p_total_count INT,
    IN p_purpose VARCHAR(255),
    IN p_created_by INT
)
BEGIN
    DECLARE v_config JSON;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Get template configuration
    SELECT config INTO v_config
    FROM serial_number_templates 
    WHERE template_id = p_template_id AND is_active = TRUE;

    IF v_config IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Template not found or inactive';
    END IF;

    -- Create batch record
    INSERT INTO serial_number_batches (
        batch_id, template_id, config, total_count, 
        purpose, created_by
    ) VALUES (
        p_batch_id, p_template_id, v_config, p_total_count,
        p_purpose, p_created_by
    );

    COMMIT;
END //

-- Procedure to check serial number uniqueness
CREATE PROCEDURE CheckSerialNumberUniqueness(
    IN p_serial_number VARCHAR(255),
    OUT p_is_unique BOOLEAN
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO v_count
    FROM generated_serial_numbers 
    WHERE serial_number = p_serial_number;
    
    SET p_is_unique = (v_count = 0);
END //

-- Function to validate serial number format
CREATE FUNCTION ValidateSerialNumberFormat(
    p_serial_number VARCHAR(255),
    p_pattern VARCHAR(500)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    -- Basic validation - can be extended with regex support
    IF p_serial_number IS NULL OR LENGTH(TRIM(p_serial_number)) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check for basic alphanumeric pattern
    IF p_serial_number REGEXP '^[A-Za-z0-9\\-_\\.]+$' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END //

DELIMITER ;
