-- File: database/migrations/006-create-role-permissions-table.sql
-- Migration: Create Role Permissions Junction Table
-- Created: 2024-01-01
-- Description: Junction table linking roles to their permissions
-- 
-- For beginners:
-- This is a "junction table" or "pivot table" that connects roles with permissions
-- Each row represents one permission assigned to one role
-- This allows many-to-many relationships: one role can have many permissions,
-- and one permission can belong to many roles

CREATE TABLE IF NOT EXISTS role_permissions (
    -- Primary key - unique identifier for each role-permission assignment
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Foreign keys linking to roles and permissions
    role_id INT UNSIGNED NOT NULL COMMENT 'Reference to the role',
    permission_id INT UNSIGNED NOT NULL COMMENT 'Reference to the permission',
    
    -- Assignment metadata
    granted_by INT UNSIGNED NULL COMMENT 'User who granted this permission to the role',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When permission was granted',
    
    -- Permission scope and conditions
    conditions JSON NULL COMMENT 'JSON object with conditions for this permission (e.g., own_records_only)',
    expires_at TIMESTAMP NULL COMMENT 'When this permission assignment expires (NULL = permanent)',
    
    -- Status and control
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this permission assignment is active',
    is_inherited BOOLEAN DEFAULT FALSE COMMENT 'Whether this permission comes from a parent role',
    inherited_from_role_id INT UNSIGNED NULL COMMENT 'Role ID this permission was inherited from',
    
    -- Audit information
    revoked_by INT UNSIGNED NULL COMMENT 'User who revoked this permission',
    revoked_at TIMESTAMP NULL COMMENT 'When permission was revoked',
    revocation_reason TEXT NULL COMMENT 'Reason for revoking this permission',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When record was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When record was last updated',
    
    -- Foreign key constraints
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_role_permissions_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_role_permissions_inherited_from FOREIGN KEY (inherited_from_role_id) REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Unique constraint - one permission per role (prevent duplicates)
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    
    -- Indexes for performance
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id),
    INDEX idx_granted_by (granted_by),
    INDEX idx_granted_at (granted_at),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active),
    INDEX idx_is_inherited (is_inherited),
    INDEX idx_inherited_from_role (inherited_from_role_id),
    INDEX idx_revoked_at (revoked_at),
    
    -- Composite indexes for common queries
    INDEX idx_role_active (role_id, is_active),
    INDEX idx_permission_active (permission_id, is_active),
    INDEX idx_active_expires (is_active, expires_at),
    INDEX idx_role_inherited (role_id, is_inherited),
    INDEX idx_role_permission_active (role_id, permission_id, is_active)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Junction table linking roles to permissions';

-- -- Add constraints for data validation
-- ALTER TABLE role_permissions 
-- ADD CONSTRAINT chk_expiry_future 
-- CHECK (expires_at IS NULL OR expires_at > granted_at);

-- ALTER TABLE role_permissions 
-- ADD CONSTRAINT chk_revocation_logic 
-- CHECK (
--     (is_active = TRUE AND revoked_at IS NULL AND revoked_by IS NULL) OR 
--     (is_active = FALSE AND revoked_at IS NOT NULL)
-- );

-- ALTER TABLE role_permissions 
-- ADD CONSTRAINT chk_inheritance_logic 
-- CHECK (
--     (is_inherited = FALSE AND inherited_from_role_id IS NULL) OR 
--     (is_inherited = TRUE AND inherited_from_role_id IS NOT NULL)
-- );

-- -- Create a function to get all effective permissions for a role (including inherited)
-- DELIMITER //

-- CREATE FUNCTION GetRoleEffectivePermissions(role_id INT UNSIGNED)
-- RETURNS JSON
-- READS SQL DATA
-- DETERMINISTIC
-- BEGIN
--     DECLARE result JSON;
    
--     -- Get all active permissions for this role and its parent roles
--     WITH RECURSIVE role_hierarchy AS (
--         -- Base case: the role itself
--         SELECT id, parent_role_id, name, 0 as level
--         FROM roles 
--         WHERE id = role_id AND deleted_at IS NULL
        
--         UNION ALL
        
--         -- Recursive case: parent roles
--         SELECT r.id, r.parent_role_id, r.name, rh.level + 1
--         FROM roles r
--         INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
--         WHERE r.deleted_at IS NULL AND rh.level < 10 -- Prevent infinite recursion
--     )
--     SELECT JSON_ARRAYAGG(
--         DISTINCT JSON_OBJECT(
--             'permission_id', p.id,
--             'permission_name', p.name,
--             'permission_display_name', p.display_name,
--             'module', p.module,
--             'action', p.action,
--             'access_level', p.access_level,
--             'scope', p.scope,
--             'conditions', rp.conditions,
--             'expires_at', rp.expires_at,
--             'is_inherited', rp.is_inherited,
--             'inherited_from_role_id', rp.inherited_from_role_id
--         )
--     ) INTO result
--     FROM role_hierarchy rh
--     INNER JOIN role_permissions rp ON rh.id = rp.role_id
--     INNER JOIN permissions p ON rp.permission_id = p.id
--     WHERE rp.is_active = TRUE 
--       AND p.is_active = TRUE 
--       AND p.deleted_at IS NULL
--       AND (rp.expires_at IS NULL OR rp.expires_at > NOW());
    
