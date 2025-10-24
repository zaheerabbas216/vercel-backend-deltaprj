-- File: database/migrations/003-create-password-resets-table.sql
-- Migration: Create Password Resets Table
-- Created: 2024-01-01
-- Description: Table to manage password reset tokens and requests
-- 
-- For beginners:
-- This table stores password reset requests when users forget their password
-- Each reset request gets a unique token that expires after some time
-- We track attempts, IP addresses, and completion status for security
-- Only one active reset token per email address is allowed

CREATE TABLE  IF NOT EXISTS password_resets (
    -- Primary key - unique identifier for each reset request
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- User identification (we use email instead of user_id for flexibility)
    email VARCHAR(255) NOT NULL COMMENT 'Email address requesting password reset',
    user_id INT UNSIGNED NULL COMMENT 'User ID if user exists (can be NULL for non-existent emails)',
    
    -- Reset token information
    token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique reset token sent to user email',
    token_hash VARCHAR(255) NOT NULL COMMENT 'Hashed version of token for security comparison',
    
    -- Security and tracking
    ip_address VARCHAR(45) NOT NULL COMMENT 'IP address that requested the reset',
    user_agent TEXT NULL COMMENT 'Browser/device information',
    
    -- Timing and expiration
    expires_at TIMESTAMP NOT NULL COMMENT 'When this reset token expires',
    
    -- Status tracking
    is_used BOOLEAN DEFAULT FALSE COMMENT 'Whether this token has been used',
    used_at TIMESTAMP NULL COMMENT 'When token was used to reset password',
    used_ip VARCHAR(45) NULL COMMENT 'IP address that used the token',
    
    -- Attempt tracking for security
    verification_attempts INT DEFAULT 0 COMMENT 'Number of times this token was attempted',
    max_attempts INT DEFAULT 5 COMMENT 'Maximum allowed attempts before token becomes invalid',
    
    -- Rate limiting fields
    request_count INT DEFAULT 1 COMMENT 'Number of reset requests from this email today',
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When reset request was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When record was last updated',
    
    -- Foreign key constraint (optional since user might not exist)
    CONSTRAINT fk_password_resets_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_used (is_used),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address),
    
    -- Composite indexes for common security queries
    INDEX idx_email_active (email, is_used, expires_at),
    INDEX idx_ip_requests (ip_address, created_at),
    INDEX idx_token_valid (token, is_used, expires_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Password reset tokens and requests';

-- -- Add constraints for data validation
-- ALTER TABLE password_resets 
-- ADD CONSTRAINT chk_expires_future 
-- CHECK (expires_at > created_at);

-- ALTER TABLE password_resets 
-- ADD CONSTRAINT chk_attempts_valid 
-- CHECK (verification_attempts >= 0 AND verification_attempts <= max_attempts);

-- ALTER TABLE password_resets 
-- ADD CONSTRAINT chk_request_count_valid 
-- CHECK (request_count >= 1 AND request_count <= 10);

-- ALTER TABLE password_resets 
-- ADD CONSTRAINT chk_used_logic 
-- CHECK (
--     (is_used = FALSE AND used_at IS NULL AND used_ip IS NULL) OR 
--     (is_used = TRUE AND used_at IS NOT NULL AND used_ip IS NOT NULL)
-- );

-- -- Create a function to check if email can request password reset (rate limiting)
-- DELIMITER //

-- CREATE FUNCTION CanRequestPasswordReset(
--     check_email VARCHAR(255),
--     check_ip VARCHAR(45)
-- ) RETURNS BOOLEAN
-- READS SQL DATA
-- DETERMINISTIC
-- BEGIN
--     DECLARE email_requests INT DEFAULT 0;
--     DECLARE ip_requests INT DEFAULT 0;
--     DECLARE active_tokens INT DEFAULT 0;
    
--     -- Check email requests in last 24 hours (max 5 per day)
--     SELECT COUNT(*) INTO email_requests
--     FROM password_resets 
--     WHERE email = check_email 
--       AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
--     -- Check IP requests in last hour (max 10 per hour)
--     SELECT COUNT(*) INTO ip_requests
--     FROM password_resets 
--     WHERE ip_address = check_ip 
--       AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
--     -- Check for active (unused, unexpired) tokens for this email
--     SELECT COUNT(*) INTO active_tokens
--     FROM password_resets 
--     WHERE email = check_email 
--       AND is_used = FALSE 
--       AND expires_at > NOW()
--       AND verification_attempts < max_attempts;
    
--     -- Allow request if all conditions are met
--     RETURN (email_requests < 5 AND ip_requests < 10 AND active_tokens = 0);
-- END //

-- DELIMITER ;

-- -- Create a procedure to clean up old password reset records
-- DELIMITER //

-- CREATE PROCEDURE CleanupPasswordResets()
-- BEGIN
--     DECLARE cleaned_count INT DEFAULT 0;
    
--     -- Delete expired and used tokens older than 7 days
--     DELETE FROM password_resets 
--     WHERE (
--         (is_used = TRUE AND used_at < DATE_SUB(NOW(), INTERVAL 7 DAY)) OR
--         (is_used = FALSE AND expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY))
--     );
    
--     SET cleaned_count = ROW_COUNT();
    
--     SELECT CONCAT('Cleaned up ', cleaned_count, ' old password reset records') as result;
-- END //

-- DELIMITER ;

-- -- Create a procedure to invalidate all reset tokens for a user (security measure)
-- DELIMITER //

-- CREATE PROCEDURE InvalidateUserResetTokens(IN target_email VARCHAR(255))
-- BEGIN
--     UPDATE password_resets 
--     SET is_used = TRUE,
--         used_at = CURRENT_TIMESTAMP,
--         used_ip = 'SYSTEM_INVALIDATE'
--     WHERE email = target_email 
--       AND is_used = FALSE 
--       AND expires_at > CURRENT_TIMESTAMP;
      
--     SELECT CONCAT('Invalidated all active reset tokens for ', target_email) as result;
-- END //

-- DELIMITER ;

-- -- Create an event to automatically clean up old records daily
-- CREATE EVENT IF NOT EXISTS cleanup_password_resets
-- ON SCHEDULE EVERY 1 DAY
-- STARTS CURRENT_TIMESTAMP
-- DO
--   CALL CleanupPasswordResets();

-- -- Create a trigger to automatically link user_id when email matches existing user
-- DELIMITER //

-- CREATE TRIGGER tr_password_resets_link_user
-- BEFORE INSERT ON password_resets
-- FOR EACH ROW
-- BEGIN
--     -- Try to find user_id for the email
--     SELECT id INTO NEW.user_id 
--     FROM users 
--     WHERE email = NEW.email 
--       AND deleted_at IS NULL 
--     LIMIT 1;
    
--     -- Set default expiration if not provided (15 minutes from now)
--     IF NEW.expires_at IS NULL THEN
--         SET NEW.expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE);
--     END IF;
-- END //

-- DELIMITER ;