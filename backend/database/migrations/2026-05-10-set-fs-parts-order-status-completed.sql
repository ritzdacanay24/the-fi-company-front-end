-- One-time data update requested by operations:
-- set all existing parts request statuses to Completed.

UPDATE `eyefidb`.`fs_parts_order`
SET `status` = 'Completed';
