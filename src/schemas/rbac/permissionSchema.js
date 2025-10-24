/**
 * File: src/schemas/rbac/permissionSchema.js
 * Permission Management Validation Schemas
 *
 * This file contains Yup validation schemas for permission management operations.
 * It validates permission creation, updates, assignments, and dependency management.
 *
 * For beginners:
 * - Permissions are specific actions users can perform (like create_user, edit_post, view_reports)
 * - These schemas ensure permission data is valid before saving to database
 * - We validate permission names, modules, actions, and access levels
 * - This maintains data integrity in our permission system
 */

const yup = require('yup');
const {
  idSchema,
  optionalIdSchema,
  booleanSchema,
  colorCodeSchema,
  textContentSchema,
  pageSchema,
  pageSizeSchema,
  sortOrderSchema,
  jsonSchema
} = require('../common/baseSchema');

/**
 * Create permission validation schema
 * For creating new permissions in the system
 */
const createPermissionSchema = yup.object().shape({
  // Permission identification - follows module.action format
  name: yup
    .string()
    .trim()
    .lowercase()
    .min(3, 'Permission name must be at least 3 characters')
    .max(100, 'Permission name must be less than 100 characters')
    .matches(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, 'Permission name must follow format: module.action (e.g., users.create, posts.edit)')
    .required('Permission name is required')
    .test('valid-structure', 'Permission name must have valid module and action parts', (value) => {
      if (!value) return true;

      const parts = value.split('.');
      if (parts.length !== 2) return false;

      const [module, action] = parts;

      // Validate module part
      if (!module || module.length < 2 || !/^[a-z][a-z0-9_]*$/.test(module)) {
        return false;
      }

      // Validate action part
      if (!action || action.length < 2 || !/^[a-z][a-z0-9_]*$/.test(action)) {
        return false;
      }

      return true;
    })
    .label('Permission Name'),

  // Human-readable display name
  displayName: yup
    .string()
    .trim()
    .min(3, 'Display name must be at least 3 characters')
    .max(150, 'Display name must be less than 150 characters')
    .required('Display name is required')
    .label('Display Name'),

  // Detailed description
  description: textContentSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Description'),

  // Module categorization (extracted from name)
  module: yup
    .string()
    .trim()
    .lowercase()
    .min(2, 'Module must be at least 2 characters')
    .max(50, 'Module must be less than 50 characters')
    .matches(/^[a-z][a-z0-9_]*$/, 'Module must start with a letter and contain only lowercase letters, numbers, and underscores')
    .required('Module is required')
    .test('matches-name', 'Module must match the module part of the permission name', function (value) {
      const { name } = this.parent;
      if (!name || !value) return true;

      const nameModule = name.split('.')[0];
      return value === nameModule;
    })
    .label('Module'),

  // Action type (extracted from name)
  action: yup
    .string()
    .trim()
    .lowercase()
    .min(2, 'Action must be at least 2 characters')
    .max(50, 'Action must be less than 50 characters')
    .matches(/^[a-z][a-z0-9_]*$/, 'Action must start with a letter and contain only lowercase letters, numbers, and underscores')
    .required('Action is required')
    .test('matches-name', 'Action must match the action part of the permission name', function (value) {
      const { name } = this.parent;
      if (!name || !value) return true;

      const nameAction = name.split('.')[1];
      return value === nameAction;
    })
    .label('Action'),

  // Optional specific resource
  resource: yup
    .string()
    .trim()
    .max(50, 'Resource must be less than 50 characters')
    .matches(/^[a-z][a-z0-9_]*$/, 'Resource must contain only lowercase letters, numbers, and underscores')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Resource'),

  // Permission settings
  isActive: booleanSchema
    .default(true)
    .label('Is Active'),

  // Permission grouping
  groupName: yup
    .string()
    .trim()
    .max(50, 'Group name must be less than 50 characters')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Group Name'),

  sortOrder: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order cannot be negative')
    .max(9999, 'Sort order cannot exceed 9999')
    .default(0)
    .label('Sort Order'),

  // Visual settings
  icon: yup
    .string()
    .trim()
    .max(50, 'Icon must be less than 50 characters')
    .matches(/^[a-z0-9\-_]+$/, 'Icon must contain only lowercase letters, numbers, hyphens, and underscores')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Icon'),

  colorCode: colorCodeSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Color Code'),

  // Access level and scope
  accessLevel: yup
    .string()
    .oneOf(['basic', 'intermediate', 'advanced', 'admin'], 'Invalid access level')
    .default('basic')
    .label('Access Level'),

  scope: yup
    .string()
    .oneOf(['own', 'team', 'organization', 'global'], 'Invalid scope')
    .default('own')
    .label('Scope'),

  // Permission dependencies (JSON array of permission IDs)
  requiresPermissions: yup
    .array()
    .of(idSchema)
    .nullable()
    .max(10, 'Cannot require more than 10 permissions')
    .test('no-self-dependency', 'Permission cannot depend on itself', (value) => {
      if (!value || !Array.isArray(value)) return true;

      // This would check against the permission's own ID in update scenarios
      return true; // Placeholder for self-dependency check
    })
    .test('valid-dependencies', 'All required permissions must be valid', async (value) => {
      if (!value || !Array.isArray(value)) return true;

      // TODO: Implement database check for permission existence
      return true; // Placeholder for dependency validation
    })
    .label('Required Permissions')
});

