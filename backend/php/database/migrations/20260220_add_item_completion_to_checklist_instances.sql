-- Adds per-item completion persistence for collaborative inspections
-- Stores verified-without-photos and notes at the instance level

ALTER TABLE checklist_instances
  ADD COLUMN item_completion JSON NULL
  AFTER progress_percentage;
