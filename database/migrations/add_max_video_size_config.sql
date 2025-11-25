-- Add max_video_size_mb configuration value
-- This config controls the maximum allowed video file size for uploads

INSERT INTO checklist_config (config_key, config_value, description, config_type, is_system) 
VALUES ('max_video_size_mb', '50', 'Maximum video file size in MB', 'number', false)
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;
