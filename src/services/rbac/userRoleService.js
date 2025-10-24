/**
 * File: src/services/rbac/userRoleService.js
 * User Role Service - MySQL2 Business Logic
 *
 * This file handles all user-role assignment business logic including
 * role assignments, role changes, and user permission management.
 *
 * For beginners:
 * - This service manages the relationship between users and roles
 * - Users can have multiple roles, with one designated as primary
 * - Uses functional programming approach
 * - Integrates with Yup validation and MySQL2 models
 */

const { UserRoleModel, RoleModel, UserModel } = require('../../models');
const { RBAC: RBACSchemas } = require('../../schemas');

/**
 * Assign role to user
 *
 * @param {Object} assignmentData - Role assignment data
 * @param {string} assignedBy - ID of user making the assignment
 * @returns {Promise<Object>} Role assignment result
 */
const assignRole = async (assignmentData, assignedBy) => {
  try {
    // Validate assignment data using Yup
    const validatedData = await RBACSchemas.userRoleAssignSchema.validate(assignmentData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if user exists
    const user = await UserModel.findById(validatedData.userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Check if role exists and is active
    const role = await RoleModel.findById(validatedData.roleId);
    if (!role || !role.isActive) {
      return {
        success: false,
        message: 'Role not found or inactive'
      };
    }

    // Check role capacity if specified
    if (role.maxUsers && role.userCount >= role.maxUsers) {
      return {
        success: false,
        message: `Role has reached maximum capacity of ${role.maxUsers} users`
      };
    }

    // Assign role
    const assignResult = await UserRoleModel.assignRole({
      userId: validatedData.userId,
      roleId: validatedData.roleId,
      assignedBy: assignedBy,
      assignmentReason: validatedData.assignmentReason,
      context: validatedData.context,
      conditions: validatedData.conditions,
      expiresAt: validatedData.expiresAt,
      isPrimary: validatedData.isPrimary || false
    });

    return {
      success: assignResult.success,
      message: assignResult.success ? 'Role assigned successfully' : assignResult.message,
      data: assignResult.data
    };

  } catch (error) {
    console.error('Error in assignRole:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Role assignment failed',
      error: error.message
    };
  }
};

/**
 * Revoke role from user
 *
 * @param {Object} revocationData - Role revocation data
 * @param {string} revokedBy - ID of user revoking the role
 * @returns {Promise<Object>} Role revocation result
 */
const revokeRole = async (revocationData, revokedBy) => {
  try {
    // Validate revocation data using Yup
    const validatedData = await RBACSchemas.userRoleRevokeSchema.validate(revocationData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if user exists
    const user = await UserModel.findById(validatedData.userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Check if role exists
    const role = await RoleModel.findById(validatedData.roleId);
    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Revoke role
    const revokeResult = await UserRoleModel.revokeRole(
      validatedData.userId,
      validatedData.roleId,
      revokedBy,
      validatedData.revocationReason || 'Role revoked'
    );

    return {
      success: revokeResult.success,
      message: revokeResult.success ? 'Role revoked successfully' : revokeResult.message,
      data: revokeResult.data
    };

  } catch (error) {
    console.error('Error in revokeRole:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Role revocation failed',
      error: error.message
    };
  }
};

/**
 * Get user's roles with details
 *
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User roles result
 */
const getUserRoles = async (userId, options = {}) => {
  try {
    const {
      includeInactive = false,
      includeExpired = false,
      includePermissions = false
    } = options;

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Get user roles
    const rolesResult = await UserRoleModel.getUserRoles(userId, {
      includeInactive,
      includeExpired,
      includePermissions
    });

    return {
      success: rolesResult.success,
      message: rolesResult.success ? 'User roles retrieved successfully' : rolesResult.message,
      data: rolesResult.data
    };

  } catch (error) {
    console.error('Error in getUserRoles:', error);
    return {
      success: false,
      message: 'Failed to retrieve user roles',
      error: error.message
    };
  }
};

/**
 * Get role's assigned users
 *
 * @param {string} roleId - Role ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Role users result
 */
const getRoleUsers = async (roleId, options = {}) => {
  try {
    const {
      includeInactive = false,
      includeExpired = false,
      page = 1,
      limit = 50,
      search = ''
    } = options;

    // Check if role exists
    const role = await RoleModel.findById(roleId);
    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Get role users
    const usersResult = await UserRoleModel.getRoleUsers(roleId, {
      includeInactive,
      includeExpired,
      page,
      limit,
      search
    });

    return {
      success: usersResult.success,
      message: usersResult.success ? 'Role users retrieved successfully' : usersResult.message,
      data: usersResult.data
    };

  } catch (error) {
    console.error('Error in getRoleUsers:', error);
    return {
      success: false,
      message: 'Failed to retrieve role users',
      error: error.message
    };
  }
};

/**
 * Check if user has specific role
 *
 * @param {string} userId - User ID
 * @param {string|number} roleIdentifier - Role ID or name
 * @returns {Promise<Object>} Role check result
 */
const checkUserRole = async (userId, roleIdentifier) => {
  try {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Check user role
    const roleCheckResult = await UserRoleModel.userHasRole(userId, roleIdentifier);

    return {
      success: roleCheckResult.success,
      message: roleCheckResult.success ? 'Role check completed' : roleCheckResult.message,
      data: roleCheckResult.data
    };

  } catch (error) {
    console.error('Error in checkUserRole:', error);
    return {
      success: false,
      message: 'Role check failed',
      error: error.message
    };
  }
};

/**
 * Set user's primary role
 *
 * @param {Object} primaryRoleData - Primary role data
 * @param {string} updatedBy - ID of user making the change
 * @returns {Promise<Object>} Primary role result
 */
const setPrimaryRole = async (primaryRoleData, updatedBy) => {
  try {
    // Validate primary role data using Yup
    const validatedData = await RBACSchemas.userPrimaryRoleSchema.validate(primaryRoleData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if user exists
    const user = await UserModel.findById(validatedData.userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Check if role exists
    const role = await RoleModel.findById(validatedData.roleId);
    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Set primary role
    const setPrimaryResult = await UserRoleModel.setPrimaryRole(
      validatedData.userId,
      validatedData.roleId
    );

    return {
      success: setPrimaryResult.success,
      message: setPrimaryResult.success ? 'Primary role set successfully' : setPrimaryResult.message,
      data: setPrimaryResult.data
    };

  } catch (error) {
    console.error('Error in setPrimaryRole:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Failed to set primary role',
      error: error.message
    };
  }
};

/**
 * Get user's primary role
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Primary role result
 */
const getUserPrimaryRole = async (userId) => {
  try {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Get primary role
    const primaryRoleResult = await UserRoleModel.getUserPrimaryRole(userId);

    return {
      success: primaryRoleResult.success,
      message: primaryRoleResult.success ? 'Primary role retrieved successfully' : primaryRoleResult.message,
      data: primaryRoleResult.data
    };

  } catch (error) {
    console.error('Error in getUserPrimaryRole:', error);
    return {
      success: false,
      message: 'Failed to retrieve primary role',
      error: error.message
    };
  }
};

/**
 * Get user permissions from all assigned roles
 *
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User permissions result
 */
const getUserPermissions = async (userId, options = {}) => {
  try {
    const { groupByModule = false, includeRoleInfo = false } = options;

    // Get user roles with permissions
    const rolesResult = await getUserRoles(userId, { includePermissions: true });

    if (!rolesResult.success) {
      return rolesResult;
    }

    // Extract all permissions from roles
    const allPermissions = new Set();
    const permissionSources = {};

    rolesResult.data.roles.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach(permission => {
          allPermissions.add(permission);

          if (includeRoleInfo) {
            if (!permissionSources[permission]) {
              permissionSources[permission] = [];
            }
            permissionSources[permission].push({
              roleId: role.role_id,
              roleName: role.role_name,
              isPrimary: role.is_primary
            });
          }
        });
      }
    });

    let permissions = Array.from(allPermissions);

    // Group by module if requested
    if (groupByModule) {
      const groupedPermissions = {};
      permissions.forEach(permission => {
        const [module, action] = permission.split('.');
        if (!groupedPermissions[module]) {
          groupedPermissions[module] = [];
        }
        groupedPermissions[module].push(action);
      });
      permissions = groupedPermissions;
    }

    return {
      success: true,
      message: 'User permissions retrieved successfully',
      data: {
        userId,
        totalPermissions: allPermissions.size,
        permissions,
        permissionSources: includeRoleInfo ? permissionSources : undefined
      }
    };

  } catch (error) {
    console.error('Error in getUserPermissions:', error);
    return {
      success: false,
      message: 'Failed to retrieve user permissions',
      error: error.message
    };
  }
};

/**
 * Transfer user roles to another user
 *
 * @param {Object} transferData - Transfer data
 * @param {string} transferredBy - ID of user performing the transfer
 * @returns {Promise<Object>} Transfer result
 */
const transferUserRoles = async (transferData, transferredBy) => {
  try {
    // Validate transfer data using Yup
    const validatedData = await RBACSchemas.userRoleTransferSchema.validate(transferData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if source user exists
    const sourceUser = await UserModel.findById(validatedData.sourceUserId);
    if (!sourceUser) {
      return {
        success: false,
        message: 'Source user not found'
      };
    }

    // Check if target user exists
    const targetUser = await UserModel.findById(validatedData.targetUserId);
    if (!targetUser) {
      return {
        success: false,
        message: 'Target user not found'
      };
    }

    // Get source user's roles
    const sourceRoles = await getUserRoles(validatedData.sourceUserId, { includeInactive: false });
    if (!sourceRoles.success || sourceRoles.data.roles.length === 0) {
      return {
        success: false,
        message: 'Source user has no active roles to transfer'
      };
    }

    const results = {
      successful: [],
      failed: [],
      total: sourceRoles.data.roles.length
    };

    // Transfer each role
    for (const role of sourceRoles.data.roles) {
      try {
        // Revoke from source user
        const revokeResult = await revokeRole({
          userId: validatedData.sourceUserId,
          roleId: role.role_id,
          revocationReason: `Role transferred to user ${validatedData.targetUserId}`
        }, transferredBy);

        if (revokeResult.success) {
          // Assign to target user
          const assignResult = await assignRole({
            userId: validatedData.targetUserId,
            roleId: role.role_id,
            isPrimary: role.is_primary,
            assignmentReason: `Role transferred from user ${validatedData.sourceUserId}`
          }, transferredBy);

          if (assignResult.success) {
            results.successful.push({
              roleId: role.role_id,
              roleName: role.role_name,
              wasPrimary: role.is_primary
            });
          } else {
            results.failed.push({
              roleId: role.role_id,
              roleName: role.role_name,
              error: assignResult.message
            });
          }
        } else {
          results.failed.push({
            roleId: role.role_id,
            roleName: role.role_name,
            error: revokeResult.message
          });
        }
      } catch (error) {
        results.failed.push({
          roleId: role.role_id,
          roleName: role.role_name,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Transferred ${results.successful.length} of ${results.total} roles successfully`,
      data: {
        sourceUserId: validatedData.sourceUserId,
        targetUserId: validatedData.targetUserId,
        transferredBy,
        transferredAt: new Date(),
        results
      }
    };

  } catch (error) {
    console.error('Error in transferUserRoles:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Role transfer failed',
      error: error.message
    };
  }
};

/**
 * Bulk assign roles to multiple users
 *
 * @param {Object} bulkData - Bulk assignment data
 * @param {string} assignedBy - ID of user making assignments
 * @returns {Promise<Object>} Bulk assignment result
 */
const bulkAssignRoles = async (bulkData, assignedBy) => {
  try {
    // Validate bulk assignment data using Yup
    const validatedData = await RBACSchemas.userRoleBulkAssignSchema.validate(bulkData);

    const results = {
      successful: [],
      failed: [],
      total: validatedData.assignments.length
    };

    // Process each assignment
    for (const assignment of validatedData.assignments) {
      try {
        const result = await assignRole(assignment, assignedBy);

        if (result.success) {
          results.successful.push({
            userId: assignment.userId,
            roleId: assignment.roleId,
            assignmentId: result.data.assignment_id
          });
        } else {
          results.failed.push({
            userId: assignment.userId,
            roleId: assignment.roleId,
            error: result.message
          });
        }
      } catch (error) {
        results.failed.push({
          userId: assignment.userId,
          roleId: assignment.roleId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.total} assignments: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    };

  } catch (error) {
    console.error('Error in bulkAssignRoles:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Bulk role assignment failed',
      error: error.message
    };
  }
};

/**
 * Get user role statistics
 *
 * @param {string|null} userId - User ID (null for all users)
 * @returns {Promise<Object>} Role statistics result
 */
const getUserRoleStatistics = async (userId = null) => {
  try {
    const statsResult = await UserRoleModel.getRoleStats(userId);

    return {
      success: statsResult.success,
      message: statsResult.success ? 'Role statistics retrieved successfully' : statsResult.message,
      data: statsResult.data
    };

  } catch (error) {
    console.error('Error in getUserRoleStatistics:', error);
    return {
      success: false,
      message: 'Failed to retrieve role statistics',
      error: error.message
    };
  }
};

module.exports = {
  assignRole,
  revokeRole,
  getUserRoles,
  getRoleUsers,
  checkUserRole,
  setPrimaryRole,
  getUserPrimaryRole,
  getUserPermissions,
  transferUserRoles,
  bulkAssignRoles,
  getUserRoleStatistics
};
