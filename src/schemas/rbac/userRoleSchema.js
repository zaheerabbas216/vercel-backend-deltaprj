/**
 * File: src/schemas/rbac/userRoleSchema.js
 * User-Role Assignment Validation Schemas
 *
 * This file contains Yup validation schemas for user-role assignment operations.
 * It validates role assignments, revocations, and user permission management.
 *
 * For beginners:
 * - This handles the connection between users and their roles
 * - When we assign roles to users, these schemas ensure the data is valid
 * - We validate assignment reasons, expiration dates, and context information
 * - This maintains data integrity in our user-role relationship system
 */

const yup = require('yup');
const {
  idSchema,
  optionalIdSchema,
  booleanSchema,
  textContentSchema,
  futureDateSchema,
  pageSchema,
  pageSizeSchema,
  sortOrderSchema
} = require('../common/baseSchema');

/**
 * Assign role to user validation schema
 * For assigning roles to users with full context
 */
const assignRoleSchema = yup.object().shape({
  // Target user
  userId: idSchema
    .label('User ID'),

  // Role to assign
  roleId: idSchema
    .label('Role ID'),

  // Assignment context and reasoning
  context: yup
    .string()
    .oneOf([
      'promotion', 'demotion', 'transfer', 'project_assignment',
      'temporary_duty', 'correction', 'onboarding', 'role_change',
      'department_transfer', 'skill_development'
    ], 'Invalid assignment context')
    .nullable()
    .label('Assignment Context'),

  assignmentReason: textContentSchema
    .max(500, 'Assignment reason must be less than 500 characters')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Assignment Reason'),

  // Role assignment settings
  isPrimary: booleanSchema
    .default(false)
    .label('Is Primary Role'),

  // Assignment duration
  expiresAt: futureDateSchema
    .nullable()
    .label('Assignment Expires At'),

  // Assignment conditions (JSON object)
  conditions: yup
    .object()
    .nullable()
    .test('valid-conditions', 'Assignment conditions must be a valid object', function (value) {
      if (!value) return true;

      // Basic validation for common condition fields
      const allowedFields = [
        'department_restriction', 'project_access', 'time_restriction',
        'ip_restriction', 'feature_flags', 'data_access_level'
      ];

      const conditionKeys = Object.keys(value);
      const invalidKeys = conditionKeys.filter(key => !allowedFields.includes(key));

      if (invalidKeys.length > 0) {
        return this.createError({
          message: `Invalid condition fields: ${invalidKeys.join(', ')}`
        });
      }

      return true;
    })
    .label('Assignment Conditions'),

  // Administrative information
  assignedBy: idSchema
    .label('Assigned By'),

  // Notification settings
  notifyUser: booleanSchema
    .default(true)
    .label('Notify User'),

  notificationMessage: yup
    .string()
    .trim()
    .max(200, 'Notification message must be less than 200 characters')
    .nullable()
    .when('notifyUser', {
      is: true,
      then: (schema) => schema.nullable(),
      otherwise: (schema) => schema.nullable()
    })
    .label('Notification Message')
});

/**
 * Revoke role from user validation schema
 * For removing role assignments with proper tracking
 */
const revokeRoleSchema = yup.object().shape({
  // Target user and role
  userId: idSchema
    .label('User ID'),

  roleId: idSchema
    .label('Role ID'),

  // Revocation details
  revocationReason: yup
    .string()
    .oneOf([
      'role_change', 'termination', 'transfer', 'demotion',
      'project_completion', 'temporary_assignment_ended',
      'security_violation', 'policy_change', 'user_request',
      'administrative_action'
    ], 'Invalid revocation reason')
    .required('Revocation reason is required')
    .label('Revocation Reason'),

  revocationNote: textContentSchema
    .max(500, 'Revocation note must be less than 500 characters')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Revocation Note'),

  // Administrative information
  revokedBy: idSchema
    .label('Revoked By'),

  // Effective date (can be immediate or scheduled)
  effectiveDate: yup
    .date()
    .min(new Date(), 'Effective date cannot be in the past')
    .nullable()
    .default(() => new Date())
    .label('Effective Date'),

  // Notification settings
  notifyUser: booleanSchema
    .default(true)
    .label('Notify User'),

  notificationMessage: yup
    .string()
    .trim()
    .max(200, 'Notification message must be less than 200 characters')
    .nullable()
    .label('Notification Message')
});

