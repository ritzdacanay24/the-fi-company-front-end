-- Keep printers in DB while allowing selective UI visibility
ALTER TABLE equipment_printers
ADD COLUMN visible_in_ui BOOLEAN NOT NULL DEFAULT true AFTER active;

-- Hide Zebra printer from Equipment Status UX cards/tables
UPDATE equipment_printers
SET visible_in_ui = false
WHERE ip_address = '10.1.0.83';
