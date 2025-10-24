

/**
* File: src/schemas/index.js
* Schema Registry and Central Exports
*
* This file serves as the central registry for all Yup validation schemas.
* It provides organized access to all validation schemas throughout the application.
*
* For beginners:
* - This is like a phone book for all our validation schemas
* - Instead of importing schemas from individual files, you can import from here
* - It organizes schemas by category (auth, rbac, common) for easy access
* - It also provides utility functions for schema validation and error handling
*/


const yup = require('yup');
// Import base schemas
const baseSchemas = require('./common/baseSchema');

// Import authentication schemas
const loginSchemas = require('./auth/loginSchema');
const registerSchemas = require('./auth/registerSchema');
const passwordSchemas = require('./auth/passwordSchema');

// Import RBAC schemas
const roleSchemas = require('./rbac/roleSchema');
const permissionSchemas = require('./rbac/permissionSchema');
const userRoleSchemas = require('./rbac/userRoleSchema');

/**
 * Centralized schema registry
 * Organized by functional areas for easy access
 */
const schemas = {
  // Common/Base schemas
  common: {
    // Basic field validations
    email: baseSchemas.emailSchema,
    password: baseSchemas.passwordSchema,
    passwordConfirm: baseSchemas.passwordConfirmSchema,
    name: baseSchemas.nameSchema,
    username: baseSchemas.usernameSchema,
    phone: baseSchemas.phoneSchema,
    url: baseSchemas.urlSchema,

    // ID and number schemas
    id: baseSchemas.idSchema,
    optionalId: baseSchemas.optionalIdSchema,
    boolean: baseSchemas.booleanSchema,

    // Date schemas
    date: baseSchemas.dateSchema,
    futureDate: baseSchemas.futureDateSchema,

    // Search and pagination
    searchQuery: baseSchemas.searchQuerySchema,
    page: baseSchemas.pageSchema,
    pageSize: baseSchemas.pageSizeSchema,
    sortOrder: baseSchemas.sortOrderSchema,

    // Content and formatting
    textContent: baseSchemas.textContentSchema,
    colorCode: baseSchemas.colorCodeSchema,
    json: baseSchemas.jsonSchema,

    // Localization
    timezone: baseSchemas.timezoneSchema,
    language: baseSchemas.languageSchema,

    // Validation messages and utilities
    validationMessages: baseSchemas.validationMessages,
    customValidations: baseSchemas.customValidations
  },

  // Authentication schemas
  auth: {
    // Login operations
    login: loginSchemas.loginSchema,
    adminLogin: loginSchemas.adminLoginSchema,
    apiLogin: loginSchemas.apiLoginSchema,
    loginAttempt: loginSchemas.loginAttemptSchema,
    sessionValidation: loginSchemas.sessionValidationSchema,
    passwordOnly: loginSchemas.passwordOnlySchema,
    loginContext: loginSchemas.loginContextSchema,
    loginWithCaptcha: loginSchemas.loginWithCaptchaSchema,
    logout: loginSchemas.logoutSchema,

    // Registration operations
    register: registerSchemas.registerSchema,
    quickRegister: registerSchemas.quickRegisterSchema,
    adminRegister: registerSchemas.adminRegisterSchema,
    employeeRegister: registerSchemas.employeeRegisterSchema,
    bulkRegister: registerSchemas.bulkRegisterSchema,
    registerWithCaptcha: registerSchemas.registerWithCaptchaSchema,
    emailVerification: registerSchemas.emailVerificationSchema,

    // Password operations
    changePassword: passwordSchemas.changePasswordSchema,
    passwordResetRequest: passwordSchemas.passwordResetRequestSchema,
    passwordResetComplete: passwordSchemas.passwordResetCompleteSchema,
    passwordResetTokenValidation: passwordSchemas.passwordResetTokenValidationSchema,
    adminPasswordReset: passwordSchemas.adminPasswordResetSchema,
    passwordStrength: passwordSchemas.passwordStrengthSchema,
    passwordPolicy: passwordSchemas.passwordPolicySchema,
    passwordHistory: passwordSchemas.passwordHistorySchema,
    bulkPasswordReset: passwordSchemas.bulkPasswordResetSchema,
    passwordExpiration: passwordSchemas.passwordExpirationSchema,

    // Validation helpers
    loginValidationHelpers: loginSchemas.loginValidationHelpers,
    registrationValidationHelpers: registerSchemas.registrationValidationHelpers,
    passwordValidationHelpers: passwordSchemas.passwordValidationHelpers
  },

  // Role-Based Access Control schemas
  rbac: {
    // Role management
    createRole: roleSchemas.createRoleSchema,
    updateRole: roleSchemas.updateRoleSchema,
    deleteRole: roleSchemas.deleteRoleSchema,
    roleQuery: roleSchemas.roleQuerySchema,
    roleAssignment: roleSchemas.roleAssignmentSchema,
    roleHierarchy: roleSchemas.roleHierarchySchema,
    bulkRoleOperation: roleSchemas.bulkRoleOperationSchema,

    // Permission management
    createPermission: permissionSchemas.createPermissionSchema,
    updatePermission: permissionSchemas.updatePermissionSchema,
    deletePermission: permissionSchemas.deletePermissionSchema,
    permissionQuery: permissionSchemas.permissionQuerySchema,
    bulkPermissionCreation: permissionSchemas.bulkPermissionCreationSchema,
    permissionDependency: permissionSchemas.permissionDependencySchema,

    // User-role assignments
    assignRole: userRoleSchemas.assignRoleSchema,
    revokeRole: userRoleSchemas.revokeRoleSchema,
    updateRoleAssignment: userRoleSchemas.updateRoleAssignmentSchema,
    bulkRoleAssignment: userRoleSchemas.bulkRoleAssignmentSchema,
    roleTransfer: userRoleSchemas.roleTransferSchema,
    userRoleQuery: userRoleSchemas.userRoleQuerySchema,
    permissionCheck: userRoleSchemas.permissionCheckSchema,
    roleAssignmentAudit: userRoleSchemas.roleAssignmentAuditSchema,

    // Validation helpers
    roleValidationHelpers: roleSchemas.roleValidationHelpers,
    roleValidationConstants: roleSchemas.roleValidationConstants,
    permissionValidationHelpers: permissionSchemas.permissionValidationHelpers,
    permissionValidationConstants: permissionSchemas.permissionValidationConstants,
    permissionTemplates: permissionSchemas.permissionTemplates,
    userRoleValidationHelpers: userRoleSchemas.userRoleValidationHelpers,
    userRoleValidationConstants: userRoleSchemas.userRoleValidationConstants
  }
};
/**
 * Schema validation utilities
 * Helper functions for working with schemas across the application
 */
