-- Add queue_status field to mrf table for better Kanban workflow tracking

ALTER TABLE `mrf` 
ADD COLUMN `queue_status` ENUM(
    'new', 
    'under_validation', 
    'pending_review', 
    'approved', 
    'picking', 
    'complete',
    'cancelled'
) NOT NULL DEFAULT 'new' 
AFTER `validated`;

-- Add index for better performance on Kanban queries
CREATE INDEX `idx_queue_status` ON `mrf` (`queue_status`, `createdDate`);

-- Update existing records to set appropriate queue_status based on current state
UPDATE `mrf` SET 
    `queue_status` = CASE 
        WHEN `active` = 0 THEN 'cancelled'
        WHEN `pickedCompletedDate` IS NOT NULL THEN 'complete'
        WHEN `validated` IS NOT NULL THEN 'picking'
        ELSE 'under_validation'
    END;

-- Optional: Add a trigger to automatically update queue_status when related fields change
DELIMITER $$
CREATE TRIGGER `update_queue_status_on_change` 
BEFORE UPDATE ON `mrf`
FOR EACH ROW
BEGIN
    -- Auto-update queue_status when validated field changes
    IF NEW.validated IS NOT NULL AND OLD.validated IS NULL THEN
        SET NEW.queue_status = 'picking';
    END IF;
    
    -- Auto-update when picking is completed
    IF NEW.pickedCompletedDate IS NOT NULL AND OLD.pickedCompletedDate IS NULL THEN
        SET NEW.queue_status = 'complete';
    END IF;
    
    -- Auto-update when deactivated
    IF NEW.active = 0 AND OLD.active = 1 THEN
        SET NEW.queue_status = 'cancelled';
    END IF;
END$$
DELIMITER ;
