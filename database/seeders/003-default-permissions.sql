-- database/seeders/003-default-permissions.sql
-- Default Permissions Seeder - Creates system permissions
-- 
-- This seeder creates the core permissions for all system modules.
-- Permissions follow the format: module.action (e.g., users.create)
--
-- For beginners:
-- - Permissions define specific actions users can perform
-- - They are grouped by modules (users, roles, customers, etc.)
-- - Access levels: admin, manager, employee, customer
-- - System permissions cannot be deleted by users

-- System Administration Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('system.manage', 'Manage system settings and configuration', 'system', 'manage', 'admin', 1, 1, NOW(), NOW()),
('system.backup', 'Create and restore system backups', 'system', 'backup', 'admin', 1, 1, NOW(), NOW()),
('system.logs', 'View system logs and audit trails', 'system', 'logs', 'admin', 1, 1, NOW(), NOW()),
('system.health', 'View system health and performance metrics', 'system', 'health', 'admin', 1, 1, NOW(), NOW());

-- User Management Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('users.create', 'Create new user accounts', 'users', 'create', 'admin', 1, 1, NOW(), NOW()),
('users.read', 'View user account information', 'users', 'read', 'manager', 1, 1, NOW(), NOW()),
('users.update', 'Update user account information', 'users', 'update', 'manager', 1, 1, NOW(), NOW()),
('users.delete', 'Delete user accounts', 'users', 'delete', 'admin', 1, 1, NOW(), NOW()),
('users.list', 'List and search user accounts', 'users', 'list', 'manager', 1, 1, NOW(), NOW()),
('users.activate', 'Activate/deactivate user accounts', 'users', 'activate', 'admin', 1, 1, NOW(), NOW()),
('users.verify', 'Verify user email addresses', 'users', 'verify', 'admin', 1, 1, NOW(), NOW()),
('users.impersonate', 'Impersonate other users', 'users', 'impersonate', 'admin', 1, 1, NOW(), NOW());

-- Role Management Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('roles.create', 'Create new roles', 'roles', 'create', 'admin', 1, 1, NOW(), NOW()),
('roles.read', 'View role information', 'roles', 'read', 'manager', 1, 1, NOW(), NOW()),
('roles.update', 'Update role information', 'roles', 'update', 'admin', 1, 1, NOW(), NOW()),
('roles.delete', 'Delete roles', 'roles', 'delete', 'admin', 1, 1, NOW(), NOW()),
('roles.list', 'List and search roles', 'roles', 'list', 'manager', 1, 1, NOW(), NOW()),
('roles.assign', 'Assign roles to users', 'roles', 'assign', 'admin', 1, 1, NOW(), NOW()),
('roles.revoke', 'Revoke roles from users', 'roles', 'revoke', 'admin', 1, 1, NOW(), NOW());

-- Permission Management Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('permissions.create', 'Create new permissions', 'permissions', 'create', 'admin', 1, 1, NOW(), NOW()),
('permissions.read', 'View permission information', 'permissions', 'read', 'manager', 1, 1, NOW(), NOW()),
('permissions.update', 'Update permission information', 'permissions', 'update', 'admin', 1, 1, NOW(), NOW()),
('permissions.delete', 'Delete permissions', 'permissions', 'delete', 'admin', 1, 1, NOW(), NOW()),
('permissions.list', 'List and search permissions', 'permissions', 'list', 'manager', 1, 1, NOW(), NOW()),
('permissions.assign', 'Assign permissions to roles', 'permissions', 'assign', 'admin', 1, 1, NOW(), NOW()),
('permissions.revoke', 'Revoke permissions from roles', 'permissions', 'revoke', 'admin', 1, 1, NOW(), NOW());

-- Authentication Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('auth.login', 'Login to the system', 'auth', 'login', 'customer', 1, 1, NOW(), NOW()),
('auth.logout', 'Logout from the system', 'auth', 'logout', 'customer', 1, 1, NOW(), NOW()),
('auth.register', 'Register new account', 'auth', 'register', 'customer', 1, 1, NOW(), NOW()),
('auth.profile', 'View and update own profile', 'auth', 'profile', 'customer', 1, 1, NOW(), NOW()),
('auth.password', 'Change own password', 'auth', 'password', 'customer', 1, 1, NOW(), NOW()),
('auth.sessions', 'Manage own sessions', 'auth', 'sessions', 'customer', 1, 1, NOW(), NOW());

-- Customer Management Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('customers.create', 'Create new customer records', 'customers', 'create', 'employee', 1, 1, NOW(), NOW()),
('customers.read', 'View customer information', 'customers', 'read', 'employee', 1, 1, NOW(), NOW()),
('customers.update', 'Update customer information', 'customers', 'update', 'employee', 1, 1, NOW(), NOW()),
('customers.delete', 'Delete customer records', 'customers', 'delete', 'manager', 1, 1, NOW(), NOW()),
('customers.list', 'List and search customers', 'customers', 'list', 'employee', 1, 1, NOW(), NOW()),
('customers.export', 'Export customer data', 'customers', 'export', 'manager', 1, 1, NOW(), NOW()),
('customers.import', 'Import customer data', 'customers', 'import', 'manager', 1, 1, NOW(), NOW());

