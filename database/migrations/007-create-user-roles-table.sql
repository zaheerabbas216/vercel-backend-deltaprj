-- File: database/migrations/007-create-user-roles-table.sql
-- Migration: Create User Roles Junction Table
-- Created: 2024-01-01
-- Description: Junction table linking users to their assigned roles
-- 
-- For beginners:
-- This table connects users with their roles (many-to-many relationship)
-- Each row represents one role assigned to one user
-- Users can have multiple roles, and roles can be assigned to multiple users
-- This completes the chain: Users → Roles → Permissions

CREATE TABLE IF NOT EXISTS user_roles (
    -- Primary key - unique identifier for each user-role assignment
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Foreign keys linking to users and roles
    user_id INT UNSIGNED NOT NULL COMMENT 'Reference to the user',
    role_id INT UNSIGNED NOT NULL COMMENT 'Reference to the role',
    
    -- Assignment metadata
    assigned_by INT UNSIGNED NULL COMMENT 'User who assigned this role',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When role was assigned',
    
    -- Role assignment scope and conditions
    conditions JSON NULL COMMENT 'JSON object with conditions for this role assignment',
    expires_at TIMESTAMP NULL COMMENT 'When this role assignment expires (NULL = permanent)',
    
    -- Context information
    assignment_reason TEXT NULL COMMENT 'Reason for assigning this role',
    context VARCHAR(100) NULL COMMENT 'Context of assignment (e.g., promotion, project, temporary)',
    
    -- Status and control
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this role assignment is active',
    is_primary BOOLEAN DEFAULT FALSE COMMENT 'Whether this is the user primary/main role',
    
    -- Audit and revocation information
    revoked_by INT UNSIGNED NULL COMMENT 'User who revoked this role',
    revoked_at TIMESTAMP NULL COMMENT 'When role was revoked',
    revocation_reason TEXT NULL COMMENT 'Reason for revoking this role',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When record was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When record was last updated',
    
    -- Foreign key constraints
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_roles_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraint - one role per user (prevent duplicate assignments)
    UNIQUE KEY uk_user_role (user_id, role_id),
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id),
    INDEX idx_assigned_by (assigned_by),
    INDEX idx_assigned_at (assigned_at),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active),
    INDEX idx_is_primary (is_primary),
    INDEX idx_revoked_at (revoked_at),
    INDEX idx_context (context),
    
    -- Composite indexes for common queries
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_role_active (role_id, is_active),
    INDEX idx_user_primary (user_id, is_primary),
    INDEX idx_active_expires (is_active, expires_at),
    INDEX idx_user_role_active (user_id, role_id, is_active)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Junction table linking users to roles';

-- -- Add constraints for data validation
-- ALTER TABLE user_roles 
-- ADD CONSTRAINT chk_expiry_future 
-- CHECK (expires_at IS NULL OR expires_at > assigned_at);

-- ALTER TABLE user_roles 
-- ADD CONSTRAINT chk_revocation_logic 
-- CHECK (
--     (is_active = TRUE AND revoked_at IS NULL AND revoked_by IS NULL) OR 
--     (is_active = FALSE AND revoked_at IS NOT NULL)
-- );

-- -- Create a function to get all effective permissions for a user
-- DELIMITER //

-- CREATE FUNCTION GetUserEffectivePermissions(user_id INT UNSIGNED)
-- RETURNS JSON
-- READS SQL DATA
-- DETERMINISTIC
-- BEGIN
--     DECLARE result JSON;
    
--     SELECT JSON_ARRAYAGG(
--         DISTINCT JSON_OBJECT(
--             'permission_id', p.id,
--             'permission_name', p.name,
--             'permission_display_name', p.display_name,
--             'module', p.module,
--             'action', p.action,
--             'access_level', p.access_level,
--             'scope', p.scope,
--             'role_id', r.id,
--             'role_name', r.name,
--             'role_display_name', r.display_name,
--             'conditions', COALESCE(rp.conditions, ur.conditions),
--             'expires_at', LEAST(COALESCE(rp.expires_at, '9999-12-31'), COALESCE(ur.expires_at, '9999-12-31'))
--         )
--     ) INTO result
--     FROM user_roles ur
--     INNER JOIN roles r ON ur.role_id = r.id
--     INNER JOIN role_permissions rp ON r.id = rp.role_id
--     INNER JOIN permissions p ON rp.permission_id = p.id
--     WHERE ur.user_id = user_id
--       AND ur.is_active = TRUE
--       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
--       AND r.is_active = TRUE 
--       AND r.deleted_at IS NULL
--       AND rp.is_active = TRUE
--       AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
--       AND p.is_active = TRUE 
--       AND p.deleted_at IS NULL;
    
