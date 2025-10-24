-- File: database/migrations/001-create-users-table.sql
-- Migration: Create Users Table
-- Created: 2024-01-01
-- Description: Main users table for authentication and user management
-- 
-- For beginners:
-- This creates the primary users table that stores user accounts
-- Each user has a unique email and encrypted password
-- We track when accounts are created, updated, verified, and last active

CREATE TABLE IF NOT EXISTS users (
    -- Primary key - unique identifier for each user
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- User identification fields
    email VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email address (must be unique)',
    password VARCHAR(255) NOT NULL COMMENT 'Encrypted password hash',
    
    -- Profile information
    first_name VARCHAR(100) NULL COMMENT 'User first name',
    last_name VARCHAR(100) NULL COMMENT 'User last name',
    username VARCHAR(50) NULL UNIQUE COMMENT 'Optional unique username',
    
    -- Account status fields
    email_verified BOOLEAN DEFAULT FALSE COMMENT 'Whether email has been verified',
    email_verified_at TIMESTAMP NULL COMMENT 'When email was verified',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether account is active',
    
    -- Security fields
    password_changed_at TIMESTAMP NULL COMMENT 'When password was last changed',
    failed_login_attempts INT DEFAULT 0 COMMENT 'Number of consecutive failed login attempts',
    locked_until TIMESTAMP NULL COMMENT 'Account locked until this time (for security)',
    
    -- Profile fields
    phone VARCHAR(20) NULL COMMENT 'User phone number',
    avatar_url VARCHAR(500) NULL COMMENT 'URL to user profile picture',
    timezone VARCHAR(50) DEFAULT 'UTC' COMMENT 'User timezone preference',
    language VARCHAR(10) DEFAULT 'en' COMMENT 'User language preference',
    
    -- Metadata fields
    last_login_at TIMESTAMP NULL COMMENT 'When user last logged in',
    last_login_ip VARCHAR(45) NULL COMMENT 'IP address of last login',
    
    -- Soft delete support
    deleted_at TIMESTAMP NULL COMMENT 'When user account was soft deleted',
    
    -- Audit timestamps - automatically managed by MySQL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When record was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When record was last updated',
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_email_verified (email_verified),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_created_at (created_at),
    INDEX idx_last_login (last_login_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main users table for authentication and profiles';

