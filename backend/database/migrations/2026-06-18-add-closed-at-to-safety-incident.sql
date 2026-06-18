ALTER TABLE safety_incident
  ADD COLUMN closed_at DATETIME NULL DEFAULT NULL AFTER status;

-- Backfill closed_at for existing Closed records: use created_date + 5 days
UPDATE safety_incident
SET closed_at = DATE_ADD(created_date, INTERVAL 5 DAY)
WHERE status = 'Closed'
  AND closed_at IS NULL;