/**
 * Update role assignment validation schema
 * For modifying existing role assignments
 */
const updateRoleAssignmentSchema = yup.object().shape({
  // Assignment ID to update
  assignmentId: idSchema
    .label('Assignment ID'),

  // Fields that can be updated
  isPrimary: booleanSchema
    .label('Is Primary Role'),

  expiresAt: yup
    .date()
    .min(new Date(), 'Expiration date must be in the future')
    .nullable()
    .label('Assignment Expires At'),

  conditions: yup
    .object()
    .nullable()
    .label('Assignment Conditions'),

  context: yup
    .string()
    .oneOf([
      'promotion', 'demotion', 'transfer', 'project_assignment',
      'temporary_duty', 'correction', 'onboarding', 'role_change',
      'department_transfer', 'skill_development'
    ], 'Invalid assignment context')
    .nullable()
    .label('Assignment Context'),

  assignmentReason: textContentSchema
    .max(500, 'Assignment reason must be less than 500 characters')
    .nullable()
    .label('Assignment Reason'),

  // Administrative information
  updatedBy: idSchema
    .label('Updated By'),

  updateReason: yup
    .string()
    .trim()
    .min(5, 'Update reason must be at least 5 characters')
    .max(200, 'Update reason must be less than 200 characters')
    .required('Update reason is required')
    .label('Update Reason')
});

/**
 * Bulk role assignment validation schema
 * For assigning roles to multiple users at once
 */
const bulkRoleAssignmentSchema = yup.object().shape({
  // Users to assign roles to
  userIds: yup
    .array()
    .of(idSchema)
    .min(1, 'At least one user ID is required')
    .max(100, 'Cannot assign roles to more than 100 users at once')
    .required('User IDs are required')
    .test('unique-users', 'User IDs must be unique', (userIds) => {
      if (!userIds) return true;
      const uniqueIds = new Set(userIds);
      return userIds.length === uniqueIds.size;
    })
    .label('User IDs'),

  // Role to assign to all users
  roleId: idSchema
    .label('Role ID'),

  // Bulk assignment settings
  context: yup
    .string()
    .oneOf([
      'bulk_onboarding', 'department_assignment', 'project_team',
      'policy_update', 'organizational_change', 'system_migration'
    ], 'Invalid bulk assignment context')
    .required('Bulk assignment context is required')
    .label('Assignment Context'),

  assignmentReason: yup
    .string()
    .trim()
    .min(10, 'Assignment reason must be at least 10 characters')
    .max(1000, 'Assignment reason must be less than 1000 characters')
    .required('Assignment reason is required')
    .label('Assignment Reason'),

  // Common settings for all assignments
  isPrimary: booleanSchema
    .default(false)
    .label('Is Primary Role'),

  expiresAt: futureDateSchema
    .nullable()
    .label('Assignment Expires At'),

  conditions: yup
    .object()
    .nullable()
    .label('Assignment Conditions'),

  // Administrative information
  assignedBy: idSchema
    .label('Assigned By'),

  // Notification settings
  notifyUsers: booleanSchema
    .default(true)
    .label('Notify Users'),

  notificationTemplate: yup
    .string()
    .oneOf(['role_assigned', 'bulk_assignment', 'project_assignment'], 'Invalid notification template')
    .nullable()
    .when('notifyUsers', {
      is: true,
      then: (schema) => schema.default('bulk_assignment'),
      otherwise: (schema) => schema.nullable()
    })
    .label('Notification Template')
});

/**
 * User role query validation schema
 * For searching and filtering user-role assignments
 */