--     RETURN COALESCE(result, JSON_ARRAY());
-- END //

-- DELIMITER ;

-- -- Create a procedure to grant permission to role
-- DELIMITER //

-- CREATE PROCEDURE GrantPermissionToRole(
--     IN role_id INT UNSIGNED,
--     IN permission_id INT UNSIGNED,
--     IN granted_by_user_id INT UNSIGNED,
--     IN permission_conditions JSON,
--     IN expiry_date TIMESTAMP
-- )
-- BEGIN
--     DECLARE role_name VARCHAR(50);
--     DECLARE permission_name VARCHAR(100);
--     DECLARE existing_count INT DEFAULT 0;
    
--     -- Verify role exists and is active
--     SELECT name INTO role_name
--     FROM roles 
--     WHERE id = role_id AND is_active = TRUE AND deleted_at IS NULL;
    
--     IF role_name IS NULL THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Role not found or inactive';
--     END IF;
    
--     -- Verify permission exists and is active
--     SELECT name INTO permission_name
--     FROM permissions 
--     WHERE id = permission_id AND is_active = TRUE AND deleted_at IS NULL;
    
--     IF permission_name IS NULL THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Permission not found or inactive';
--     END IF;
    
--     -- Check if permission is already assigned to this role
--     SELECT COUNT(*) INTO existing_count
--     FROM role_permissions 
--     WHERE role_id = role_id AND permission_id = permission_id;
    
--     IF existing_count > 0 THEN
--         -- Update existing assignment
--         UPDATE role_permissions 
--         SET is_active = TRUE,
--             conditions = permission_conditions,
--             expires_at = expiry_date,
--             granted_by = granted_by_user_id,
--             granted_at = CURRENT_TIMESTAMP,
--             revoked_by = NULL,
--             revoked_at = NULL,
--             revocation_reason = NULL,
--             updated_at = CURRENT_TIMESTAMP
--         WHERE role_id = role_id AND permission_id = permission_id;
        
--         SELECT CONCAT('Updated permission "', permission_name, '" for role "', role_name, '"') as result;
--     ELSE
--         -- Create new assignment
--         INSERT INTO role_permissions (
--             role_id, permission_id, granted_by, conditions, expires_at
--         ) VALUES (
--             role_id, permission_id, granted_by_user_id, permission_conditions, expiry_date
--         );
        
--         SELECT CONCAT('Granted permission "', permission_name, '" to role "', role_name, '"') as result;
--     END IF;
    
--     -- Update permission usage count
--     UPDATE permissions 
--     SET usage_count = (
--         SELECT COUNT(*) 
--         FROM role_permissions 
--         WHERE permission_id = permission_id AND is_active = TRUE
--     )
--     WHERE id = permission_id;
-- END //

-- DELIMITER ;

-- -- Create a procedure to revoke permission from role
-- DELIMITER //

-- CREATE PROCEDURE RevokePermissionFromRole(
--     IN role_id INT UNSIGNED,
--     IN permission_id INT UNSIGNED,
--     IN revoked_by_user_id INT UNSIGNED,
--     IN revocation_reason TEXT
-- )
-- BEGIN
--     DECLARE role_name VARCHAR(50);
--     DECLARE permission_name VARCHAR(100);
--     DECLARE assignment_count INT DEFAULT 0;
    
--     -- Verify the assignment exists
--     SELECT COUNT(*) INTO assignment_count
--     FROM role_permissions 
--     WHERE role_id = role_id AND permission_id = permission_id AND is_active = TRUE;
    
--     IF assignment_count = 0 THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Permission assignment not found or already revoked';
--     END IF;
    
--     -- Get names for result message
--     SELECT r.name, p.name INTO role_name, permission_name
--     FROM roles r, permissions p
--     WHERE r.id = role_id AND p.id = permission_id;
    
--     -- Revoke the permission
--     UPDATE role_permissions 
--     SET is_active = FALSE,
--         revoked_by = revoked_by_user_id,
--         revoked_at = CURRENT_TIMESTAMP,
--         revocation_reason = revocation_reason,
--         updated_at = CURRENT_TIMESTAMP
--     WHERE role_id = role_id AND permission_id = permission_id;
    
--     -- Update permission usage count
--     UPDATE permissions 
--     SET usage_count = (
--         SELECT COUNT(*) 
--         FROM role_permissions 
--         WHERE permission_id = permission_id AND is_active = TRUE
--     )
--     WHERE id = permission_id;
    
