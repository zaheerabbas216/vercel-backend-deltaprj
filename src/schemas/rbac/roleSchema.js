/**
 * File: src/schemas/rbac/roleSchema.js
 * Role Management Validation Schemas
 *
 * This file contains Yup validation schemas for role management operations.
 * It validates role creation, updates, assignments, and hierarchy operations.
 *
 * For beginners:
 * - Roles define different types of users (admin, manager, employee, etc.)
 * - These schemas ensure role data is valid before saving to database
 * - We validate role names, descriptions, hierarchy relationships, and settings
 * - This maintains data integrity in our role-based access control system
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
  sortOrderSchema
} = require('../common/baseSchema');

/**
 * Create role validation schema
 * For creating new roles in the system
 */
const createRoleSchema = yup.object().shape({
  // Role identification
  name: yup
    .string()
    .trim()
    .lowercase() // Convert to lowercase for consistency
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be less than 50 characters')
    .matches(/^[a-z][a-z0-9_]*[a-z0-9]$/, 'Role name must start with a letter and contain only lowercase letters, numbers, and underscores')
    .required('Role name is required')
    .test('not-reserved', 'This role name is reserved and cannot be used', (value) => {
      if (!value) return true;

      const reservedNames = [
        'root', 'system', 'anonymous', 'guest', 'public',
        'null', 'undefined', 'admin', 'administrator'
      ];

      return !reservedNames.includes(value.toLowerCase());
    })
    .label('Role Name'),

  // Human-readable display name
  displayName: yup
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_()]+$/, 'Display name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses')
    .required('Display name is required')
    .label('Display Name'),

  // Optional description
  description: textContentSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Description'),

  // Role hierarchy - parent role
  parentRoleId: optionalIdSchema
    .test('not-self-parent', 'Role cannot be its own parent', function (value) {
      const { id } = this.parent;
      return !value || !id || value !== id;
    })
    .label('Parent Role ID'),

  // Role settings
  isActive: booleanSchema
    .default(true)
    .label('Is Active'),

  isDefault: booleanSchema
    .default(false)
    .label('Is Default Role'),

  // Role capacity
  maxUsers: yup
    .number()
    .integer('Max users must be a whole number')
    .min(1, 'Max users must be at least 1')
    .max(10000, 'Max users cannot exceed 10,000')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Maximum Users'),

  // Visual settings
  colorCode: colorCodeSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Color Code'),

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

  // Priority for role ordering
  priority: yup
    .number()
    .integer('Priority must be a whole number')
    .min(-1000, 'Priority cannot be less than -1000')
    .max(1000, 'Priority cannot exceed 1000')
    .default(0)
    .label('Priority')
});

/**
 * Update role validation schema
 * For updating existing roles
 */
const updateRoleSchema = yup.object().shape({
  // Role ID to update
  id: idSchema
    .label('Role ID'),

  // All fields from create schema (but not required)
  name: yup
    .string()
    .trim()
    .lowercase()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be less than 50 characters')
    .matches(/^[a-z][a-z0-9_]*[a-z0-9]$/, 'Role name must start with a letter and contain only lowercase letters, numbers, and underscores')
    .test('not-reserved', 'This role name is reserved and cannot be used', (value) => {
      if (!value) return true;

      const reservedNames = [
        'root', 'system', 'anonymous', 'guest', 'public',
        'null', 'undefined', 'admin', 'administrator'
      ];

      return !reservedNames.includes(value.toLowerCase());
    })
    .label('Role Name'),

  displayName: yup
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_()]+$/, 'Display name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses')
    .label('Display Name'),

  description: textContentSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Description'),

  parentRoleId: optionalIdSchema
    .test('not-self-parent', 'Role cannot be its own parent', function (value) {
      const { id } = this.parent;
      return !value || !id || value !== id;
    })
    .test('no-circular-hierarchy', 'Cannot create circular role hierarchy', (value) => {
      // This would require database check in real implementation
      // For now, we just ensure it's not the same as current role
      return true; // Placeholder for circular dependency check
    })
    .label('Parent Role ID'),

  isActive: booleanSchema
    .label('Is Active'),

  isDefault: booleanSchema
    .label('Is Default Role'),

  maxUsers: yup
    .number()
    .integer('Max users must be a whole number')
    .min(1, 'Max users must be at least 1')
    .max(10000, 'Max users cannot exceed 10,000')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Maximum Users'),

  colorCode: colorCodeSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Color Code'),

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

  priority: yup
    .number()
    .integer('Priority must be a whole number')
    .min(-1000, 'Priority cannot be less than -1000')
    .max(1000, 'Priority cannot exceed 1000')
    .label('Priority')
});

