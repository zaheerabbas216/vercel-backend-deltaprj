-- File: database/migrations/004-create-roles-table.sql
-- Migration: Create Roles Table
-- Created: 2024-01-01
-- Description: Table to define user roles in the system
-- 
-- For beginners:
-- Roles represent different types of users in the system (admin, user, manager, etc.)
-- Each role has a name, description, and various settings
-- Roles are assigned to users to control what they can do
-- We support role hierarchies where roles can inherit from parent roles

CREATE TABLE IF NOT EXISTS roles (
    -- Primary key - unique identifier for each role
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Role identification
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique role name (e.g., admin, user, manager)',
    display_name VARCHAR(100) NOT NULL COMMENT 'Human-readable role name (e.g., Administrator)',
    description TEXT NULL COMMENT 'Detailed description of what this role can do',
    
    -- Role hierarchy - allows roles to inherit from parent roles
    parent_role_id INT UNSIGNED NULL COMMENT 'Parent role ID for role inheritance',
    
    -- Role settings
    is_system_role BOOLEAN DEFAULT FALSE COMMENT 'Whether this is a built-in system role (cannot be deleted)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this role can be assigned to users',
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Whether this is the default role for new users',
    
    -- Role permissions and limitations
    max_users INT NULL COMMENT 'Maximum number of users that can have this role (NULL = unlimited)',
    user_count INT DEFAULT 0 COMMENT 'Current number of users with this role',
    
    -- Role metadata
    color_code VARCHAR(7) NULL COMMENT 'Hex color code for UI display (e.g., #FF5722)',
    icon VARCHAR(50) NULL COMMENT 'Icon identifier for UI display',
    
    -- Priority for role ordering and conflict resolution
    priority INT DEFAULT 0 COMMENT 'Role priority (higher number = higher priority)',
    
    -- Soft delete support
    deleted_at TIMESTAMP NULL COMMENT 'When role was soft deleted',
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When role was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When role was last updated',
    created_by INT UNSIGNED NULL COMMENT 'User who created this role',
    updated_by INT UNSIGNED NULL COMMENT 'User who last updated this role',
    
    -- Foreign key constraints
    CONSTRAINT fk_roles_parent FOREIGN KEY (parent_role_id) REFERENCES roles(id) ON DELETE SET NULL,
    CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_name (name),
    INDEX idx_parent_role_id (parent_role_id),
    INDEX idx_is_active (is_active),
    INDEX idx_is_default (is_default),
    INDEX idx_is_system_role (is_system_role),
    INDEX idx_priority (priority),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_created_at (created_at),
    
    -- Composite indexes for common queries
    INDEX idx_active_default (is_active, is_default),
    INDEX idx_system_active (is_system_role, is_active)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User roles for role-based access control';

-- -- Add constraints for data validation
-- ALTER TABLE roles 
-- ADD CONSTRAINT chk_name_format 
-- CHECK (name REGEXP '^[a-z][a-z0-9_]*[a-z0-9]$');

-- ALTER TABLE roles 
-- ADD CONSTRAINT chk_color_format 
-- CHECK (color_code IS NULL OR color_code REGEXP '^#[0-9A-Fa-f]{6}$');

-- ALTER TABLE roles 
-- ADD CONSTRAINT chk_max_users_positive 
-- CHECK (max_users IS NULL OR max_users > 0);

-- ALTER TABLE roles 
-- ADD CONSTRAINT chk_user_count_valid 
-- CHECK (user_count >= 0);

-- ALTER TABLE roles 
-- ADD CONSTRAINT chk_priority_range 
-- CHECK (priority BETWEEN -1000 AND 1000);

-- -- Prevent circular role hierarchy
-- ALTER TABLE roles 
-- ADD CONSTRAINT chk_no_self_parent 
-- CHECK (parent_role_id != id);

-- -- Create a function to check for circular role hierarchy
-- DELIMITER //

-- CREATE FUNCTION HasCircularRoleHierarchy(
--     role_id INT UNSIGNED,
--     check_parent_id INT UNSIGNED
-- ) RETURNS BOOLEAN
-- READS SQL DATA
-- DETERMINISTIC
-- BEGIN
--     DECLARE current_parent INT UNSIGNED;
--     DECLARE depth INT DEFAULT 0;
--     DECLARE max_depth INT DEFAULT 10; -- Prevent infinite loops
    
--     SET current_parent = check_parent_id;
    
--     WHILE current_parent IS NOT NULL AND depth < max_depth DO
--         -- If we find the original role_id in the parent chain, it's circular
--         IF current_parent = role_id THEN
--             RETURN TRUE;
--         END IF;
        
--         -- Get the parent of current_parent
--         SELECT parent_role_id INTO current_parent 
--         FROM roles 
--         WHERE id = current_parent 
--           AND deleted_at IS NULL;
        
--         SET depth = depth + 1;
--     END WHILE;
    
--     RETURN FALSE;
-- END //

-- DELIMITER ;

-- -- Create a procedure to get role hierarchy path
-- DELIMITER //

-- CREATE PROCEDURE GetRoleHierarchyPath(IN role_id INT UNSIGNED)
-- BEGIN
--     DECLARE done INT DEFAULT FALSE;
--     DECLARE current_role_id INT UNSIGNED;
--     DECLARE current_name VARCHAR(50);
--     DECLARE path TEXT DEFAULT '';
    
--     -- Create temporary table to store hierarchy
--     CREATE TEMPORARY TABLE temp_role_path (
--         level INT,
--         role_id INT UNSIGNED,
--         role_name VARCHAR(50),
--         display_name VARCHAR(100)
--     );
    
--     SET current_role_id = role_id;
--     SET @level = 0;
    
--     -- Walk up the hierarchy
--     WHILE current_role_id IS NOT NULL AND @level < 10 DO
--         INSERT INTO temp_role_path (level, role_id, role_name, display_name)
--         SELECT @level, r.id, r.name, r.display_name
--         FROM roles r 
--         WHERE r.id = current_role_id 
--           AND r.deleted_at IS NULL;
        
--         -- Get parent role
--         SELECT parent_role_id INTO current_role_id
--         FROM roles 
--         WHERE id = current_role_id 
--           AND deleted_at IS NULL;
        
--         SET @level = @level + 1;
--     END WHILE;
    
--     -- Return hierarchy path ordered by level (root first)
--     SELECT * FROM temp_role_path ORDER BY level DESC;
    
--     DROP TEMPORARY TABLE temp_role_path;
-- END //

-- DELIMITER ;

-- -- Create a trigger to validate role hierarchy before insert/update
-- DELIMITER //

-- CREATE TRIGGER tr_roles_validate_hierarchy
-- BEFORE UPDATE ON roles
-- FOR EACH ROW
-- BEGIN
--     -- Check for circular hierarchy
--     IF NEW.parent_role_id IS NOT NULL THEN
--         IF HasCircularRoleHierarchy(NEW.id, NEW.parent_role_id) THEN
--             SIGNAL SQLSTATE '45000' 
--             SET MESSAGE_TEXT = 'Cannot create circular role hierarchy';
--         END IF;
--     END IF;
    
--     -- Only one default role allowed
--     IF NEW.is_default = TRUE AND OLD.is_default = FALSE THEN
--         -- Remove default flag from other roles
--         UPDATE roles 
--         SET is_default = FALSE 
--         WHERE id != NEW.id AND is_default = TRUE;
--     END IF;
    
--     -- Update user count validation
--     IF NEW.max_users IS NOT NULL AND NEW.user_count > NEW.max_users THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Current user count exceeds maximum allowed users for this role';
--     END IF;
-- END //

-- CREATE TRIGGER tr_roles_validate_insert
-- BEFORE INSERT ON roles
-- FOR EACH ROW
-- BEGIN
--     -- Check for circular hierarchy
--     IF NEW.parent_role_id IS NOT NULL THEN
--         IF HasCircularRoleHierarchy(NEW.id, NEW.parent_role_id) THEN
--             SIGNAL SQLSTATE '45000' 
--             SET MESSAGE_TEXT = 'Cannot create circular role hierarchy';
--         END IF;
--     END IF;
    
--     -- Only one default role allowed
--     IF NEW.is_default = TRUE THEN
--         UPDATE roles 
--         SET is_default = FALSE 
--         WHERE is_default = TRUE;
--     END IF;
    
--     -- Set default values
--     IF NEW.priority IS NULL THEN
--         SET NEW.priority = 0;
--     END IF;
-- END //

-- DELIMITER ;

-- -- Create a procedure to safely delete roles (prevent deletion of system roles)
-- DELIMITER //

-- CREATE PROCEDURE SafeDeleteRole(IN role_id INT UNSIGNED)
-- BEGIN
--     DECLARE role_name VARCHAR(50);
--     DECLARE is_system BOOLEAN DEFAULT FALSE;
--     DECLARE user_count_val INT DEFAULT 0;
    
--     -- Get role information
--     SELECT name, is_system_role, user_count 
--     INTO role_name, is_system, user_count_val
--     FROM roles 
--     WHERE id = role_id AND deleted_at IS NULL;
    
--     -- Check if role exists
--     IF role_name IS NULL THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Role not found or already deleted';
--     END IF;
    
--     -- Check if it's a system role
--     IF is_system = TRUE THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Cannot delete system roles';
--     END IF;
    
--     -- Check if role has users assigned
--     IF user_count_val > 0 THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Cannot delete role that has users assigned. Remove users first.';
--     END IF;
    
--     -- Soft delete the role
--     UPDATE roles 
--     SET deleted_at = CURRENT_TIMESTAMP,
--         is_active = FALSE
--     WHERE id = role_id;
    
--     SELECT CONCAT('Role "', role_name, '" has been deleted successfully') as result;
-- END //

-- DELIMITER ;