const userRoleQuerySchema = yup.object().shape({
  // User filtering
  userId: optionalIdSchema
    .label('User ID Filter'),

  userEmail: yup
    .string()
    .email('Invalid email format')
    .nullable()
    .label('User Email Filter'),

  // Role filtering
  roleId: optionalIdSchema
    .label('Role ID Filter'),

  roleName: yup
    .string()
    .trim()
    .max(50, 'Role name filter must be less than 50 characters')
    .nullable()
    .label('Role Name Filter'),

  // Assignment status filtering
  isActive: booleanSchema
    .nullable()
    .label('Is Active Filter'),

  isPrimary: booleanSchema
    .nullable()
    .label('Is Primary Filter'),

  // Context filtering
  context: yup
    .string()
    .oneOf([
      'promotion', 'demotion', 'transfer', 'project_assignment',
      'temporary_duty', 'correction', 'onboarding', 'role_change'
    ], 'Invalid context filter')
    .nullable()
    .label('Context Filter'),

  // Date range filtering
  assignedAfter: yup
    .date()
    .nullable()
    .label('Assigned After'),

  assignedBefore: yup
    .date()
    .nullable()
    .test('date-range', 'Assigned before date must be after assigned after date', function (value) {
      const { assignedAfter } = this.parent;
      if (!value || !assignedAfter) return true;
      return value > assignedAfter;
    })
    .label('Assigned Before'),

  // Expiration filtering
  expiresAfter: yup
    .date()
    .nullable()
    .label('Expires After'),

  expiresBefore: yup
    .date()
    .nullable()
    .label('Expires Before'),

  includeExpired: booleanSchema
    .default(false)
    .label('Include Expired Assignments'),

  // Pagination
  page: pageSchema
    .label('Page Number'),

  pageSize: pageSizeSchema
    .label('Page Size'),

  // Sorting
  sortBy: yup
    .string()
    .oneOf([
      'user_name', 'user_email', 'role_name', 'assigned_at',
      'expires_at', 'is_primary', 'context'
    ], 'Invalid sort field')
    .default('assigned_at')
    .label('Sort By'),

  sortOrder: sortOrderSchema
    .label('Sort Order'),

  // Include related data
  includeUserDetails: booleanSchema
    .default(true)
    .label('Include User Details'),

  includeRoleDetails: booleanSchema
    .default(true)
    .label('Include Role Details'),

  includePermissionCount: booleanSchema
    .default(false)
    .label('Include Permission Count')
});

/**
 * Role transfer validation schema
 * For transferring role from one user to another
 */
const roleTransferSchema = yup.object().shape({
  // Source user (losing the role)
  fromUserId: idSchema
    .label('From User ID'),

  // Target user (gaining the role)
  toUserId: idSchema
    .test('different-users', 'Source and target users must be different', function (value) {
      const { fromUserId } = this.parent;
      return !value || !fromUserId || value !== fromUserId;
    })
    .label('To User ID'),

  // Role being transferred
  roleId: idSchema
    .label('Role ID'),

  // Transfer details
  transferReason: yup
    .string()
    .oneOf([
      'resignation', 'promotion', 'department_change',
      'temporary_replacement', 'permanent_replacement',
      'skill_development', 'workload_redistribution'
    ], 'Invalid transfer reason')
    .required('Transfer reason is required')
    .label('Transfer Reason'),

  transferNote: textContentSchema
    .max(500, 'Transfer note must be less than 500 characters')
    .nullable()
    .label('Transfer Note'),

  // Transfer timing
  effectiveDate: yup
    .date()
    .min(new Date(), 'Transfer effective date cannot be in the past')
    .nullable()
    .default(() => new Date())
    .label('Transfer Effective Date'),

  // Whether to maintain assignment history
  maintainHistory: booleanSchema
    .default(true)
    .label('Maintain Assignment History'),

  // Administrative information
  transferredBy: idSchema
    .label('Transferred By'),

  // Notification settings
  notifyBothUsers: booleanSchema
    .default(true)
    .label('Notify Both Users'),

  notificationMessage: yup
    .string()
    .trim()
    .max(200, 'Notification message must be less than 200 characters')
    .nullable()
    .label('Notification Message')
});