/**
 * Update permission validation schema
 * For updating existing permissions
 */
const updatePermissionSchema = yup.object().shape({
  // Permission ID to update
  id: idSchema
    .label('Permission ID'),

  // Note: Permission name typically shouldn't be updated after creation
  // as it may break existing code dependencies

  // Human-readable display name
  displayName: yup
    .string()
    .trim()
    .min(3, 'Display name must be at least 3 characters')
    .max(150, 'Display name must be less than 150 characters')
    .label('Display Name'),

  // Description can be updated
  description: textContentSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Description'),

  // Settings that can be updated
  isActive: booleanSchema
    .label('Is Active'),

  groupName: yup
    .string()
    .trim()
    .max(50, 'Group name must be less than 50 characters')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Group Name'),

  sortOrder: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order cannot be negative')
    .max(9999, 'Sort order cannot exceed 9999')
    .label('Sort Order'),

  // Visual settings
  icon: yup
    .string()
    .trim()
    .max(50, 'Icon must be less than 50 characters')
    .matches(/^[a-z0-9\-_]+$/, 'Icon must contain only lowercase letters, numbers, hyphens, and underscores')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Icon'),

  colorCode: colorCodeSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Color Code'),

  // Access level and scope can be updated carefully
  accessLevel: yup
    .string()
    .oneOf(['basic', 'intermediate', 'advanced', 'admin'], 'Invalid access level')
    .label('Access Level'),

  scope: yup
    .string()
    .oneOf(['own', 'team', 'organization', 'global'], 'Invalid scope')
    .label('Scope'),

  // Dependencies can be updated
  requiresPermissions: yup
    .array()
    .of(idSchema)
    .nullable()
    .max(10, 'Cannot require more than 10 permissions')
    .test('no-self-dependency', 'Permission cannot depend on itself', function (value) {
      if (!value || !Array.isArray(value)) return true;

      const { id } = this.parent;
      return !value.includes(id);
    })
    .label('Required Permissions')
});

/**
 * Permission query/filter validation schema
 * For searching and filtering permissions
 */