/**
 * Role query/filter validation schema
 * For searching and filtering roles
 */
const roleQuerySchema = yup.object().shape({
  // Search parameters
  search: yup
    .string()
    .trim()
    .max(100, 'Search query must be less than 100 characters')
    .nullable()
    .label('Search Query'),

  // Filter parameters
  isActive: booleanSchema
    .nullable()
    .label('Is Active Filter'),

  isSystemRole: booleanSchema
    .nullable()
    .label('Is System Role Filter'),

  isDefault: booleanSchema
    .nullable()
    .label('Is Default Filter'),

  parentRoleId: optionalIdSchema
    .label('Parent Role ID Filter'),

  // Pagination
  page: pageSchema
    .label('Page Number'),

  pageSize: pageSizeSchema
    .label('Page Size'),

  // Sorting
  sortBy: yup
    .string()
    .oneOf(['name', 'displayName', 'priority', 'userCount', 'createdAt', 'updatedAt'], 'Invalid sort field')
    .default('name')
    .label('Sort By'),

  sortOrder: sortOrderSchema
    .label('Sort Order'),

  // Include related data
  includePermissions: booleanSchema
    .default(false)
    .label('Include Permissions'),

  includeUserCount: booleanSchema
    .default(true)
    .label('Include User Count'),

  includeParentRole: booleanSchema
    .default(false)
    .label('Include Parent Role')
});

/**
 * Role deletion validation schema
 * For safely deleting roles
 */
