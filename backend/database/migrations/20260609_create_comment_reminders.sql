-- Comment Reminders
-- Allows users to set a reminder on any comment. A cron job checks every minute
-- and sends an email when remind_at arrives. sent_at is stamped to prevent re-send.

CREATE TABLE IF NOT EXISTS eyefidb.comment_reminders (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  comment_id    INT NOT NULL,
  user_id       INT NOT NULL,
  remind_at     DATETIME NOT NULL,
  note          VARCHAR(500)  NULL,
  sent_at       DATETIME      NULL,
  cancelled_at  DATETIME      NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cr_remind_at  (remind_at),
  KEY idx_cr_comment_id (comment_id),
  KEY idx_cr_user_id    (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
