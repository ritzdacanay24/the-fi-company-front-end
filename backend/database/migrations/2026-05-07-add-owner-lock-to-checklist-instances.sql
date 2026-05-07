-- Migration: Add owner lock fields to checklist_instances
-- Purpose: Implement instance owner-lock to prevent concurrent edit conflicts.
-- A single user claims ownership with a time-limited lease (10 min).
-- The owner can heartbeat to extend, release when done, or an admin can transfer.
-- Columns are nullable; NULL means no one currently holds the lock.

ALTER TABLE checklist_instances
  ADD COLUMN owner_id        INT(11)      DEFAULT NULL AFTER operator_name,
  ADD COLUMN owner_name      VARCHAR(100) DEFAULT NULL AFTER owner_id,
  ADD COLUMN lock_expires_at DATETIME     DEFAULT NULL AFTER owner_name,
  ADD INDEX  idx_owner_lock  (owner_id, lock_expires_at);

-- Backfill: seed owner from operator (the original assignee/creator of each instance).
-- Only applies to non-submitted, non-null operator rows so read-only records stay unlocked.
UPDATE checklist_instances
   SET owner_id   = operator_id,
       owner_name = operator_name
 WHERE operator_id IS NOT NULL
   AND status NOT IN ('submitted')
   AND owner_id IS NULL;
