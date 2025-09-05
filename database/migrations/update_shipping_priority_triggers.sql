-- Update shipping priority triggers to allow reordering
-- Run this script to update existing triggers with improved logic

-- Drop existing triggers
DROP TRIGGER IF EXISTS prevent_duplicate_priority_insert;
DROP TRIGGER IF EXISTS prevent_duplicate_priority_update;

-- Create updated triggers that allow temporary values during reordering
DELIMITER $$

CREATE TRIGGER prevent_duplicate_priority_insert
    BEFORE INSERT ON shipping_priorities
    FOR EACH ROW
BEGIN
    DECLARE priority_count INT;
    DECLARE order_count INT;
    
    -- Check for duplicate active priority level (only for positive values)
    -- This allows negative or high temporary values during reordering
    IF NEW.is_active = TRUE AND NEW.priority_level > 0 AND NEW.priority_level < 1000 THEN
        SELECT COUNT(*) INTO priority_count 
        FROM shipping_priorities 
        WHERE priority_level = NEW.priority_level 
        AND is_active = TRUE 
        AND priority_level > 0 
        AND priority_level < 1000;
        
        IF priority_count > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Priority level already exists for an active order';
        END IF;
        
        -- Check for duplicate active order
        SELECT COUNT(*) INTO order_count 
        FROM shipping_priorities 
        WHERE order_id = NEW.order_id AND is_active = TRUE;
        
        IF order_count > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Order already has an active priority';
        END IF;
    END IF;
END$$

CREATE TRIGGER prevent_duplicate_priority_update
    BEFORE UPDATE ON shipping_priorities
    FOR EACH ROW
BEGIN
    DECLARE priority_count INT;
    DECLARE order_count INT;
    
    -- Check for duplicate active priority level (excluding current record, only for positive values)
    -- This allows negative or high temporary values during reordering
    IF NEW.is_active = TRUE AND NEW.priority_level > 0 AND NEW.priority_level < 1000 THEN
        SELECT COUNT(*) INTO priority_count 
        FROM shipping_priorities 
        WHERE priority_level = NEW.priority_level 
        AND is_active = TRUE 
        AND id != NEW.id
        AND priority_level > 0 
        AND priority_level < 1000;
        
        IF priority_count > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Priority level already exists for another active order';
        END IF;
        
        -- Check for duplicate active order (excluding current record)
        SELECT COUNT(*) INTO order_count 
        FROM shipping_priorities 
        WHERE order_id = NEW.order_id 
        AND is_active = TRUE 
        AND id != NEW.id;
        
        IF order_count > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Order already has another active priority';
        END IF;
    END IF;
END$$

DELIMITER ;

-- Verify triggers were created
SHOW TRIGGERS LIKE 'shipping_priorities';
