ALTER TABLE fs_request
  ADD COLUMN cancellation_reason VARCHAR(150) NULL DEFAULT NULL AFTER active,
  ADD COLUMN cancellation_notes TEXT NULL DEFAULT NULL AFTER cancellation_reason,
  ADD COLUMN canceled_by INT(11) NULL DEFAULT NULL AFTER cancellation_notes,
  ADD COLUMN canceled_by_name VARCHAR(150) NULL DEFAULT NULL AFTER canceled_by,
  ADD COLUMN canceled_at DATETIME NULL DEFAULT NULL AFTER canceled_by_name,
  ADD KEY idx_fs_request_canceled_at (canceled_at),
  ADD KEY idx_fs_request_active_canceled (active, canceled_at);