const schemaUtils = {
  /**
     * Validate data against a schema and return formatted results
     * @param {Object} schema - Yup schema to validate against
     * @param {Object} data - Data to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result with success status and formatted errors
     */
  validateSchema: async (schema, data, options = {}) => {
    const {
      abortEarly = false,
      stripUnknown = true,
      context = {}
    } = options;

    try {
      const validatedData = await schema.validate(data, {
        abortEarly,
        stripUnknown,
        context
      });

      return {
        success: true,
        data: validatedData,
        errors: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: schemaUtils.formatValidationErrors(error)
      };
    }
  },

  /**
     * Format Yup validation errors into a consistent structure
     * @param {Object} yupError - Yup validation error
     * @returns {Object} Formatted error structure
     */
  formatValidationErrors: (yupError) => {
    if (yupError.name !== 'ValidationError') {
      return {
        general: ['An unexpected validation error occurred']
      };
    }

    // Group errors by field path
    const fieldErrors = {};
    const generalErrors = [];

    if (yupError.inner && yupError.inner.length > 0) {
      // Multiple field errors
      yupError.inner.forEach(error => {
        const field = error.path || 'general';
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.message);
      });
    } else {
      // Single error
      const field = yupError.path || 'general';
      if (field === 'general') {
        generalErrors.push(yupError.message);
      } else {
        fieldErrors[field] = [yupError.message];
      }
    }

    const result = { ...fieldErrors };
    if (generalErrors.length > 0) {
      result.general = generalErrors;
    }

    return result;
  },

  /**
     * Extract validation error messages as flat array
     * @param {Object} formattedErrors - Formatted error object from formatValidationErrors
     * @returns {Array} Array of error messages
     */
  extractErrorMessages: (formattedErrors) => {
    const messages = [];

    Object.values(formattedErrors).forEach(fieldErrors => {
      if (Array.isArray(fieldErrors)) {
        messages.push(...fieldErrors);
      }
    });

    return messages;
  },

  /**
     * Validate multiple schemas in sequence
     * @param {Array} validations - Array of {schema, data, options} objects
     * @returns {Object} Combined validation result
     */
  validateMultiple: async (validations) => {
    const results = [];
    const allErrors = {};
    let hasErrors = false;

    for (const validation of validations) {
      const { schema, data, options = {}, fieldPrefix = '' } = validation;
      const result = await schemaUtils.validateSchema(schema, data, options);

      results.push(result);

      if (!result.success) {
        hasErrors = true;

        // Add field prefix if specified
        if (fieldPrefix) {
          Object.keys(result.errors).forEach(field => {
            const prefixedField = field === 'general' ? field : `${fieldPrefix}.${field}`;
            allErrors[prefixedField] = result.errors[field];
          });
        } else {
          Object.assign(allErrors, result.errors);
        }
      }
    }

    return {
      success: !hasErrors,
      results,
      errors: hasErrors ? allErrors : null
    };
  },

  /**
     * Create a conditional schema based on request type or context
     * @param {Object} conditions - Conditions for schema selection
     * @param {Object} schemaMap - Map of condition values to schemas
     * @param {Object} defaultSchema - Default schema if no conditions match
     * @returns {Object} Selected schema
     */
  conditionalSchema: (conditions, schemaMap, defaultSchema = null) => {
    // Simple condition matching - can be extended for complex logic
    for (const [condition, schema] of Object.entries(schemaMap)) {
      if (conditions[condition] === true || conditions.type === condition) {
        return schema;
      }
    }

    return defaultSchema;
  },

  /**
     * Transform schema validation errors for API responses
     * @param {Object} errors - Formatted validation errors
     * @param {number} statusCode - HTTP status code
     * @returns {Object} API error response format
     */
  toApiErrorResponse: (errors, statusCode = 400) => {
    return {
      success: false,
      message: 'Validation failed',
      statusCode,
      errors,
      timestamp: new Date().toISOString()
    };
  },

  /**
     * Get schema by path (e.g., 'auth.login', 'rbac.createRole')
     * @param {string} schemaPath - Dot notation path to schema
     * @returns {Object|null} Schema object or null if not found
     */
  getSchemaByPath: (schemaPath) => {
    const pathParts = schemaPath.split('.');
    let current = schemas;

    for (const part of pathParts) {
      if (current[part]) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current;
  },

  /**
     * List all available schema paths
     * @returns {Array} Array of all schema paths
     */
  listSchemaPaths: () => {
    const paths = [];

    const traverse = (obj, currentPath = '') => {
      Object.keys(obj).forEach(key => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key].validate) {
          // This is a Yup schema (has validate method)
          paths.push(newPath);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Continue traversing
          traverse(obj[key], newPath);
        }
      });
    };

    traverse(schemas);
    return paths.sort();
  },

  /**
     * Create validation middleware for Express routes
     * @param {string|Object} schemaPath - Schema path or schema object
     * @param {string} dataSource - Where to get data ('body', 'query', 'params')
     * @param {Object} options - Validation options
     * @returns {Function} Express middleware function
     */
  createValidationMiddleware: (schemaPath, dataSource = 'body', options = {}) => {
    return async (req, res, next) => {
      try {
        const schema = typeof schemaPath === 'string'
          ? schemaUtils.getSchemaByPath(schemaPath)
          : schemaPath;

        if (!schema) {
          return res.status(500).json({
            success: false,
            message: 'Validation schema not found',
            error: `Schema path '${schemaPath}' does not exist`
          });
        }

        const data = req[dataSource];
        const result = await schemaUtils.validateSchema(schema, data, options);

        if (result.success) {
          // Replace request data with validated/transformed data
          req[dataSource] = result.data;
          next();
        } else {
          res.status(400).json(schemaUtils.toApiErrorResponse(result.errors));
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Validation middleware error',
          error: error.message
        });
      }
    };
  }
};

