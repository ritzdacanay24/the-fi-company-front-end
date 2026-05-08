-- Migration: Add draft owner-lock fields to checklist_templates
-- Purpose: Prevent concurrent edits to draft templates by different users.
-- A user claims ownership of a draft when they open the editor.
-- The lock persists until they explicitly release it (close/navigate away) or ownership is transferred.
-- No expiry — locks are permanent until released. Lock only applies when is_draft = 1.
-- Columns are nullable; NULL draft_owner_id means no one currently holds the lock.

ALTER TABLE checklist_templates
  ADD COLUMN draft_owner_id        INT(11)      DEFAULT NULL COMMENT 'User ID currently editing this draft',
  ADD COLUMN draft_owner_name      VARCHAR(100) DEFAULT NULL COMMENT 'Display name of the user editing this draft',
  ADD COLUMN draft_lock_expires_at DATETIME     DEFAULT NULL COMMENT 'When the current draft editing lock expires',
  ADD INDEX  idx_draft_owner_lock  (draft_owner_id, draft_lock_expires_at);

-- Backfill: seed draft_owner from created_by so existing drafts already belong to their creator.
-- Joins db.users to populate the display name from first + last columns.
UPDATE checklist_templates ct
  JOIN db.users u ON u.id = ct.created_by
   SET ct.draft_owner_id   = ct.created_by,
       ct.draft_owner_name = TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, '')))
