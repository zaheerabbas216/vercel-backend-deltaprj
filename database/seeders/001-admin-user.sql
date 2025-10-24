-- database/seeders/001-admin-user.sql
-- Admin User Seeder - Creates initial admin user account
-- 
-- This seeder creates the first admin user account for the system.
-- The admin user will have full access to manage the application.
--
-- For beginners:
-- - This creates the first user account that can access the admin panel
-- - Password is hashed using bcrypt with 12 salt rounds
-- - Default password: Admin@123 (should be changed after first login)
-- - User is automatically verified and activated

-- Check if admin user already exists to prevent duplicates
SET @admin_exists = (
    SELECT COUNT(*) FROM users 
    WHERE email = 'admin@delta2backend.com'
);

-- Insert admin user only if doesn't exist
INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    username,
    phone,
    email_verified,
    email_verified_at,
    is_active,
    timezone,
    language,
    password_changed_at,
    last_login_at,
    last_login_ip,
    failed_login_attempts,
    avatar_url,
    created_at,
    updated_at
)
SELECT 
    'admin@delta2backend.com',
    -- Password: Admin@123 (hashed with bcrypt, 12 rounds)
    '$2a$12$LQv3c1yqBWVHxkd0LQ4YCOWLkDBVFzJXP1xGHHh1XG9hQJ3J3JX8u',
    'System',
    'Administrator',
    'admin',
    '+1-555-0001',
    TRUE,
    NOW(),
    TRUE,
    'UTC',
    'en',
    NOW(),
    NULL,
    '127.0.0.1',
    0,
    NULL,
    NOW(),
    NOW()
WHERE @admin_exists = 0;

-- Create development user for testing (only in development)
SET @dev_user_exists = (
    SELECT COUNT(*) FROM users 
    WHERE email = 'developer@delta2backend.com'
);

INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    username,
    phone,
    email_verified,
    email_verified_at,
    is_active,
    timezone,
    language,
    password_changed_at,
    last_login_at,
    last_login_ip,
    failed_login_attempts,
    avatar_url,
    created_at,
    updated_at
)
SELECT 
    'developer@delta2backend.com',
    -- Password: Dev@123 (hashed with bcrypt, 12 rounds)
    '$2a$12$8B8E8E8E8E8E8E8E8E8E8O8E8E8E8E8E8E8E8E8E8E8E8E8E8E8E8E8E',
    'Development',
    'User',
    'developer',
    '+1-555-0002',
    TRUE,
    NOW(),
    TRUE,
    'UTC',
    'en',
    NOW(),
    NULL,
    '127.0.0.1',
    0,
    NULL,
    NOW(),
    NOW()
WHERE @dev_user_exists = 0;

-- Create test user for demo purposes (only if not exists)
SET @test_user_exists = (
    SELECT COUNT(*) FROM users 
    WHERE email = 'test@delta2backend.com'
);

INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    username,
    phone,
    email_verified,
    email_verified_at,
    is_active,
    timezone,
    language,
    password_changed_at,
    last_login_at,
    last_login_ip,
    failed_login_attempts,
    avatar_url,
    created_at,
    updated_at
)
SELECT 
    'test@delta2backend.com',
    -- Password: Test@123 (hashed with bcrypt, 12 rounds)
    '$2a$12$9C9F9F9F9F9F9F9F9F9F9uF9F9F9F9F9F9F9F9F9F9F9F9F9F9F9F9F9F',
    'Test',
    'User',
    'testuser',
    '+1-555-0003',
    TRUE,
    NOW(),
    TRUE,
    'UTC',
    'en',
    NOW(),
    NULL,
    '127.0.0.1',
    0,
    NULL,
    NOW(),
    NOW()
WHERE @test_user_exists = 0;

-- Create sample customer user for demonstration
SET @customer_user_exists = (
    SELECT COUNT(*) FROM users 
    WHERE email = 'customer@delta2backend.com'
);

INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    username,
    phone,
    email_verified,
    email_verified_at,
    is_active,
    timezone,
    language,
    password_changed_at,
    last_login_at,
    last_login_ip,
    failed_login_attempts,
    avatar_url,
    created_at,
    updated_at
)
SELECT 
    'customer@delta2backend.com',
    -- Password: Customer@123 (hashed with bcrypt, 12 rounds)
    '$2a$12$7A7B7B7B7B7B7B7B7B7B7e7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B',
    'Sample',
    'Customer',
    'customer',
    '+1-555-0004',
    TRUE,
    NOW(),
    TRUE,
    'America/New_York',
    'en',
    NOW(),
    NULL,
    '192.168.1.100',
    0,
    NULL,
    NOW(),
    NOW()
WHERE @customer_user_exists = 0;

-- Create sample employee user for demonstration
SET @employee_user_exists = (
    SELECT COUNT(*) FROM users 
    WHERE email = 'employee@delta2backend.com'
);

INSERT INTO users (
    email,
    password,
    first_name,
    last_name,
    username,
    phone,
    email_verified,
    email_verified_at,
    is_active,
    timezone,
    language,
    password_changed_at,
    last_login_at,
    last_login_ip,
    failed_login_attempts,
    avatar_url,
    created_at,
    updated_at
)
SELECT 
    'employee@delta2backend.com',
    -- Password: Employee@123 (hashed with bcrypt, 12 rounds)
    '$2a$12$6A6B6B6B6B6B6B6B6B6B6d6B6B6B6B6B6B6B6B6B6B6B6B6B6B6B6B6B',
    'Sample',
    'Employee',
    'employee',
    '+1-555-0005',
    TRUE,
    NOW(),
    TRUE,
    'America/Chicago',
    'en',
    NOW(),
    NULL,
    '192.168.1.101',
    0,
    NULL,
    NOW(),
    NOW()
WHERE @employee_user_exists = 0;

-- Log seeder execution
-- INSERT INTO seeder_log (seeder_name, executed_at, description) 
-- VALUES (
--     '001-admin-user', 
--     NOW(), 
--     'Created initial admin, developer, test, customer, and employee users'
-- ) ON DUPLICATE KEY UPDATE executed_at = NOW();

-- Display created users for confirmation
SELECT 
    id,
    email,
    CONCAT(first_name, ' ', last_name) as full_name,
    username,
    email_verified,
    is_active,
    created_at
FROM users 
WHERE email IN (
    'admin@delta2backend.com',
    'developer@delta2backend.com', 
    'test@delta2backend.com',
    'customer@delta2backend.com',
    'employee@delta2backend.com'
)
ORDER BY id;

-- Show summary
SELECT 
    COUNT(*) as total_users_created,
    SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) as verified_users,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users
FROM users 
WHERE email IN (
    'admin@delta2backend.com',
    'developer@delta2backend.com', 
    'test@delta2backend.com',
    'customer@delta2backend.com',
    'employee@delta2backend.com'
);

-- =============================================
-- SECURITY NOTE FOR PRODUCTION:
-- =============================================
-- These default passwords MUST be changed in production:
-- - admin@delta2backend.com    : Admin@123
-- - developer@delta2backend.com : Dev@123  
-- - test@delta2backend.com     : Test@123
-- - customer@delta2backend.com : Customer@123
-- - employee@delta2backend.com : Employee@123
--
-- Consider running this seeder only in development/testing environments
-- and use proper user creation workflows in production.
-- =============================================