/**
 * Schema collections for common use cases
 * Pre-grouped schemas for specific scenarios
 */
const schemaCollections = {
  /**
     * Authentication flow schemas
     */
  authFlow: {
    login: schemas.auth.login,
    register: schemas.auth.register,
    changePassword: schemas.auth.changePassword,
    resetPassword: schemas.auth.passwordResetRequest,
    completeReset: schemas.auth.passwordResetComplete
  },

  /**
     * Admin panel schemas
     */
  adminPanel: {
    adminLogin: schemas.auth.adminLogin,
    createRole: schemas.rbac.createRole,
    createPermission: schemas.rbac.createPermission,
    assignRole: schemas.rbac.assignRole,
    adminRegister: schemas.auth.adminRegister,
    adminPasswordReset: schemas.auth.adminPasswordReset
  },

  /**
     * User management schemas
     */
  userManagement: {
    register: schemas.auth.register,
    updateProfile: schemas.auth.register, // Reuse with modifications
    assignRole: schemas.rbac.assignRole,
    revokeRole: schemas.rbac.revokeRole,
    changePassword: schemas.auth.changePassword
  },

  /**
     * Role and permission management
     */
  rbacManagement: {
    createRole: schemas.rbac.createRole,
    updateRole: schemas.rbac.updateRole,
    deleteRole: schemas.rbac.deleteRole,
    createPermission: schemas.rbac.createPermission,
    updatePermission: schemas.rbac.updatePermission,
    bulkCreatePermissions: schemas.rbac.bulkPermissionCreation,
    assignRole: schemas.rbac.assignRole,
    transferRole: schemas.rbac.roleTransfer
  },

  /**
     * Query and filtering schemas
     */
  querySchemas: {
    userRoleQuery: schemas.rbac.userRoleQuery,
    roleQuery: schemas.rbac.roleQuery,
    permissionQuery: schemas.rbac.permissionQuery,
    pagination: {
      page: schemas.common.page,
      pageSize: schemas.common.pageSize,
      sortOrder: schemas.common.sortOrder
    }
  },

  /**
     * Bulk operation schemas
     */
  bulkOperations: {
    bulkRegister: schemas.auth.bulkRegister,
    bulkPasswordReset: schemas.auth.bulkPasswordReset,
    bulkRoleAssignment: schemas.rbac.bulkRoleAssignment,
    bulkRoleOperation: schemas.rbac.bulkRoleOperation,
    bulkPermissionCreation: schemas.rbac.bulkPermissionCreation
  }
};

