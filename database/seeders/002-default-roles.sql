-- -- database/seeders/002-default-roles.sql
-- -- Default Roles Seeder - Creates system roles
-- -- 
-- -- This seeder creates the essential system roles for RBAC.
-- -- These roles provide different levels of access and functionality.
-- --
-- -- For beginners:
-- -- - Roles define what groups of users can do in the system
-- -- - System roles cannot be deleted by users
-- -- - Hierarchy allows role inheritance (child roles get parent permissions)
-- -- - Priority determines role importance and display order

-- -- Insert Super Admin role (highest level)
-- INSERT IGNORE INTO roles (
--     name,
--     description,
--     priority,
--     is_system_role,
--     is_active,
--     max_users,
--     created_at,
--     updated_at
-- ) VALUES (
--     'super_admin',
--     'Super Administrator with full system access and user management capabilities',
--     1,
--     1,
--     1,
--     5,
--     NOW(),
--     NOW()
-- );

-- -- Insert Admin role
-- INSERT IGNORE INTO roles (
--     name,
--     description,
--     priority,
--     is_system_role,
--     is_active,
--     max_users,
--     parent_role_id,
--     created_at,
--     updated_at
-- ) VALUES (
--     'admin',
--     'Administrator with management access to most system features',
--     2,
--     1,
--     1,
--     20,
--     (SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1),
--     NOW(),
--     NOW()
-- );

-- -- Insert Manager role
-- INSERT IGNORE INTO roles (
--     name,
--     description,
--     priority,
--     is_system_role,
--     is_active,
--     max_users,
--     parent_role_id,
--     created_at,
--     updated_at
-- ) VALUES (
--     'manager',
--     'Manager with access to manage teams and business operations',
--     3,
--     1,
--     1,
--     100,
--     (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
--     NOW(),
--     NOW()
-- );

-- -- Insert Employee role
-- INSERT IGNORE INTO roles (
--     name,
--     description,
--     priority,
--     is_system_role,
--     is_active,
--     max_users,
--     created_at,
--     updated_at
-- ) VALUES (
--     'employee',
--     'Employee with access to standard business functions',
--     4,
--     1,
--     1,
--     1000,
--     NOW(),
--     NOW()
-- );

-- -- Insert Customer role
-- INSERT IGNORE INTO roles (
--     name,
--     description,
--     priority,
--     is_system_role,
--     is_active,
--     max_users,
--     created_at,
--     updated_at
-- ) VALUES (
--     'customer',
--     'Customer with access to customer-facing features',
--     5,
--     1,
--     1,
--     10000,
--     NOW(),
--     NOW()
-- );

-- -- Insert Support role
-- INSERT IGNORE INTO roles (
--     name,
--     description,
--     priority,
--     is_system_role,
--     is_active,
--     max_users,
--     created_at,
--     updated_at
-- ) VALUES (
--     'support',
--     'Support staff with access to customer service tools',
--     6,
--     1,
--     1,
--     50,
--     NOW(),
--     NOW()
-- );

-- -- Insert Guest role (for unauthenticated users)
-- INSERT IGNORE INTO roles (
--     name,
--     description,
--     priority,
--     is_system_role,
--     is_active,
--     max_users,
--     created_at,
--     updated_at
-- ) VALUES (
--     'guest',
--     'Guest user with minimal access to public features',
--     7,
--     1,
--     1,
--     NULL,
--     NOW(),
--     NOW()
-- );

-- -- Log the seeding operation
-- SELECT 'Default system roles seeded successfully' as message;


INSERT IGNORE INTO roles (name, description, priority, is_system_role, is_active, max_users, created_at, updated_at) VALUES
('super_admin', 'Super Administrator with full system access', 1, 1, 1, 5, NOW(), NOW()),
('admin', 'Administrator with management access', 2, 1, 1, 20, NOW(), NOW()),
('manager', 'Manager with access to manage teams', 3, 1, 1, 100, NOW(), NOW()),
('employee', 'Employee with standard access', 4, 1, 1, 1000, NOW(), NOW()),
('customer', 'Customer with customer-facing features', 5, 1, 1, 10000, NOW(), NOW()),
('support', 'Support staff access', 6, 1, 1, 50, NOW(), NOW()),
('guest', 'Guest user with minimal access', 7, 1, 1, NULL, NOW(), NOW());

-- Update parent relationships after all roles exist
UPDATE roles SET parent_role_id = (SELECT id FROM (SELECT id FROM roles WHERE name = 'super_admin') AS tmp) WHERE name = 'admin';
UPDATE roles SET parent_role_id = (SELECT id FROM (SELECT id FROM roles WHERE name = 'admin') AS tmp) WHERE name = 'manager';

-- Log the seeding operation
SELECT 'Default system roles seeded successfully' as message;