--     RETURN COALESCE(result, JSON_ARRAY());
-- END //

-- DELIMITER ;

-- -- Create a procedure to assign role to user
-- DELIMITER //

-- CREATE PROCEDURE AssignRoleToUser(
--     IN user_id INT UNSIGNED,
--     IN role_id INT UNSIGNED,
--     IN assigned_by_user_id INT UNSIGNED,
--     IN assignment_reason TEXT,
--     IN assignment_context VARCHAR(100),
--     IN role_conditions JSON,
--     IN expiry_date TIMESTAMP,
--     IN is_primary_role BOOLEAN
-- )
-- BEGIN
--     DECLARE user_email VARCHAR(255);
--     DECLARE role_name VARCHAR(50);
--     DECLARE existing_count INT DEFAULT 0;
--     DECLARE role_max_users INT;
--     DECLARE role_current_users INT;
    
--     -- Verify user exists and is active
--     SELECT email INTO user_email
--     FROM users 
--     WHERE id = user_id AND is_active = TRUE AND deleted_at IS NULL;
    
--     IF user_email IS NULL THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'User not found or inactive';
--     END IF;
    
--     -- Verify role exists and is active
--     SELECT name, max_users, user_count INTO role_name, role_max_users, role_current_users
--     FROM roles 
--     WHERE id = role_id AND is_active = TRUE AND deleted_at IS NULL;
    
--     IF role_name IS NULL THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Role not found or inactive';
--     END IF;
    
--     -- Check role capacity
--     IF role_max_users IS NOT NULL AND role_current_users >= role_max_users THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Role has reached maximum user capacity';
--     END IF;
    
--     -- Check if role is already assigned to this user
--     SELECT COUNT(*) INTO existing_count
--     FROM user_roles 
--     WHERE user_id = user_id AND role_id = role_id;
    
--     -- If this is set as primary role, remove primary flag from other roles
--     IF is_primary_role = TRUE THEN
--         UPDATE user_roles 
--         SET is_primary = FALSE 
--         WHERE user_id = user_id AND is_primary = TRUE;
--     END IF;
    
--     IF existing_count > 0 THEN
--         -- Update existing assignment
--         UPDATE user_roles 
--         SET is_active = TRUE,
--             conditions = role_conditions,
--             expires_at = expiry_date,
--             assigned_by = assigned_by_user_id,
--             assigned_at = CURRENT_TIMESTAMP,
--             assignment_reason = assignment_reason,
--             context = assignment_context,
--             is_primary = is_primary_role,
--             revoked_by = NULL,
--             revoked_at = NULL,
--             revocation_reason = NULL,
--             updated_at = CURRENT_TIMESTAMP
--         WHERE user_id = user_id AND role_id = role_id;
        
--         SELECT CONCAT('Updated role "', role_name, '" for user "', user_email, '"') as result;
--     ELSE
--         -- Create new assignment
--         INSERT INTO user_roles (
--             user_id, role_id, assigned_by, assignment_reason, context, 
--             conditions, expires_at, is_primary
--         ) VALUES (
--             user_id, role_id, assigned_by_user_id, assignment_reason, assignment_context,
--             role_conditions, expiry_date, is_primary_role
--         );
        
--         SELECT CONCAT('Assigned role "', role_name, '" to user "', user_email, '"') as result;
--     END IF;
    
--     -- Update role user count
--     UPDATE roles 
--     SET user_count = (
--         SELECT COUNT(*) 
--         FROM user_roles 
--         WHERE role_id = role_id AND is_active = TRUE
--     )
--     WHERE id = role_id;
-- END //

-- DELIMITER ;

-- -- Create a procedure to revoke role from user
-- DELIMITER //

-- CREATE PROCEDURE RevokeRoleFromUser(
--     IN user_id INT UNSIGNED,
--     IN role_id INT UNSIGNED,
--     IN revoked_by_user_id INT UNSIGNED,
--     IN revocation_reason TEXT
-- )
-- BEGIN
--     DECLARE user_email VARCHAR(255);
--     DECLARE role_name VARCHAR(50);
--     DECLARE assignment_count INT DEFAULT 0;
--     DECLARE was_primary BOOLEAN DEFAULT FALSE;
    
