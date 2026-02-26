-- ============================================================
-- Inspection Report Share Tokens
-- Allows generating public shareable links for completed
-- checklist inspections, with optional item-level filtering.
-- ============================================================

CREATE TABLE IF NOT EXISTS checklist_share_tokens (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token          VARCHAR(64)  NOT NULL UNIQUE,          -- random hex token
    instance_id    INT UNSIGNED NOT NULL,                 -- FK → checklist_instances.id
    visible_item_ids JSON        NULL,                    -- null = show all; array of base item IDs to show
    label          VARCHAR(255) NULL,                     -- optional name (e.g. "Customer Copy")
    expires_at     DATETIME     NULL,                     -- null = never expires
    created_by     INT UNSIGNED NULL,                     -- user ID who generated the link
    created_by_name VARCHAR(150) NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accessed_count INT UNSIGNED NOT NULL DEFAULT 0,       -- how many times opened
    last_accessed_at DATETIME   NULL,

    INDEX idx_token       (token),
    INDEX idx_instance_id (instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
