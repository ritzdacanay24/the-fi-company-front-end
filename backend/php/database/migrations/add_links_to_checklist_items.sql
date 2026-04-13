-- Migration: Add links JSON column to checklist_items
-- Date: 2025-02-__

ALTER TABLE checklist_items
  ADD COLUMN links JSON NULL;