/**
 * User permission check validation schema
 * For validating permission checks in the application
 */
const permissionCheckSchema = yup.object().shape({
  // User to check permissions for
  userId: idSchema
    .label('User ID'),

  // Permission to check
  permissionName: yup
    .string()
    .trim()
    .matches(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, 'Permission name must follow format: module.action')
    .required('Permission name is required')
    .label('Permission Name'),

  // Optional resource context
  resourceId: optionalIdSchema
    .label('Resource ID'),

  resourceType: yup
    .string()
    .trim()
    .max(50, 'Resource type must be less than 50 characters')
    .nullable()
    .when('resourceId', {
      is: (value) => value !== null && value !== undefined,
      then: (schema) => schema.required('Resource type is required when resource ID is provided'),
      otherwise: (schema) => schema.nullable()
    })
    .label('Resource Type'),

  // Context for permission checking
  context: yup
    .object()
    .shape({
      department: yup.string().nullable(),
      project: yup.string().nullable(),
      ipAddress: yup.string().nullable(),
      userAgent: yup.string().nullable(),
      timestamp: yup.date().default(() => new Date())
    })
    .nullable()
    .label('Permission Context'),

  // Whether to include inherited permissions
  includeInherited: booleanSchema
    .default(true)
    .label('Include Inherited Permissions')
});

/**
 * Role assignment audit validation schema
 * For tracking role assignment changes and history
 */
const roleAssignmentAuditSchema = yup.object().shape({
  // Target user
  userId: idSchema
    .label('User ID'),

  // Date range for audit
  startDate: yup
    .date()
    .required('Start date is required')
    .label('Audit Start Date'),

  endDate: yup
    .date()
    .min(yup.ref('startDate'), 'End date must be after start date')
    .max(new Date(), 'End date cannot be in the future')
    .required('End date is required')
    .label('Audit End Date'),

  // Types of changes to include
  includeAssignments: booleanSchema
    .default(true)
    .label('Include Role Assignments'),

  includeRevocations: booleanSchema
    .default(true)
    .label('Include Role Revocations'),

  includeUpdates: booleanSchema
    .default(true)
    .label('Include Assignment Updates'),

  includeTransfers: booleanSchema
    .default(true)
    .label('Include Role Transfers'),

  // Filtering options
  roleId: optionalIdSchema
    .label('Specific Role ID'),

  adminUserId: optionalIdSchema
    .label('Admin User ID Filter'),

  // Export options
  exportFormat: yup
    .string()
    .oneOf(['json', 'csv', 'pdf'], 'Invalid export format')
    .nullable()
    .label('Export Format'),

  includeDetails: booleanSchema
    .default(false)
    .label('Include Detailed Information')
});

/**
 * User-role validation helpers
 */