const deleteRoleSchema = yup.object().shape({
  // Role ID to delete
  id: idSchema
    .label('Role ID'),

  // Confirmation of role name
  confirmRoleName: yup
    .string()
    .trim()
    .required('Please confirm the role name to delete')
    .test('name-matches', 'Role name confirmation does not match', (value) => {
      // This would be validated against the actual role name from database
      return true; // Placeholder - would check against actual role name
    })
    .label('Confirm Role Name'),

  // Force delete option (bypasses user assignment checks)
  forceDelete: booleanSchema
    .default(false)
    .label('Force Delete'),

  // Replacement role for users currently assigned to this role
  replacementRoleId: yup
    .number()
    .integer('Replacement role ID must be a whole number')
    .positive('Replacement role ID must be positive')
    .nullable()
    .when('forceDelete', {
      is: false,
      then: (schema) => schema.required('Replacement role is required when not force deleting'),
      otherwise: (schema) => schema.nullable()
    })
    .label('Replacement Role ID'),

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
 * Role assignment validation schema
 * For assigning roles to users
 */
const roleAssignmentSchema = yup.object().shape({
  // User to assign role to
  userId: idSchema
    .label('User ID'),

  // Role to assign
  roleId: idSchema
    .label('Role ID'),

  // Assignment context
  context: yup
    .string()
    .oneOf(['promotion', 'demotion', 'transfer', 'project', 'temporary', 'correction'], 'Invalid assignment context')
    .nullable()
    .label('Assignment Context'),

  // Assignment reason
  reason: yup
    .string()
    .trim()
    .max(500, 'Assignment reason must be less than 500 characters')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Assignment Reason'),

  // Whether this is the primary role
  isPrimary: booleanSchema
    .default(false)
    .label('Is Primary Role'),

  // Assignment expiration
  expiresAt: yup
    .date()
    .min(new Date(), 'Expiration date must be in the future')
    .nullable()
    .label('Expires At'),

  // Conditions for role assignment (JSON)
  conditions: yup
    .object()
    .nullable()
    .label('Assignment Conditions'),

  // Admin performing the assignment
  assignedBy: idSchema
    .label('Assigned By')
});

/**
 * Role hierarchy validation schema
 * For managing role hierarchies
 */
const roleHierarchySchema = yup.object().shape({
  // Child role
  childRoleId: idSchema
    .label('Child Role ID'),

  // Parent role
  parentRoleId: idSchema
    .test('not-same-role', 'Parent role cannot be the same as child role', function (value) {
      const { childRoleId } = this.parent;
      return !value || !childRoleId || value !== childRoleId;
    })
    .label('Parent Role ID'),

  // Maximum hierarchy depth allowed
  maxDepth: yup
    .number()
    .integer('Max depth must be a whole number')
    .min(1, 'Max depth must be at least 1')
    .max(10, 'Max depth cannot exceed 10')
    .default(5)
    .label('Maximum Hierarchy Depth')
});

/**
 * Bulk role operations validation schema
 * For performing operations on multiple roles
 */
const bulkRoleOperationSchema = yup.object().shape({
  // Array of role IDs
  roleIds: yup
    .array()
    .of(idSchema)
    .min(1, 'At least one role ID is required')
    .max(50, 'Cannot perform bulk operations on more than 50 roles')
    .required('Role IDs are required')
    .test('unique-ids', 'Role IDs must be unique', (roleIds) => {
      if (!roleIds) return true;
      const uniqueIds = new Set(roleIds);
      return roleIds.length === uniqueIds.size;
    })
    .label('Role IDs'),

  // Operation to perform
  operation: yup
    .string()
    .oneOf(['activate', 'deactivate', 'delete', 'update_priority'], 'Invalid bulk operation')
    .required('Operation is required')
    .label('Operation'),

  // Operation-specific parameters
  parameters: yup
    .object()
    .when('operation', {
      is: 'update_priority',
      then: (schema) => schema.shape({
        priority: yup
          .number()
          .integer('Priority must be a whole number')
          .min(-1000, 'Priority cannot be less than -1000')
          .max(1000, 'Priority cannot exceed 1000')
          .required('Priority is required for priority update operation')
      }),
      otherwise: (schema) => schema.nullable()
    })
    .label('Operation Parameters'),

  // Admin performing the operation
  adminUserId: idSchema
    .label('Admin User ID'),

  // Reason for bulk operation
  reason: yup
    .string()
    .trim()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters')
    .required('Reason for bulk operation is required')
    .label('Operation Reason')
});

/**
 * Role validation helpers
 */
const roleValidationHelpers = {
  /**
     * Validate role name availability
     * This would check database for existing roles
     */
  isRoleNameAvailable: async (name, excludeId = null) => {
    // TODO: Implement database check
    const reservedNames = [
      'root', 'system', 'anonymous', 'guest', 'public',
      'null', 'undefined', 'admin', 'administrator'
    ];

    return !reservedNames.includes(name.toLowerCase());
  },

  /**
     * Check for circular hierarchy
     * This would traverse the hierarchy to detect cycles
     */
  checkCircularHierarchy: async (childId, parentId, maxDepth = 10) => {
    // TODO: Implement database hierarchy traversal
    // For now, just check if they're the same
    return childId !== parentId;
  },

  /**
     * Validate role capacity
     * Check if role can accept more users
     */
  validateRoleCapacity: async (roleId, additionalUsers = 1) => {
    // TODO: Implement database check
    return {
      canAccept: true,
      currentUsers: 0,
      maxUsers: null,
      availableSlots: null
    };
  },

  /**
     * Generate role name from display name
     */
  generateRoleName: (displayName) => {
    if (!displayName) return '';

    return displayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 50); // Limit length
  },

  /**
     * Validate role hierarchy depth
     */
  validateHierarchyDepth: async (roleId, maxDepth = 5) => {
    // TODO: Implement database hierarchy depth check
    return {
      isValid: true,
      currentDepth: 0,
      maxDepth
    };
  },

  /**
     * Get role permissions summary
     */
  getRolePermissionsSummary: async (roleId) => {
    // TODO: Implement database query for role permissions
    return {
      directPermissions: 0,
      inheritedPermissions: 0,
      totalPermissions: 0,
      modules: []
    };
  },

  /**
     * Validate role deletion safety
     */
  canSafelyDeleteRole: async (roleId) => {
    // TODO: Implement checks for role dependencies
    return {
      canDelete: true,
      blockers: [],
      warnings: [],
      affectedUsers: 0,
      childRoles: 0
    };
  },

  /**
     * Sanitize role input data
     */
  sanitizeRoleData: (data) => {
    const sanitized = { ...data };

    // Sanitize string fields
    if (sanitized.name) {
      sanitized.name = sanitized.name.trim().toLowerCase();
    }

    if (sanitized.displayName) {
      sanitized.displayName = sanitized.displayName.trim();
    }

    if (sanitized.description) {
      sanitized.description = sanitized.description.trim();
      // Remove potential HTML/script tags
      sanitized.description = sanitized.description
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '');
    }

    // Sanitize icon field
    if (sanitized.icon) {
      sanitized.icon = sanitized.icon.trim().toLowerCase();
    }

    return sanitized;
  }
};