--     -- Verify the assignment exists
--     SELECT COUNT(*), MAX(is_primary) INTO assignment_count, was_primary
--     FROM user_roles 
--     WHERE user_id = user_id AND role_id = role_id AND is_active = TRUE;
    
--     IF assignment_count = 0 THEN
--         SIGNAL SQLSTATE '45000' 
--         SET MESSAGE_TEXT = 'Role assignment not found or already revoked';
--     END IF;
    
--     -- Get names for result message
--     SELECT u.email, r.name INTO user_email, role_name
--     FROM users u, roles r
--     WHERE u.id = user_id AND r.id = role_id;
    
--     -- Revoke the role
--     UPDATE user_roles 
--     SET is_active = FALSE,
--         is_primary = FALSE,
--         revoked_by = revoked_by_user_id,
--         revoked_at = CURRENT_TIMESTAMP,
--         revocation_reason = revocation_reason,
--         updated_at = CURRENT_TIMESTAMP
--     WHERE user_id = user_id AND role_id = role_id;
    
--     -- If this was the primary role, assign primary to another active role
--     IF was_primary = TRUE THEN
--         UPDATE user_roles 
--         SET is_primary = TRUE 
--         WHERE user_id = user_id 
--           AND is_active = TRUE 
--           AND (expires_at IS NULL OR expires_at > NOW())
--         ORDER BY assigned_at ASC 
--         LIMIT 1;
--     END IF;
    
--     -- Update role user count
--     UPDATE roles 
--     SET user_count = (
--         SELECT COUNT(*) 
--         FROM user_roles 
--         WHERE role_id = role_id AND is_active = TRUE
--     )
--     WHERE id = role_id;
    
--     SELECT CONCAT('Revoked role "', role_name, '" from user "', user_email, '"') as result;
-- END //

-- DELIMITER ;

-- -- Create a procedure to get user roles summary
-- DELIMITER //

-- CREATE PROCEDURE GetUserRolesSummary(IN user_id INT UNSIGNED)
-- BEGIN
--     SELECT 
--         ur.id as assignment_id,
--         ur.role_id,
--         r.name as role_name,
--         r.display_name as role_display_name,
--         r.color_code as role_color,
--         ur.is_primary,
--         ur.is_active,
--         ur.assigned_at,
--         ur.expires_at,
--         ur.context,
--         ur.assignment_reason,
--         CASE 
--             WHEN ur.expires_at IS NOT NULL AND ur.expires_at <= NOW() THEN 'expired'
--             WHEN ur.is_active = FALSE THEN 'revoked'
--             ELSE 'active'
--         END as status,
--         -- Count of permissions this role provides
--         (SELECT COUNT(*) 
--          FROM role_permissions rp 
--          WHERE rp.role_id = ur.role_id 
--            AND rp.is_active = TRUE 
--            AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
--         ) as permission_count
--     FROM user_roles ur
--     INNER JOIN roles r ON ur.role_id = r.id
--     WHERE ur.user_id = user_id
--       AND r.deleted_at IS NULL
--     ORDER BY ur.is_primary DESC, ur.assigned_at DESC;
-- END //

-- DELIMITER ;

-- -- Create a procedure to check if user has specific permission
-- DELIMITER //

-- CREATE FUNCTION UserHasPermission(
--     check_user_id INT UNSIGNED,
--     permission_name VARCHAR(100)
-- ) RETURNS BOOLEAN
-- READS SQL DATA
-- DETERMINISTIC
-- BEGIN
--     DECLARE permission_count INT DEFAULT 0;
    
--     SELECT COUNT(*) INTO permission_count
--     FROM user_roles ur
--     INNER JOIN roles r ON ur.role_id = r.id
--     INNER JOIN role_permissions rp ON r.id = rp.role_id
--     INNER JOIN permissions p ON rp.permission_id = p.id
--     WHERE ur.user_id = check_user_id
--       AND p.name = permission_name
--       AND ur.is_active = TRUE
--       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
--       AND r.is_active = TRUE 
--       AND r.deleted_at IS NULL
--       AND rp.is_active = TRUE
--       AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
--       AND p.is_active = TRUE 
--       AND p.deleted_at IS NULL;
    