/**
 * Schema validation presets
 * Common validation configurations for different scenarios
 */
const validationPresets = {
  /**
     * Strict validation (no unknown fields, abort on first error)
     */
  strict: {
    stripUnknown: false,
    abortEarly: true
  },

  /**
     * Lenient validation (strip unknown fields, collect all errors)
     */
  lenient: {
    stripUnknown: true,
    abortEarly: false
  },

  /**
     * API validation (strip unknown, collect all errors for better UX)
     */
  api: {
    stripUnknown: true,
    abortEarly: false
  },

  /**
     * Form validation (keep unknown for debugging, collect all errors)
     */
  form: {
    stripUnknown: false,
    abortEarly: false
  },

  /**
     * Security validation (strict, no unknowns, fail fast)
     */
  security: {
    stripUnknown: false,
    abortEarly: true
  }
};

/**
 * Common validation patterns and helpers
 */
const validationPatterns = {
  /**
     * Validate request with pagination
     */
  validateWithPagination: async (dataSchema, queryData, bodyData) => {
    const paginationSchema = yup.object().shape({
      page: schemas.common.page,
      pageSize: schemas.common.pageSize,
      sortOrder: schemas.common.sortOrder
    });

    return await schemaUtils.validateMultiple([
      { schema: paginationSchema, data: queryData, fieldPrefix: 'query' },
      { schema: dataSchema, data: bodyData, fieldPrefix: 'body' }
    ]);
  },

  /**
     * Validate user authentication request
     */
  validateAuth: async (requestData, authType = 'login') => {
    const authSchemas = {
      login: schemas.auth.login,
      register: schemas.auth.register,
      adminLogin: schemas.auth.adminLogin,
      apiLogin: schemas.auth.apiLogin
    };

    const schema = authSchemas[authType];
    if (!schema) {
      throw new Error(`Unknown auth type: ${authType}`);
    }

    return await schemaUtils.validateSchema(schema, requestData, validationPresets.security);
  },

  /**
     * Validate RBAC operation
     */
  validateRBAC: async (requestData, operation, operationType = 'role') => {
    const rbacSchemas = {
      role: {
        create: schemas.rbac.createRole,
        update: schemas.rbac.updateRole,
        delete: schemas.rbac.deleteRole,
        assign: schemas.rbac.assignRole,
        revoke: schemas.rbac.revokeRole
      },
      permission: {
        create: schemas.rbac.createPermission,
        update: schemas.rbac.updatePermission,
        delete: schemas.rbac.deletePermission
      }
    };

    const schema = rbacSchemas[operationType]?.[operation];
    if (!schema) {
      throw new Error(`Unknown RBAC operation: ${operationType}.${operation}`);
    }

    return await schemaUtils.validateSchema(schema, requestData, validationPresets.api);
  }
};

/**
 * Export all schemas and utilities
 */
module.exports = {
  // Main schema registry
  schemas,

  // Schema utilities
  utils: schemaUtils,

  // Pre-grouped schema collections
  collections: schemaCollections,

  // Validation presets
  presets: validationPresets,

  // Common validation patterns
  patterns: validationPatterns,

  // Direct access to individual schema modules (for backwards compatibility)
  base: baseSchemas,
  auth: {
    login: loginSchemas,
    register: registerSchemas,
    password: passwordSchemas
  },
  rbac: {
    role: roleSchemas,
    permission: permissionSchemas,
    userRole: userRoleSchemas
  },

  // Convenience exports for commonly used schemas
  validate: schemaUtils.validateSchema,
  formatErrors: schemaUtils.formatValidationErrors,
  createMiddleware: schemaUtils.createValidationMiddleware,

  // Schema information
  info: {
    version: '1.0.0',
    totalSchemas: schemaUtils.listSchemaPaths().length,
    availablePaths: schemaUtils.listSchemaPaths(),
    lastUpdated: new Date().toISOString()
  }
};
