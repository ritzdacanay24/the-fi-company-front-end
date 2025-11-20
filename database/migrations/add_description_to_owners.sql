-- Add description field to owners table
ALTER TABLE owners 
ADD COLUMN description TEXT DEFAULT NULL COMMENT 'Optional description or notes about the owner' 
AFTER department;
