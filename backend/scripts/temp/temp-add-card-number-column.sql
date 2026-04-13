-- SQL migration to add card_number column to users table
-- Run this if the card_number column doesn't already exist

-- Check if column exists and add it if not
-- (MySQL syntax - adjust for your database if needed)

-- Add card_number column
ALTER TABLE users 
ADD COLUMN card_number VARCHAR(50) NULL UNIQUE 
COMMENT 'Employee card number for card-based authentication';

-- Create index for fast lookups
CREATE INDEX idx_users_card_number ON users(card_number);

-- Optional: Add some sample data for testing
-- UPDATE users SET card_number = '12345' WHERE id = 1;
-- UPDATE users SET card_number = '67890' WHERE id = 2;

-- Verify the changes
-- SELECT id, name, email, card_number FROM users WHERE card_number IS NOT NULL;