const permissionQuerySchema = yup.object().shape({
  // Search parameters
  search: yup
    .string()
    .trim()
    .max(100, 'Search query must be less than 100 characters')
    .nullable()
    .label('Search Query'),

  // Filter parameters
  module: yup
    .string()
    .trim()
    .max(50, 'Module filter must be less than 50 characters')
    .nullable()
    .label('Module Filter'),

  action: yup
    .string()
    .trim()
    .max(50, 'Action filter must be less than 50 characters')
    .nullable()
    .label('Action Filter'),

  accessLevel: yup
    .string()
    .oneOf(['basic', 'intermediate', 'advanced', 'admin'], 'Invalid access level filter')
    .nullable()
    .label('Access Level Filter'),

  scope: yup
    .string()
    .oneOf(['own', 'team', 'organization', 'global'], 'Invalid scope filter')
    .nullable()
    .label('Scope Filter'),

  groupName: yup
    .string()
    .trim()
    .max(50, 'Group name filter must be less than 50 characters')
    .nullable()
    .label('Group Name Filter'),

  isActive: booleanSchema
    .nullable()
    .label('Is Active Filter'),

  isSystemPermission: booleanSchema
    .nullable()
    .label('Is System Permission Filter'),

  // Pagination
  page: pageSchema
    .label('Page Number'),

  pageSize: pageSizeSchema
    .label('Page Size'),

  // Sorting
  sortBy: yup
    .string()
    .oneOf(['name', 'displayName', 'module', 'action', 'accessLevel', 'usageCount', 'createdAt'], 'Invalid sort field')
    .default('name')
    .label('Sort By'),

  sortOrder: sortOrderSchema
    .label('Sort Order'),

  // Include related data
  includeUsageCount: booleanSchema
    .default(true)
    .label('Include Usage Count'),

  includeDependencies: booleanSchema
    .default(false)
    .label('Include Dependencies'),

  groupBy: yup
    .string()
    .oneOf(['module', 'group', 'access_level', 'scope'], 'Invalid group by field')
    .nullable()
    .label('Group By')
});

/**
 * Permission deletion validation schema
 * For safely deleting permissions
 */
const deletePermissionSchema = yup.object().shape({
  // Permission ID to delete
  id: idSchema
    .label('Permission ID'),

  // Confirmation of permission name
  confirmPermissionName: yup
    .string()
    .trim()
    .required('Please confirm the permission name to delete')
    .test('name-matches', 'Permission name confirmation does not match', (value) => {
      // This would be validated against the actual permission name from database
      return true; // Placeholder - would check against actual permission name
    })
    .label('Confirm Permission Name'),

  // Force delete option (bypasses usage checks)
  forceDelete: booleanSchema
    .default(false)
    .label('Force Delete'),

  // Admin performing the deletion
  adminUserId: idSchema
    .label('Admin User ID'),

  // Reason for deletion
  reason: yup
    .string()
    .trim()
    .min(10, 'Deletion reason must be at least 10 characters')
    .max(500, 'Deletion reason must be less than 500 characters')
    .required('Reason for deletion is required')
    .label('Deletion Reason')
});

/**
 * Bulk permission creation schema
 * For creating multiple permissions at once (e.g., for a new module)
 */
const bulkPermissionCreationSchema = yup.object().shape({
  // Module information
  moduleName: yup
    .string()
    .trim()
    .lowercase()
    .min(2, 'Module name must be at least 2 characters')
    .max(50, 'Module name must be less than 50 characters')
    .matches(/^[a-z][a-z0-9_]*$/, 'Module name must start with a letter and contain only lowercase letters, numbers, and underscores')
    .required('Module name is required')
    .label('Module Name'),

  moduleDisplayName: yup
    .string()
    .trim()
    .min(2, 'Module display name must be at least 2 characters')
    .max(100, 'Module display name must be less than 100 characters')
    .required('Module display name is required')
    .label('Module Display Name'),

  // Standard CRUD actions to create
  includeActions: yup
    .object()
    .shape({
      create: booleanSchema.default(true),
      read: booleanSchema.default(true),
      update: booleanSchema.default(true),
      delete: booleanSchema.default(true),
      manage: booleanSchema.default(true)
    })
    .default({})
    .label('Include Actions'),

  // Custom actions
  customActions: yup
    .array()
    .of(
      yup.object().shape({
        action: yup
          .string()
          .trim()
          .lowercase()
          .matches(/^[a-z][a-z0-9_]*$/, 'Action must start with a letter and contain only lowercase letters, numbers, and underscores')
          .required('Action is required'),

        displayName: yup
          .string()
          .trim()
          .required('Display name is required'),

        description: yup
          .string()
          .trim()
          .nullable(),

        accessLevel: yup
          .string()
          .oneOf(['basic', 'intermediate', 'advanced', 'admin'])
          .default('basic'),

        scope: yup
          .string()
          .oneOf(['own', 'team', 'organization', 'global'])
          .default('own')
      })
    )
    .nullable()
    .label('Custom Actions'),

  // Default settings for all permissions
  defaultAccessLevel: yup
    .string()
    .oneOf(['basic', 'intermediate', 'advanced', 'admin'], 'Invalid default access level')
    .default('basic')
    .label('Default Access Level'),

  defaultScope: yup
    .string()
    .oneOf(['own', 'team', 'organization', 'global'], 'Invalid default scope')
    .default('own')
    .label('Default Scope'),

  groupName: yup
    .string()
    .trim()
    .max(50, 'Group name must be less than 50 characters')
    .nullable()
    .label('Group Name'),

  // Creator information
  createdBy: idSchema
    .label('Created By')
});