const userRoleValidationHelpers = {
  /**
     * Check if user can be assigned a specific role
     */
  canAssignRole: async (userId, roleId) => {
    // TODO: Implement business logic checks
    return {
      canAssign: true,
      blockers: [],
      warnings: [],
      maxRoles: null,
      currentRoles: 0
    };
  },

  /**
     * Validate role capacity before assignment
     */
  validateRoleCapacity: async (roleId, additionalAssignments = 1) => {
    // TODO: Implement capacity check
    return {
      hasCapacity: true,
      currentAssignments: 0,
      maxCapacity: null,
      availableSlots: null
    };
  },

  /**
     * Check for role conflicts
     */
  checkRoleConflicts: async (userId, newRoleId, existingRoleIds = []) => {
    // TODO: Implement conflict detection logic
    return {
      hasConflicts: false,
      conflictingRoles: [],
      recommendations: []
    };
  },

  /**
     * Generate assignment context suggestions
     */
  suggestAssignmentContext: (fromRole, toRole, userDepartment) => {
    // Simple logic to suggest appropriate context
    const contexts = [];

    if (!fromRole && toRole) {
      contexts.push('onboarding');
    } else if (fromRole && toRole) {
      contexts.push('role_change', 'promotion', 'transfer');
    }

    return contexts;
  },

  /**
     * Validate assignment conditions
     */
  validateAssignmentConditions: (conditions) => {
    if (!conditions || typeof conditions !== 'object') {
      return { isValid: true, errors: [] };
    }

    const errors = [];
    const allowedFields = [
      'department_restriction', 'project_access', 'time_restriction',
      'ip_restriction', 'feature_flags', 'data_access_level'
    ];

    Object.keys(conditions).forEach(key => {
      if (!allowedFields.includes(key)) {
        errors.push(`Unknown condition field: ${key}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
     * Calculate effective permissions for user
     */
  calculateEffectivePermissions: async (userId, includeInherited = true) => {
    // TODO: Implement permission calculation
    return {
      permissions: [],
      roles: [],
      inheritedPermissions: [],
      calculatedAt: new Date()
    };
  },

  /**
     * Sanitize user-role assignment data
     */
  sanitizeAssignmentData: (data) => {
    const sanitized = { ...data };

    // Clean text fields
    if (sanitized.assignmentReason) {
      sanitized.assignmentReason = sanitized.assignmentReason.trim();
    }

    if (sanitized.notificationMessage) {
      sanitized.notificationMessage = sanitized.notificationMessage.trim();
    }

    // Ensure conditions is valid JSON object
    if (sanitized.conditions && typeof sanitized.conditions === 'string') {
      try {
        sanitized.conditions = JSON.parse(sanitized.conditions);
      } catch (error) {
        sanitized.conditions = null;
      }
    }

    return sanitized;
  }
};

/**
 * User-role validation constants
 */
const userRoleValidationConstants = {
  // Assignment contexts
  ASSIGNMENT_CONTEXTS: {
    PROMOTION: 'promotion',
    DEMOTION: 'demotion',
    TRANSFER: 'transfer',
    PROJECT_ASSIGNMENT: 'project_assignment',
    TEMPORARY_DUTY: 'temporary_duty',
    CORRECTION: 'correction',
    ONBOARDING: 'onboarding',
    ROLE_CHANGE: 'role_change'
  },

  // Revocation reasons
  REVOCATION_REASONS: {
    ROLE_CHANGE: 'role_change',
    TERMINATION: 'termination',
    TRANSFER: 'transfer',
    DEMOTION: 'demotion',
    PROJECT_COMPLETION: 'project_completion',
    SECURITY_VIOLATION: 'security_violation',
    USER_REQUEST: 'user_request'
  },

  // Transfer reasons
  TRANSFER_REASONS: {
    RESIGNATION: 'resignation',
    PROMOTION: 'promotion',
    DEPARTMENT_CHANGE: 'department_change',
    TEMPORARY_REPLACEMENT: 'temporary_replacement',
    PERMANENT_REPLACEMENT: 'permanent_replacement'
  },

  // Validation limits
  LIMITS: {
    MAX_BULK_ASSIGNMENTS: 100,
    MAX_ROLES_PER_USER: 10,
    MAX_ASSIGNMENT_REASON_LENGTH: 500,
    MAX_NOTIFICATION_MESSAGE_LENGTH: 200,
    MAX_AUDIT_DAYS: 365
  },

  // Common assignment conditions
  COMMON_CONDITIONS: {
    DEPARTMENT_RESTRICTION: 'department_restriction',
    PROJECT_ACCESS: 'project_access',
    TIME_RESTRICTION: 'time_restriction',
    IP_RESTRICTION: 'ip_restriction',
    FEATURE_FLAGS: 'feature_flags',
    DATA_ACCESS_LEVEL: 'data_access_level'
  }
};

module.exports = {
  // Main user-role schemas
  assignRoleSchema,
  revokeRoleSchema,
  updateRoleAssignmentSchema,

  // Bulk and transfer schemas
  bulkRoleAssignmentSchema,
  roleTransferSchema,

  // Query and audit schemas
  userRoleQuerySchema,
  permissionCheckSchema,
  roleAssignmentAuditSchema,

  // Helper functions and utilities
  userRoleValidationHelpers,
  userRoleValidationConstants
};