/**
 * Role validation constants
 */
const roleValidationConstants = {
  // Reserved role names that cannot be used
  RESERVED_ROLE_NAMES: [
    'root', 'system', 'anonymous', 'guest', 'public',
    'null', 'undefined', 'admin', 'administrator',
    'super', 'superuser', 'sa', 'dba'
  ],

  // Default role priorities
  ROLE_PRIORITIES: {
    SUPER_ADMIN: 1000,
    ADMIN: 800,
    MANAGER: 600,
    EMPLOYEE: 400,
    USER: 200,
    GUEST: 0
  },

  // Role validation limits
  LIMITS: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    MIN_DISPLAY_NAME_LENGTH: 2,
    MAX_DISPLAY_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_USERS_PER_ROLE: 10000,
    MAX_HIERARCHY_DEPTH: 10,
    MAX_BULK_OPERATIONS: 50
  },

  // Default role colors
  DEFAULT_COLORS: {
    admin: '#F44336',      // Red
    manager: '#FF9800',    // Orange
    employee: '#4CAF50',   // Green
    user: '#2196F3',       // Blue
    guest: '#9E9E9E'       // Grey
  },

  // Default role icons
  DEFAULT_ICONS: {
    admin: 'admin-crown',
    manager: 'manager-tie',
    employee: 'employee-badge',
    user: 'user-circle',
    guest: 'guest-outline'
  }
};

/**
 * Custom validation rules for roles
 */
const customRoleValidations = {
  /**
     * Custom validation for role name uniqueness
     */
  uniqueRoleName: yup.addMethod(yup.string, 'uniqueRoleName', function (excludeId = null) {
    return this.test('unique-role-name', 'Role name already exists', async (value) => {
      if (!value) return true;

      // This would integrate with database check
      const isAvailable = await roleValidationHelpers.isRoleNameAvailable(value, excludeId);
      return isAvailable;
    });
  }),

  /**
     * Custom validation for hierarchy cycles
     */
  noCyclicHierarchy: yup.addMethod(yup.number, 'noCyclicHierarchy', function () {
    return this.test('no-cyclic-hierarchy', 'Cannot create circular role hierarchy', async function (parentId) {
      if (!parentId) return true;

      const { id: childId } = this.parent;
      if (!childId) return true;

      const isValid = await roleValidationHelpers.checkCircularHierarchy(childId, parentId);
      return isValid;
    });
  }),

  /**
     * Custom validation for role capacity
     */
  withinCapacity: yup.addMethod(yup.number, 'withinCapacity', function (additionalUsers = 1) {
    return this.test('within-capacity', 'Role has reached maximum user capacity', async (roleId) => {
      if (!roleId) return true;

      const capacityCheck = await roleValidationHelpers.validateRoleCapacity(roleId, additionalUsers);
      return capacityCheck.canAccept;
    });
  })
};

module.exports = {
  // Main role schemas
  createRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,

  // Query and filtering schemas
  roleQuerySchema,

  // Role assignment schemas
  roleAssignmentSchema,
  roleHierarchySchema,

  // Bulk operation schemas
  bulkRoleOperationSchema,

  // Helper functions and utilities
  roleValidationHelpers,
  roleValidationConstants,
  customRoleValidations
};