/**
 * Permission dependency validation schema
 * For managing permission dependencies
 */
const permissionDependencySchema = yup.object().shape({
  // Parent permission
  permissionId: idSchema
    .label('Permission ID'),

  // Required permissions
  requiredPermissionIds: yup
    .array()
    .of(idSchema)
    .min(1, 'At least one required permission must be specified')
    .max(10, 'Cannot specify more than 10 required permissions')
    .required('Required permission IDs are required')
    .test('no-self-dependency', 'Permission cannot depend on itself', function (value) {
      const { permissionId } = this.parent;
      return !value || !value.includes(permissionId);
    })
    .test('unique-dependencies', 'Required permissions must be unique', (value) => {
      if (!value) return true;
      const uniqueIds = new Set(value);
      return value.length === uniqueIds.size;
    })
    .label('Required Permission IDs'),

  // Operation type
  operation: yup
    .string()
    .oneOf(['add', 'remove', 'replace'], 'Invalid dependency operation')
    .default('add')
    .label('Operation')
});

/**
 * Permission validation helpers
 */
const permissionValidationHelpers = {
  /**
     * Validate permission name availability
     */
  isPermissionNameAvailable: async (name, excludeId = null) => {
    // TODO: Implement database check
    return true; // Placeholder
  },

  /**
     * Parse permission name into module and action
     */
  parsePermissionName: (name) => {
    if (!name || typeof name !== 'string') return null;

    const parts = name.split('.');
    if (parts.length !== 2) return null;

    return {
      module: parts[0],
      action: parts[1]
    };
  },

  /**
     * Generate permission display name from name
     */
  generateDisplayName: (name, moduleDisplayName = null) => {
    const parsed = this.parsePermissionName(name);
    if (!parsed) return '';

    const { module, action } = parsed;

    // Capitalize and humanize action
    const humanAction = action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    // Use provided module display name or humanize module
    const humanModule = moduleDisplayName || module
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    return `${humanAction} ${humanModule}`;
  },

  /**
     * Generate standard CRUD permissions for a module
     */
  generateCrudPermissions: (moduleName, moduleDisplayName, options = {}) => {
    const {
      includeCreate = true,
      includeRead = true,
      includeUpdate = true,
      includeDelete = true,
      includeManage = true,
      accessLevel = 'basic',
      scope = 'own',
      groupName = null
    } = options;

    const permissions = [];
    const group = groupName || `${moduleDisplayName} Management`;

    if (includeCreate) {
      permissions.push({
        name: `${moduleName}.create`,
        displayName: `Create ${moduleDisplayName}`,
        description: `Create new ${moduleName.toLowerCase()} records`,
        module: moduleName,
        action: 'create',
        accessLevel,
        scope,
        groupName: group,
        sortOrder: 1
      });
    }

    if (includeRead) {
      permissions.push({
        name: `${moduleName}.read`,
        displayName: `View ${moduleDisplayName}`,
        description: `View ${moduleName.toLowerCase()} records`,
        module: moduleName,
        action: 'read',
        accessLevel,
        scope,
        groupName: group,
        sortOrder: 2
      });
    }

    if (includeUpdate) {
      permissions.push({
        name: `${moduleName}.update`,
        displayName: `Edit ${moduleDisplayName}`,
        description: `Edit existing ${moduleName.toLowerCase()} records`,
        module: moduleName,
        action: 'update',
        accessLevel,
        scope,
        groupName: group,
        sortOrder: 3
      });
    }

    if (includeDelete) {
      permissions.push({
        name: `${moduleName}.delete`,
        displayName: `Delete ${moduleDisplayName}`,
        description: `Delete ${moduleName.toLowerCase()} records`,
        module: moduleName,
        action: 'delete',
        accessLevel: 'intermediate',
        scope,
        groupName: group,
        sortOrder: 4
      });
    }

    if (includeManage) {
      permissions.push({
        name: `${moduleName}.manage`,
        displayName: `Manage All ${moduleDisplayName}`,
        description: `Full management access to all ${moduleName.toLowerCase()} records`,
        module: moduleName,
        action: 'manage',
        accessLevel: 'admin',
        scope: 'global',
        groupName: group,
        sortOrder: 5
      });
    }

    return permissions;
  },

  /**
     * Validate permission dependencies (no circular references)
     */
  validateDependencies: async (permissionId, requiredPermissionIds) => {
    // TODO: Implement circular dependency check
    return {
      isValid: true,
      circularDependencies: [],
      invalidPermissions: []
    };
  },

  /**
     * Get permission usage statistics
     */
  getPermissionUsage: async (permissionId) => {
    // TODO: Implement database query for permission usage
    return {
      roleCount: 0,
      userCount: 0,
      lastUsed: null
    };
  },

  /**
     * Sanitize permission input data
     */
  sanitizePermissionData: (data) => {
    const sanitized = { ...data };

    // Parse name into module and action if needed
    if (sanitized.name) {
      const parsed = this.parsePermissionName(sanitized.name);
      if (parsed) {
        sanitized.module = parsed.module;
        sanitized.action = parsed.action;
      }
    }

    // Sanitize string fields
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].trim();

        // Remove potential HTML/script tags from description
        if (key === 'description' && sanitized[key]) {
          sanitized[key] = sanitized[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '');
        }
      }
    });

    return sanitized;
  }
};

