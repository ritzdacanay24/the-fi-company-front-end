-- Add api_type column to equipment_printers table
ALTER TABLE equipment_printers 
ADD COLUMN api_type VARCHAR(20) DEFAULT 'json' AFTER device_id;

-- Update the printer that uses XML API
UPDATE equipment_printers 
SET api_type = 'xml' 
WHERE ip_address = '10.1.0.229';
