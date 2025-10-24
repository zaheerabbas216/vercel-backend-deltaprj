-- File: database/migrations/005-create-permissions-table.sql
-- Migration: Create Permissions Table
-- Created: 2024-01-01
-- Description: Table to define specific permissions in the system
-- 
-- For beginners:
-- Permissions are specific actions that users can perform (like create_user, edit_post, view_reports)
-- Each permission has a name, description, and belongs to a module/category
-- Permissions are assigned to roles, and roles are assigned to users
-- This creates a flexible permission system: User → Roles → Permissions

CREATE TABLE IF NOT EXISTS permissions (
    -- Primary key - unique identifier for each permission
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Permission identification
    name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique permission name (e.g., users.create, posts.edit)',
    display_name VARCHAR(150) NOT NULL COMMENT 'Human-readable permission name',
    description TEXT NULL COMMENT 'Detailed description of what this permission allows',
    
    -- Permission categorization
    module VARCHAR(50) NOT NULL COMMENT 'Module/category this permission belongs to (e.g., users, posts, reports)',
    action VARCHAR(50) NOT NULL COMMENT 'Action type (e.g., create, read, update, delete, manage)',
    resource VARCHAR(50) NULL COMMENT 'Specific resource this permission applies to',
    
    -- Permission settings
    is_system_permission BOOLEAN DEFAULT FALSE COMMENT 'Whether this is a built-in system permission',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this permission can be assigned',
    
    -- Permission grouping and organization
    group_name VARCHAR(50) NULL COMMENT 'Permission group for UI organization',
    sort_order INT DEFAULT 0 COMMENT 'Display order within group',
    
    -- Permission metadata
    icon VARCHAR(50) NULL COMMENT 'Icon identifier for UI display',
    color_code VARCHAR(7) NULL COMMENT 'Hex color code for UI display',
    
    -- Access level and scope
    access_level ENUM('basic', 'intermediate', 'advanced', 'admin') DEFAULT 'basic' COMMENT 'Complexity/danger level of permission',
    scope ENUM('own', 'team', 'organization', 'global') DEFAULT 'own' COMMENT 'Scope of access this permission grants',
    
    -- Dependencies - some permissions require other permissions
    requires_permissions JSON NULL COMMENT 'JSON array of permission IDs that this permission requires',
    
    -- Usage tracking
    usage_count INT DEFAULT 0 COMMENT 'Number of roles that have this permission',
    
    -- Soft delete support
    deleted_at TIMESTAMP NULL COMMENT 'When permission was soft deleted',
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When permission was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When permission was last updated',
    created_by INT UNSIGNED NULL COMMENT 'User who created this permission',
    updated_by INT UNSIGNED NULL COMMENT 'User who last updated this permission',
    
    -- Foreign key constraints
    CONSTRAINT fk_permissions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_permissions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_name (name),
    INDEX idx_module (module),
    INDEX idx_action (action),
    INDEX idx_resource (resource),
    INDEX idx_is_active (is_active),
    INDEX idx_is_system_permission (is_system_permission),
    INDEX idx_group_name (group_name),
    INDEX idx_access_level (access_level),
    INDEX idx_scope (scope),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_created_at (created_at),
    
    -- Composite indexes for common queries
    INDEX idx_module_action (module, action),
    INDEX idx_module_active (module, is_active),
    INDEX idx_group_sort (group_name, sort_order),
    INDEX idx_system_active (is_system_permission, is_active),
    INDEX idx_level_scope (access_level, scope)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System permissions for role-based access control';

-- -- Add constraints for data validation
-- ALTER TABLE permissions 
-- ADD CONSTRAINT chk_name_format 
-- CHECK (name REGEXP '^[a-z][a-z0-9._]*[a-z0-9]);

-- ALTER TABLE permissions 
-- ADD CONSTRAINT chk_module_format 
-- CHECK (module REGEXP '^[a-z][a-z0-9_]*[a-z0-9]);

-- ALTER TABLE permissions 
-- ADD CONSTRAINT chk_action_format 
-- CHECK (action REGEXP '^[a-z][a-z0-9_]*[a-z0-9]);

-- ALTER TABLE permissions 
-- ADD CONSTRAINT chk_color_format 
-- CHECK (color_code IS NULL OR color_code REGEXP '^#[0-9A-Fa-f]{6});

-- ALTER TABLE permissions 
-- ADD CONSTRAINT chk_usage_count_valid 
-- CHECK (usage_count >= 0);

-- ALTER TABLE permissions 
-- ADD CONSTRAINT chk_sort_order_valid 
-- CHECK (sort_order BETWEEN 0 AND 9999);

-- -- Create a function to get all permissions for a module
-- DELIMITER //

-- CREATE FUNCTION GetModulePermissions(module_name VARCHAR(50))
-- RETURNS JSON
-- READS SQL DATA
-- DETERMINISTIC
-- BEGIN
--     DECLARE result JSON;
    
--     SELECT JSON_ARRAYAGG(
--         JSON_OBJECT(
--             'id', id,
--             'name', name,
--             'display_name', display_name,
--             'action', action,
--             'resource', resource,
--             'access_level', access_level,
--             'scope', scope
--         )
--     ) INTO result
--     FROM permissions 
--     WHERE module = module_name 
--       AND is_active = TRUE 
--       AND deleted_at IS NULL
--     ORDER BY sort_order, name;
    
--     RETURN COALESCE(result, JSON_ARRAY());
-- END //

-- DELIMITER ;

-- -- Create a function to check permission dependencies
-- DELIMITER //

-- CREATE FUNCTION CheckPermissionDependencies(permission_id INT UNSIGNED, user_permissions JSON)
-- RETURNS BOOLEAN
-- READS SQL DATA
-- DETERMINISTIC
-- BEGIN
--     DECLARE required_permissions JSON;
--     DECLARE dependency_count INT DEFAULT 0;
--     DECLARE i INT DEFAULT 0;
--     DECLARE required_permission_id INT;
    
--     -- Get required permissions for this permission
--     SELECT requires_permissions INTO required_permissions
--     FROM permissions 
--     WHERE id = permission_id;
    
--     -- If no dependencies, return true
--     IF required_permissions IS NULL OR JSON_LENGTH(required_permissions) = 0 THEN
--         RETURN TRUE;
--     END IF;
    
--     -- Check each required permission
--     SET dependency_count = JSON_LENGTH(required_permissions);
    
--     WHILE i < dependency_count DO
--         SET required_permission_id = JSON_UNQUOTE(JSON_EXTRACT(required_permissions, CONCAT('$[', i, ']')));
        
--         -- Check if user has this required permission
--         IF NOT JSON_CONTAINS(user_permissions, CAST(required_permission_id AS JSON)) THEN
--             RETURN FALSE;
--         END IF;
        
--         SET i = i + 1;
--     END WHILE;
    
--     RETURN TRUE;
-- END //

-- DELIMITER ;

-- -- Create a procedure to organize permissions by groups
-- DELIMITER //

-- CREATE PROCEDURE GetPermissionsByGroups()
-- BEGIN
--     SELECT 
--         COALESCE(group_name, 'Ungrouped') as group_name,
--         COUNT(*) as permission_count,
--         JSON_ARRAYAGG(
--             JSON_OBJECT(
--                 'id', id,
--                 'name', name,
--                 'display_name', display_name,
--                 'module', module,
--                 'action', action,
--                 'access_level', access_level,
--                 'scope', scope,
--                 'icon', icon,
--                 'color_code', color_code
--             )
--         ) as permissions
--     FROM permissions 
--     WHERE is_active = TRUE 
--       AND deleted_at IS NULL
--     GROUP BY COALESCE(group_name, 'Ungrouped')
--     ORDER BY 
--         CASE 
--             WHEN group_name IS NULL THEN 1 
--             ELSE 0 
--         END,
--         group_name;
-- END //

-- DELIMITER ;

-- -- Create a procedure to bulk create permissions for a module
-- DELIMITER //

-- CREATE PROCEDURE CreateModulePermissions(
--     IN module_name VARCHAR(50),
--     IN module_display_name VARCHAR(100),
--     IN created_by_user_id INT UNSIGNED
-- )
-- BEGIN
--     DECLARE module_group VARCHAR(50);
--     SET module_group = CONCAT(module_display_name, ' Management');
    
--     -- Create standard CRUD permissions
--     INSERT INTO permissions (
--         name, display_name, description, module, action, group_name, 
--         access_level, scope, sort_order, created_by
--     ) VALUES 
--     (
--         CONCAT(module_name, '.create'),
--         CONCAT('Create ', module_display_name),
--         CONCAT('Create new ', LOWER(module_display_name), ' records'),
--         module_name, 'create', module_group, 'basic', 'own', 1, created_by_user_id
--     ),
--     (
--         CONCAT(module_name, '.read'),
--         CONCAT('View ', module_display_name),
--         CONCAT('View ', LOWER(module_display_name), ' records'),
--         module_name, 'read', module_group, 'basic', 'own', 2, created_by_user_id
--     ),
--     (
--         CONCAT(module_name, '.update'),
--         CONCAT('Edit ', module_display_name),
--         CONCAT('Edit existing ', LOWER(module_display_name), ' records'),
--         module_name, 'update', module_group, 'basic', 'own', 3, created_by_user_id
--     ),
--     (
--         CONCAT(module_name, '.delete'),
--         CONCAT('Delete ', module_display_name),
--         CONCAT('Delete ', LOWER(module_display_name), ' records'),
--         module_name, 'delete', module_group, 'intermediate', 'own', 4, created_by_user_id
--     ),
--     (
--         CONCAT(module_name, '.manage'),
--         CONCAT('Manage All ', module_display_name),
--         CONCAT('Full management access to all ', LOWER(module_display_name), ' records'),
--         module_name, 'manage', module_group, 'admin', 'global', 5, created_by_user_id
--     );
    
--     SELECT CONCAT('Created standard permissions for module: ', module_name) as result;
-- END //

-- DELIMITER ;

-- -- Create a trigger to update usage_count when permissions are assigned/unassigned
-- DELIMITER //

-- CREATE TRIGGER tr_permissions_update_usage
-- AFTER UPDATE ON permissions
-- FOR EACH ROW
-- BEGIN
--     -- This will be updated when role_permissions table is created
--     -- For now, just ensure usage_count doesn't go negative
--     IF NEW.usage_count < 0 THEN
--         UPDATE permissions SET usage_count = 0 WHERE id = NEW.id;
--     END IF;
-- END //

-- DELIMITER ;

-- -- Create a procedure to safely delete permissions
-- DELIMITER //

-- CREATE PROCEDURE SafeDeletePermission(IN permission_id INT UNSIGNED)
-- BEGIN
--     DECLARE permission_name VARCHAR(100);
--     DECLARE is_system BOOLEAN DEFAULT FALSE;
--     DECLARE usage_count_val INT DEFAULT 0;
    
--     -- Get permission information
--     SELECT name, is_system_permission, usage_count 
--     INTO permission_name, is_system, usage_count_val
--     FROM permissions 
--     WHERE id = permission_id AND deleted_at IS NULL;
    
--     -- Check if permission exists
--     IF permission_name IS NULL THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Permission not found or already deleted';
--     END IF;
    
--     -- Check if it's a system permission
--     IF is_system = TRUE THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Cannot delete system permissions';
--     END IF;
    
--     -- Check if permission is assigned to roles
--     IF usage_count_val > 0 THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Cannot delete permission that is assigned to roles. Remove from roles first.';
--     END IF;
    
--     -- Soft delete the permission
--     UPDATE permissions 
--     SET deleted_at = CURRENT_TIMESTAMP,
--         is_active = FALSE
--     WHERE id = permission_id;
    
--     SELECT CONCAT('Permission "', permission_name, '" has been deleted successfully') as result;
-- END //

-- DELIMITER ;