/**
 * Permission validation constants
 */
const permissionValidationConstants = {
  // Standard action types
  STANDARD_ACTIONS: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    MANAGE: 'manage',
    EXPORT: 'export',
    IMPORT: 'import',
    APPROVE: 'approve',
    REJECT: 'reject',
    PUBLISH: 'publish'
  },

  // Access levels with descriptions
  ACCESS_LEVELS: {
    BASIC: {
      value: 'basic',
      label: 'Basic',
      description: 'Basic operations with limited scope'
    },
    INTERMEDIATE: {
      value: 'intermediate',
      label: 'Intermediate',
      description: 'More complex operations requiring experience'
    },
    ADVANCED: {
      value: 'advanced',
      label: 'Advanced',
      description: 'Advanced operations with potential system impact'
    },
    ADMIN: {
      value: 'admin',
      label: 'Administrator',
      description: 'Administrative operations with full system access'
    }
  },

  // Permission scopes with descriptions
  SCOPES: {
    OWN: {
      value: 'own',
      label: 'Own Records',
      description: 'Access only to own records and data'
    },
    TEAM: {
      value: 'team',
      label: 'Team Records',
      description: 'Access to team or department records'
    },
    ORGANIZATION: {
      value: 'organization',
      label: 'Organization',
      description: 'Access to all organizational records'
    },
    GLOBAL: {
      value: 'global',
      label: 'Global',
      description: 'Unrestricted access to all records'
    }
  },

  // Common modules in business applications
  COMMON_MODULES: {
    USERS: 'users',
    ROLES: 'roles',
    PERMISSIONS: 'permissions',
    CUSTOMERS: 'customers',
    EMPLOYEES: 'employees',
    ORDERS: 'orders',
    PRODUCTS: 'products',
    INVENTORY: 'inventory',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    AUDIT: 'audit',
    NOTIFICATIONS: 'notifications'
  },

  // Validation limits
  LIMITS: {
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 100,
    MIN_DISPLAY_NAME_LENGTH: 3,
    MAX_DISPLAY_NAME_LENGTH: 150,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_DEPENDENCIES: 10,
    MAX_BULK_OPERATIONS: 100,
    MAX_CUSTOM_ACTIONS: 20
  },

  // Permission naming patterns
  NAMING_PATTERNS: {
    MODULE_REGEX: /^[a-z][a-z0-9_]*$/,
    ACTION_REGEX: /^[a-z][a-z0-9_]*$/,
    FULL_NAME_REGEX: /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/
  },

  // Default permission groups
  DEFAULT_GROUPS: {
    USER_MANAGEMENT: 'User Management',
    CONTENT_MANAGEMENT: 'Content Management',
    SYSTEM_ADMINISTRATION: 'System Administration',
    REPORTING: 'Reporting & Analytics',
    SECURITY: 'Security & Compliance'
  }
};

