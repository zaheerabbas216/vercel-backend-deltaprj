-- File: database/migrations/008-create-indexes.sql
-- Migration: Create Additional Database Indexes
-- Created: 2024-01-01
-- Description: Additional indexes for optimal database performance
-- 
-- For beginners:
-- Indexes are like a phone book index - they help the database find data quickly
-- Without indexes, the database has to scan every row (slow)
-- With indexes, the database can jump directly to the right rows (fast)
-- We create indexes on columns that are frequently searched or joined

-- ================================
-- PERFORMANCE INDEXES FOR USERS TABLE
-- ================================

-- Index for email lookups (login, password reset, etc.)
-- This is already created in the users table migration, but we ensure it's optimized
CREATE INDEX  idx_users_email_active 
ON users (email, is_active);

-- Index for user search and filtering
CREATE INDEX  idx_users_search 
ON users (first_name, last_name, email);

-- Index for user status queries
CREATE INDEX  idx_users_status 
ON users (is_active, email_verified, deleted_at);

-- Index for security queries (locked accounts, failed attempts)
CREATE INDEX  idx_users_security 
ON users (failed_login_attempts, locked_until, is_active);

-- Index for user activity tracking
CREATE INDEX  idx_users_activity 
ON users (last_login_at, is_active);

-- Composite index for user profile queries
CREATE INDEX  idx_users_profile 
ON users (id, email, first_name, last_name, is_active, email_verified);

-- ================================
-- PERFORMANCE INDEXES FOR USER_SESSIONS TABLE
-- ================================

-- Index for session cleanup and maintenance
CREATE INDEX  idx_sessions_cleanup 
ON user_sessions (is_active, expires_at, revoked_at);

-- Index for user session management queries
CREATE INDEX  idx_sessions_user_management 
ON user_sessions (user_id, is_active, device_type, created_at);

-- Index for security monitoring (suspicious activity)
CREATE INDEX  idx_sessions_security 
ON user_sessions (ip_address, is_suspicious, created_at);

-- Index for session analytics
CREATE INDEX  idx_sessions_analytics 
ON user_sessions (device_type, country, created_at);

-- ================================
-- PERFORMANCE INDEXES FOR PASSWORD_RESETS TABLE
-- ================================

-- Index for rate limiting queries
CREATE INDEX  idx_password_resets_rate_limit 
ON password_resets (email, ip_address, created_at);

-- Index for security monitoring
CREATE INDEX  idx_password_resets_security 
ON password_resets (ip_address, verification_attempts, created_at);

-- Index for cleanup operations
CREATE INDEX  idx_password_resets_cleanup 
ON password_resets (is_used, expires_at, created_at);

-- ================================
-- PERFORMANCE INDEXES FOR ROLES TABLE
-- ================================

-- Index for role hierarchy queries
CREATE INDEX  idx_roles_hierarchy 
ON roles (parent_role_id, is_active, deleted_at);

-- Index for role management queries
CREATE INDEX  idx_roles_management 
ON roles (is_system_role, is_active, is_default, deleted_at);

-- Index for role capacity management
CREATE INDEX  idx_roles_capacity 
ON roles (max_users, user_count, is_active);

-- Index for role ordering and display
CREATE INDEX  idx_roles_display 
ON roles (priority DESC, name ASC);

-- ================================
-- PERFORMANCE INDEXES FOR PERMISSIONS TABLE
-- ================================

-- Index for permission categorization and filtering
CREATE INDEX  idx_permissions_category 
ON permissions (module, group_name, sort_order);

-- Index for permission dependency checking
-- CREATE INDEX  idx_permissions_dependencies 
-- ON permissions (requires_permissions);

-- Index for permission usage tracking
CREATE INDEX  idx_permissions_usage 
ON permissions (usage_count DESC, module, name);

-- Index for permission access level queries
CREATE INDEX  idx_permissions_access_scope 
ON permissions (access_level, scope, is_system_permission);

-- ================================
-- PERFORMANCE INDEXES FOR ROLE_PERMISSIONS TABLE
-- ================================

-- Index for permission inheritance queries
CREATE INDEX  idx_role_permissions_inheritance 
ON role_permissions (is_inherited, inherited_from_role_id, is_active);

-- Index for expiration management
CREATE INDEX  idx_role_permissions_expiration 
ON role_permissions (expires_at, is_active);

-- Index for audit and tracking
CREATE INDEX  idx_role_permissions_audit 
ON role_permissions (granted_by, granted_at, revoked_by, revoked_at);

-- Index for permission condition queries
-- CREATE INDEX  idx_role_permissions_conditions 
-- ON role_permissions (conditions);

-- ================================
-- PERFORMANCE INDEXES FOR USER_ROLES TABLE
-- ================================

-- Index for user role expiration management
CREATE INDEX  idx_user_roles_expiration 
ON user_roles (expires_at, is_active);

-- Index for role assignment context queries
CREATE INDEX  idx_user_roles_context 
ON user_roles (context, assigned_at);

-- Index for audit and tracking
CREATE INDEX  idx_user_roles_audit 
ON user_roles (assigned_by, assigned_at, revoked_by, revoked_at);

-- Index for primary role queries
CREATE INDEX  idx_user_roles_primary 
ON user_roles (user_id, is_primary, is_active);

