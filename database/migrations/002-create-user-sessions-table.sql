-- File: database/migrations/002-create-user-sessions-table.sql
-- Migration: Create User Sessions Table
-- Created: 2024-01-01
-- Description: Table to track user login sessions and JWT tokens
-- 
-- For beginners:
-- This table stores information about user login sessions
-- Each time a user logs in, we create a session record
-- We can track when sessions expire, get revoked, or are used
-- This helps with security and allows users to see their active sessions

CREATE TABLE user_sessions (
    -- Primary key - unique identifier for each session
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Foreign key to users table
    user_id INT UNSIGNED NOT NULL COMMENT 'Reference to the user who owns this session',
    
    -- Session identification
    session_token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique session token (JWT ID or session ID)',
    refresh_token VARCHAR(255) NULL UNIQUE COMMENT 'Optional refresh token for extending sessions',
    
    -- Session metadata
    device_name VARCHAR(100) NULL COMMENT 'Name of device (e.g., iPhone, Chrome Browser)',
    device_type ENUM('web', 'mobile', 'tablet', 'desktop', 'api') DEFAULT 'web' COMMENT 'Type of device/client',
    user_agent TEXT NULL COMMENT 'Full user agent string from browser/app',
    
    -- Location and security info
    ip_address VARCHAR(45) NOT NULL COMMENT 'IP address when session was created',
    country VARCHAR(100) NULL COMMENT 'Country based on IP address',
    city VARCHAR(100) NULL COMMENT 'City based on IP address',
    
    -- Session timing
    expires_at TIMESTAMP NOT NULL COMMENT 'When this session expires',
    last_used_at TIMESTAMP NULL COMMENT 'When session was last used for a request',
    
    -- Session status
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether session is still active',
    revoked_at TIMESTAMP NULL COMMENT 'When session was manually revoked',
    revoked_reason ENUM('logout', 'admin_revoke', 'security', 'expired', 'new_login') NULL COMMENT 'Why session was revoked',
    
    -- Security flags
    is_remember_me BOOLEAN DEFAULT FALSE COMMENT 'Whether this is a "remember me" long-term session',
    is_suspicious BOOLEAN DEFAULT FALSE COMMENT 'Flagged for suspicious activity',
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When session was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When record was last updated',
    
    -- Foreign key constraint
    CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active),
    INDEX idx_last_used (last_used_at),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    
    -- Composite indexes for common queries
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_user_device (user_id, device_type),
    INDEX idx_active_expires (is_active, expires_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User login sessions and JWT token tracking';