--     RETURN permission_count > 0;
-- END //

-- DELIMITER ;

-- -- Create triggers to maintain data consistency
-- DELIMITER //

-- CREATE TRIGGER tr_user_roles_after_insert
-- AFTER INSERT ON user_roles
-- FOR EACH ROW
-- BEGIN
--     -- Update role user count
--     UPDATE roles 
--     SET user_count = (
--         SELECT COUNT(*) 
--         FROM user_roles 
--         WHERE role_id = NEW.role_id AND is_active = TRUE
--     )
--     WHERE id = NEW.role_id;
    
--     -- If no primary role exists, make this the primary
--     IF NEW.is_primary = FALSE THEN
--         IF NOT EXISTS (
--             SELECT 1 FROM user_roles 
--             WHERE user_id = NEW.user_id AND is_primary = TRUE AND is_active = TRUE
--         ) THEN
--             UPDATE user_roles 
--             SET is_primary = TRUE 
--             WHERE id = NEW.id;
--         END IF;
--     END IF;
-- END //

-- CREATE TRIGGER tr_user_roles_after_update
-- AFTER UPDATE ON user_roles
-- FOR EACH ROW
-- BEGIN
--     -- Update role user count when status changes
--     IF OLD.is_active != NEW.is_active THEN
--         UPDATE roles 
--         SET user_count = (
--             SELECT COUNT(*) 
--             FROM user_roles 
--             WHERE role_id = NEW.role_id AND is_active = TRUE
--         )
--         WHERE id = NEW.role_id;
--     END IF;
    
--     -- Ensure user always has at least one primary role if they have active roles
--     IF OLD.is_primary = TRUE AND NEW.is_primary = FALSE THEN
--         IF EXISTS (
--             SELECT 1 FROM user_roles 
--             WHERE user_id = NEW.user_id AND is_active = TRUE AND id != NEW.id
--         ) AND NOT EXISTS (
--             SELECT 1 FROM user_roles 
--             WHERE user_id = NEW.user_id AND is_primary = TRUE AND is_active = TRUE
--         ) THEN
--             UPDATE user_roles 
--             SET is_primary = TRUE 
--             WHERE user_id = NEW.user_id 
--               AND is_active = TRUE 
--               AND id != NEW.id
--             ORDER BY assigned_at ASC 
--             LIMIT 1;
--         END IF;
--     END IF;
-- END //

-- DELIMITER ;

-- -- Create a view for easy querying of active user roles
-- CREATE VIEW active_user_roles AS
-- SELECT 
--     ur.id,
--     ur.user_id,
--     u.email as user_email,
--     CONCAT(u.first_name, ' ', u.last_name) as user_name,
--     ur.role_id,
--     r.name as role_name,
--     r.display_name as role_display_name,
--     r.color_code as role_color,
--     ur.is_primary,
--     ur.assigned_at,
--     ur.expires_at,
--     ur.context,
--     ur.assignment_reason,
--     CASE 
--         WHEN ur.expires_at IS NOT NULL AND ur.expires_at <= NOW() THEN 'expired'
--         ELSE 'active'
--     END as status
-- FROM user_roles ur
-- INNER JOIN users u ON ur.user_id = u.id
-- INNER JOIN roles r ON ur.role_id = r.id
-- WHERE ur.is_active = TRUE 
--   AND u.is_active = TRUE 
--   AND u.deleted_at IS NULL
--   AND r.is_active = TRUE 
--   AND r.deleted_at IS NULL;

-- -- Create an event to automatically handle expired role assignments
-- CREATE EVENT IF NOT EXISTS cleanup_expired_user_roles
-- ON SCHEDULE EVERY 1 HOUR
-- STARTS CURRENT_TIMESTAMP
-- DO
-- BEGIN
--     -- Deactivate expired role assignments
--     UPDATE user_roles 
--     SET is_active = FALSE,
--         revoked_at = CURRENT_TIMESTAMP,
--         revocation_reason = 'Automatic expiration'
--     WHERE is_active = TRUE 
--       AND expires_at IS NOT NULL 
--       AND expires_at <= NOW();
    
--     -- Update role user counts
--     UPDATE roles r
--     SET user_count = (
--         SELECT COUNT(*) 
--         FROM user_roles ur 
--         WHERE ur.role_id = r.id AND ur.is_active = TRUE
--     );
-- END;