-- Employee Management Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('employees.create', 'Create new employee records', 'employees', 'create', 'manager', 1, 1, NOW(), NOW()),
('employees.read', 'View employee information', 'employees', 'read', 'manager', 1, 1, NOW(), NOW()),
('employees.update', 'Update employee information', 'employees', 'update', 'manager', 1, 1, NOW(), NOW()),
('employees.delete', 'Delete employee records', 'employees', 'delete', 'admin', 1, 1, NOW(), NOW()),
('employees.list', 'List and search employees', 'employees', 'list', 'manager', 1, 1, NOW(), NOW()),
('employees.attendance', 'Manage employee attendance', 'employees', 'attendance', 'manager', 1, 1, NOW(), NOW()),
('employees.performance', 'Manage employee performance', 'employees', 'performance', 'manager', 1, 1, NOW(), NOW());

-- Order Management Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('orders.create', 'Create new orders', 'orders', 'create', 'employee', 1, 1, NOW(), NOW()),
('orders.read', 'View order information', 'orders', 'read', 'employee', 1, 1, NOW(), NOW()),
('orders.update', 'Update order information', 'orders', 'update', 'employee', 1, 1, NOW(), NOW()),
('orders.delete', 'Delete orders', 'orders', 'delete', 'manager', 1, 1, NOW(), NOW()),
('orders.list', 'List and search orders', 'orders', 'list', 'employee', 1, 1, NOW(), NOW()),
('orders.fulfill', 'Fulfill and ship orders', 'orders', 'fulfill', 'employee', 1, 1, NOW(), NOW()),
('orders.cancel', 'Cancel orders', 'orders', 'cancel', 'manager', 1, 1, NOW(), NOW()),
('orders.refund', 'Process order refunds', 'orders', 'refund', 'manager', 1, 1, NOW(), NOW());

-- Product Management Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('products.create', 'Create new products', 'products', 'create', 'manager', 1, 1, NOW(), NOW()),
('products.read', 'View product information', 'products', 'read', 'employee', 1, 1, NOW(), NOW()),
('products.update', 'Update product information', 'products', 'update', 'manager', 1, 1, NOW(), NOW()),
('products.delete', 'Delete products', 'products', 'delete', 'admin', 1, 1, NOW(), NOW()),
('products.list', 'List and search products', 'products', 'list', 'employee', 1, 1, NOW(), NOW()),
('products.inventory', 'Manage product inventory', 'products', 'inventory', 'employee', 1, 1, NOW(), NOW()),
('products.pricing', 'Manage product pricing', 'products', 'pricing', 'manager', 1, 1, NOW(), NOW()),
('products.categories', 'Manage product categories', 'products', 'categories', 'manager', 1, 1, NOW(), NOW());

-- Reports and Analytics Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('reports.view', 'View system reports', 'reports', 'view', 'manager', 1, 1, NOW(), NOW()),
('reports.create', 'Create custom reports', 'reports', 'create', 'admin', 1, 1, NOW(), NOW()),
('reports.export', 'Export report data', 'reports', 'export', 'manager', 1, 1, NOW(), NOW()),
('analytics.view', 'View analytics dashboard', 'analytics', 'view', 'manager', 1, 1, NOW(), NOW()),
('analytics.advanced', 'Access advanced analytics', 'analytics', 'advanced', 'admin', 1, 1, NOW(), NOW());

-- Settings and Configuration Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('settings.view', 'View system settings', 'settings', 'view', 'manager', 1, 1, NOW(), NOW()),
('settings.update', 'Update system settings', 'settings', 'update', 'admin', 1, 1, NOW(), NOW()),
('settings.security', 'Manage security settings', 'settings', 'security', 'admin', 1, 1, NOW(), NOW()),
('settings.notifications', 'Manage notification settings', 'settings', 'notifications', 'manager', 1, 1, NOW(), NOW());

-- Audit and Logging Permissions
INSERT IGNORE INTO permissions (name, description, module, action, access_level, is_system_permission is_active, created_at, updated_at) VALUES
('audit.view', 'View audit logs', 'audit', 'view', 'admin', 1, 1, NOW(), NOW()),
('audit.export', 'Export audit data', 'audit', 'export', 'admin', 1, 1, NOW(), NOW()),
('logs.view', 'View system logs', 'logs', 'view', 'admin', 1, 1, NOW(), NOW()),
('logs.download', 'Download log files', 'logs', 'download', 'admin', 1, 1, NOW(), NOW());

-- Log the seeding operation
SELECT 'Default system permissions seeded successfully' as message;