/**
 * Permission templates for common business scenarios
 */
const permissionTemplates = {
  /**
     * Generate basic CRUD permission set
     */
  basicCrud: (moduleName, moduleDisplayName) => {
    return permissionValidationHelpers.generateCrudPermissions(
      moduleName,
      moduleDisplayName,
      {
        includeManage: false,
        accessLevel: 'basic',
        scope: 'own'
      }
    );
  },

  /**
     * Generate admin permission set with full access
     */
  adminCrud: (moduleName, moduleDisplayName) => {
    return permissionValidationHelpers.generateCrudPermissions(
      moduleName,
      moduleDisplayName,
      {
        includeManage: true,
        accessLevel: 'admin',
        scope: 'global'
      }
    );
  },

  /**
     * Generate manager permission set
     */
  managerCrud: (moduleName, moduleDisplayName) => {
    return permissionValidationHelpers.generateCrudPermissions(
      moduleName,
      moduleDisplayName,
      {
        includeManage: true,
        accessLevel: 'intermediate',
        scope: 'team'
      }
    );
  },

  /**
     * Generate read-only permissions
     */
  readOnly: (moduleName, moduleDisplayName) => {
    return permissionValidationHelpers.generateCrudPermissions(
      moduleName,
      moduleDisplayName,
      {
        includeCreate: false,
        includeUpdate: false,
        includeDelete: false,
        includeManage: false,
        accessLevel: 'basic',
        scope: 'own'
      }
    );
  },

  /**
     * Generate audit/reporting permissions
     */
  auditReporting: (moduleName, moduleDisplayName) => {
    return [
      {
        name: `${moduleName}.view_audit`,
        displayName: `View ${moduleDisplayName} Audit Log`,
        description: `View audit log for ${moduleName.toLowerCase()}`,
        module: moduleName,
        action: 'view_audit',
        accessLevel: 'intermediate',
        scope: 'team',
        groupName: 'Audit & Compliance'
      },
      {
        name: `${moduleName}.export_reports`,
        displayName: `Export ${moduleDisplayName} Reports`,
        description: `Export reports for ${moduleName.toLowerCase()}`,
        module: moduleName,
        action: 'export_reports',
        accessLevel: 'intermediate',
        scope: 'own',
        groupName: 'Reporting'
      }
    ];
  }
};

module.exports = {
  // Main permission schemas
  createPermissionSchema,
  updatePermissionSchema,
  deletePermissionSchema,

  // Query and filtering schemas
  permissionQuerySchema,

  // Bulk operation schemas
  bulkPermissionCreationSchema,
  permissionDependencySchema,

  // Helper functions and utilities
  permissionValidationHelpers,
  permissionValidationConstants,
  permissionTemplates
};