--     SELECT CONCAT('Revoked permission "', permission_name, '" from role "', role_name, '"') as result;
-- END //

-- DELIMITER ;

-- -- Create a procedure to sync inherited permissions from parent roles
-- DELIMITER //

-- CREATE PROCEDURE SyncInheritedPermissions(IN child_role_id INT UNSIGNED)
-- BEGIN
--     DECLARE done INT DEFAULT FALSE;
--     DECLARE parent_role_id INT UNSIGNED;
--     DECLARE parent_permission_id INT UNSIGNED;
--     DECLARE parent_conditions JSON;
--     DECLARE parent_expires_at TIMESTAMP;
    
--     -- Cursor to get parent role permissions
--     DECLARE parent_permissions_cursor CURSOR FOR
--         WITH RECURSIVE role_hierarchy AS (
--             SELECT parent_role_id, 1 as level
--             FROM roles 
--             WHERE id = child_role_id AND parent_role_id IS NOT NULL
            
--             UNION ALL
            
--             SELECT r.parent_role_id, rh.level + 1
--             FROM roles r
--             INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
--             WHERE r.parent_role_id IS NOT NULL AND rh.level < 10
--         )
--         SELECT DISTINCT 
--             rp.role_id,
--             rp.permission_id,
--             rp.conditions,
--             rp.expires_at
--         FROM role_hierarchy rh
--         INNER JOIN role_permissions rp ON rh.parent_role_id = rp.role_id
--         WHERE rp.is_active = TRUE 
--           AND (rp.expires_at IS NULL OR rp.expires_at > NOW());
    
--     DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
--     -- Remove existing inherited permissions
--     DELETE FROM role_permissions 
--     WHERE role_id = child_role_id AND is_inherited = TRUE;
    
--     -- Add inherited permissions from parent roles
--     OPEN parent_permissions_cursor;
    
--     permissions_loop: LOOP
--         FETCH parent_permissions_cursor INTO parent_role_id, parent_permission_id, parent_conditions, parent_expires_at;
        
--         IF done THEN
--             LEAVE permissions_loop;
--         END IF;
        
--         -- Insert inherited permission if not already directly assigned
--         INSERT IGNORE INTO role_permissions (
--             role_id,
--             permission_id,
--             conditions,
--             expires_at,
--             is_inherited,
--             inherited_from_role_id,
--             granted_at
--         ) VALUES (
--             child_role_id,
--             parent_permission_id,
--             parent_conditions,
--             parent_expires_at,
--             TRUE,
--             parent_role_id,
--             CURRENT_TIMESTAMP
--         );
--     END LOOP;
    
--     CLOSE parent_permissions_cursor;
    
--     SELECT CONCAT('Synced inherited permissions for role ID: ', child_role_id) as result;
-- END //

-- DELIMITER ;

-- -- Create triggers to maintain permission inheritance
-- DELIMITER //

-- CREATE TRIGGER tr_role_permissions_after_insert
-- AFTER INSERT ON role_permissions
-- FOR EACH ROW
-- BEGIN
--     -- If this is a direct permission assignment to a role, sync inherited permissions to child roles
--     IF NEW.is_inherited = FALSE THEN
--         -- Update child roles to inherit this permission
--         -- This will be handled by a separate sync process to avoid complex triggers
--         NULL; -- Placeholder for child role inheritance logic
--     END IF;
-- END //

-- CREATE TRIGGER tr_role_permissions_after_update
-- AFTER UPDATE ON role_permissions
-- FOR EACH ROW
-- BEGIN
--     -- Update permission usage count when status changes
--     IF OLD.is_active != NEW.is_active THEN
--         UPDATE permissions 
--         SET usage_count = (
--             SELECT COUNT(*) 
--             FROM role_permissions 
--             WHERE permission_id = NEW.permission_id AND is_active = TRUE
--         )
--         WHERE id = NEW.permission_id;
--     END IF;
-- END //

-- DELIMITER ;

-- -- Create a view for easy querying of active role permissions
-- CREATE VIEW active_role_permissions AS
-- SELECT 
--     rp.id,
--     rp.role_id,
--     r.name as role_name,
--     r.display_name as role_display_name,
--     rp.permission_id,
--     p.name as permission_name,
--     p.display_name as permission_display_name,
--     p.module,
--     p.action,
--     p.access_level,
--     p.scope,
--     rp.conditions,
--     rp.expires_at,
--     rp.is_inherited,
--     rp.inherited_from_role_id,
--     rp.granted_at,
--     rp.granted_by
-- FROM role_permissions rp
-- INNER JOIN roles r ON rp.role_id = r.id
-- INNER JOIN permissions p ON rp.permission_id = p.id
-- WHERE rp.is_active = TRUE 
--   AND r.is_active = TRUE 
--   AND r.deleted_at IS NULL
--   AND p.is_active = TRUE 
--   AND p.deleted_at IS NULL
--   AND (rp.expires_at IS NULL OR rp.expires_at > NOW());