-- ================================
-- CROSS-TABLE QUERY OPTIMIZATION INDEXES
-- ================================

-- Index for user authentication queries (users + sessions)
CREATE INDEX  idx_users_auth_optimization 
ON users (id, email, password, is_active, email_verified, failed_login_attempts, locked_until);

-- Index for complete user permission resolution
CREATE INDEX  idx_complete_permission_chain 
ON user_roles (user_id, role_id, is_active, expires_at);

-- ================================
-- FULL-TEXT SEARCH INDEXES
-- ================================

-- Full-text search for users (names, email)
ALTER TABLE users 
ADD FULLTEXT(first_name, last_name, email) 
WITH PARSER ngram;

-- Full-text search for roles
ALTER TABLE roles 
ADD FULLTEXT(name, display_name, description) 
WITH PARSER ngram;

-- Full-text search for permissions
ALTER TABLE permissions 
ADD FULLTEXT(name, display_name, description) 
WITH PARSER ngram;

-- ================================
-- FUNCTIONAL INDEXES (MySQL 8.0+)
-- ================================

-- Index on computed full name
CREATE INDEX  idx_users_full_name 
ON users ((CONCAT(first_name, ' ', last_name)));

-- Index on lowercased email for case-insensitive searches
CREATE INDEX  idx_users_email_lower 
ON users ((LOWER(email)));

-- Index on permission namespace (module.action)
CREATE INDEX  idx_permissions_namespace 
ON permissions ((CONCAT(module, '.', action)));

-- ================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ================================

-- Index only active, verified users
CREATE INDEX  idx_users_active_verified 
ON users (id, email, first_name, last_name, created_at);

-- Index only system roles
CREATE INDEX  idx_roles_system_only 
ON roles (id, name, display_name);

-- Index only system permissions
CREATE INDEX  idx_permissions_system_only 
ON permissions (id, name, module, action);

-- Index only active role assignments
CREATE INDEX  idx_user_roles_active_only 
ON user_roles (user_id, role_id, assigned_at, expires_at);

-- ================================
-- STATISTICS AND MONITORING INDEXES
-- ================================

-- Index for login analytics
CREATE INDEX  idx_users_login_stats 
ON users (last_login_at, created_at, is_active);

-- Index for session analytics
CREATE INDEX  idx_sessions_stats 
ON user_sessions (created_at, device_type, country, is_active);

-- Index for role usage statistics
CREATE INDEX  idx_roles_usage_stats 
ON roles (user_count, created_at, is_active);

-- Index for permission usage statistics
CREATE INDEX  idx_permissions_usage_stats 
ON permissions (usage_count, module, created_at);

-- ================================
-- COVERING INDEXES FOR COMMON QUERIES
-- ================================

-- Covering index for user login validation
CREATE INDEX  idx_users_login_covering 
ON users (email, password, is_active, email_verified, failed_login_attempts, locked_until, id);

-- Covering index for session validation
CREATE INDEX  idx_sessions_validation_covering 
ON user_sessions (session_token, user_id, expires_at, is_active, last_used_at);

-- Covering index for permission checking
CREATE INDEX  idx_permission_check_covering 
ON role_permissions (role_id, permission_id, is_active, expires_at);

-- ================================
-- ANALYZE TABLES FOR OPTIMIZATION
-- ================================

-- Update table statistics for the query optimizer
ANALYZE TABLE users;
ANALYZE TABLE user_sessions;
ANALYZE TABLE password_resets;
ANALYZE TABLE roles;
ANALYZE TABLE permissions;
ANALYZE TABLE role_permissions;
ANALYZE TABLE user_roles;

-- ================================
-- INDEX USAGE MONITORING SETUP
-- ================================

-- Enable performance schema for index monitoring
-- Note: This requires appropriate privileges and may need to be done by DBA
-- UPDATE performance_schema.setup_consumers SET ENABLED = 'YES' WHERE NAME = 'events_statements_current';
-- UPDATE performance_schema.setup_consumers SET ENABLED = 'YES' WHERE NAME = 'events_statements_history';
-- UPDATE performance_schema.setup_consumers SET ENABLED = 'YES' WHERE NAME = 'events_statements_history_long';

-- ================================
-- OPTIMIZATION NOTES AND MAINTENANCE
-- ================================


-- MAINTENANCE NOTES:

-- 1. Monitor index usage with these queries:
--    - SELECT * FROM sys.schema_unused_indexes WHERE object_schema = 'your_database_name';
--    - SELECT * FROM sys.schema_redundant_indexes WHERE table_schema = 'your_database_name';

-- 2. Regular maintenance tasks:
--    - ANALYZE TABLE monthly to update statistics
--    - OPTIMIZE TABLE quarterly to defragment indexes
--    - Monitor slow query log for missing indexes

-- 3. Performance testing:
--    - Test common queries with EXPLAIN to verify index usage
--    - Monitor query execution time before/after index creation
--    - Use pt-query-digest to analyze query patterns

-- 4. Index maintenance:
--    - Drop unused indexes to reduce storage overhead
--    - Consider composite indexes for multi-column WHERE clauses
--    - Monitor index selectivity (aim for > 95% selectivity)

-- 5. Memory considerations:
--    - Indexes consume memory (innodb_buffer_pool_size)
--    - Too many indexes can slow down INSERT/UPDATE operations
--    - Balance query performance vs. write performance
