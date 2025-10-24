/**
 * File: src/models/rbac/userRoleModel.js
 * User Role Model - MySQL2 Database Operations
 *
 * This file handles the many-to-many relationship between users and roles.
 * It manages role assignments to users, primary roles, and assignment tracking.
 *
 * For beginners:
 * - This connects users with their roles (many-to-many relationship)
 * - Users can have multiple roles, and roles can be assigned to multiple users
 * - Each user has one "primary" role that defines their main access level
 * - We track who assigned roles, when, and why for auditing purposes
 */

const { executeQuery, executeTransaction } = require('../database');

/**
 * User Role Model Class
 * Contains all user-role relationship database operations
 */
class UserRoleModel {
  /**
     * Assign role to user
     *
     * @param {Object} assignmentData - Assignment data
     * @returns {Promise<Object>} Created user-role assignment
     */
  static async assignRole(assignmentData) {
    try {
      const {
        userId,
        roleId,
        assignedBy = null,
        assignmentReason = null,
        context = null,
        conditions = null,
        expiresAt = null,
        isPrimary = false
      } = assignmentData;

      // Check if assignment already exists
      const existingAssignment = await this.findByUserAndRole(userId, roleId);

      if (existingAssignment && existingAssignment.is_active) {
        return {
          success: false,
          message: 'User already has this role assigned',
          data: existingAssignment
        };
      }

      // Execute assignment in transaction to ensure data consistency
      return await executeTransaction(async (connection) => {
        // If setting as primary, remove primary flag from other roles
        if (isPrimary) {
          const removePrimaryQuery = `
                        UPDATE user_roles 
                        SET is_primary = 0, updated_at = NOW() 
                        WHERE user_id = ? AND is_primary = 1 AND is_active = 1
                    `;
          await connection.execute(removePrimaryQuery, [userId]);
        }

        // Create new role assignment
        const insertQuery = `
                    INSERT INTO user_roles (
                        user_id, role_id, is_primary, is_active,
                        assigned_by, assignment_reason, context,
                        conditions, expires_at, assigned_at,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
                `;

        const [result] = await connection.execute(insertQuery, [
          userId,
          roleId,
          isPrimary ? 1 : 0,
          assignedBy,
          assignmentReason,
          context,
          conditions ? JSON.stringify(conditions) : null,
          expiresAt
        ]);

        // Update role user count
        await this.updateRoleUserCount(connection, roleId);

        return {
          success: true,
          message: 'Role assigned successfully',
          data: {
            id: result.insertId,
            user_id: userId,
            role_id: roleId,
            is_primary: isPrimary,
            assigned_at: new Date()
          }
        };
      });

    } catch (error) {
      console.error('Error in assignRole:', error);
      return {
        success: false,
        message: `Failed to assign role: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Remove role from user
     *
     * @param {number} userId - User ID
     * @param {number} roleId - Role ID
     * @param {number} revokedBy - ID of user revoking the role
     * @param {string} reason - Reason for revocation
     * @returns {Promise<Object>} Revocation result
     */
  static async revokeRole(userId, roleId, revokedBy = null, reason = null) {
    try {
      // Check if assignment exists and is active
      const assignment = await this.findByUserAndRole(userId, roleId);

      if (!assignment || !assignment.is_active) {
        return {
          success: false,
          message: 'Active role assignment not found'
        };
      }

      return await executeTransaction(async (connection) => {
        // Deactivate the role assignment
        const revokeQuery = `
                    UPDATE user_roles 
                    SET is_active = 0, 
                        revoked_by = ?, 
                        revoked_at = NOW(),
                        revocation_reason = ?,
                        updated_at = NOW()
                    WHERE user_id = ? AND role_id = ? AND is_active = 1
                `;

        await connection.execute(revokeQuery, [
          revokedBy,
          reason,
          userId,
          roleId
        ]);

        // If this was the primary role, assign another active role as primary
        if (assignment.is_primary) {
          const findNewPrimaryQuery = `
                        SELECT id 
                        FROM user_roles 
                        WHERE user_id = ? AND is_active = 1 
                        ORDER BY assigned_at ASC 
                        LIMIT 1
                    `;

          const [newPrimary] = await connection.execute(findNewPrimaryQuery, [userId]);

          if (newPrimary.length > 0) {
            const setPrimaryQuery = `
                            UPDATE user_roles 
                            SET is_primary = 1, updated_at = NOW()
                            WHERE id = ?
                        `;
            await connection.execute(setPrimaryQuery, [newPrimary[0].id]);
          }
        }

        // Update role user count
        await this.updateRoleUserCount(connection, roleId);

        return {
          success: true,
          message: 'Role revoked successfully',
          data: {
            user_id: userId,
            role_id: roleId,
            revoked_at: new Date()
          }
        };
      });

    } catch (error) {
      console.error('Error in revokeRole:', error);
      return {
        success: false,
        message: `Failed to revoke role: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Get all roles assigned to a user
     *
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} User's roles
     */
  static async getUserRoles(userId, options = {}) {
    try {
      const {
        includeInactive = false,
        includeExpired = false,
        includePermissions = false
      } = options;

      const whereConditions = ['ur.user_id = ?'];
      const queryParams = [userId];

      if (!includeInactive) {
        whereConditions.push('ur.is_active = 1');
      }

      if (!includeExpired) {
        whereConditions.push('(ur.expires_at IS NULL OR ur.expires_at > NOW())');
      }

      let permissionJoin = '';
      let permissionFields = '';

      if (includePermissions) {
        permissionJoin = `
                    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
                    LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = 1
                `;
        permissionFields = `, GROUP_CONCAT(DISTINCT p.name) as permissions`;
      }

      const query = `
                SELECT 
                    ur.id,
                    ur.user_id,
                    ur.role_id,
                    ur.is_primary,
                    ur.is_active,
                    ur.assigned_at,
                    ur.expires_at,
                    ur.conditions,
                    ur.assignment_reason,
                    ur.assigned_by,
                    r.name as role_name,
                    r.description as role_description,
                    r.priority as role_priority
                    ${permissionFields}
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
                ${permissionJoin}
                WHERE ${whereConditions.join(' AND ')}
                ${includePermissions ? 'GROUP BY ur.id' : ''}
                ORDER BY ur.is_primary DESC, r.priority ASC, ur.assigned_at ASC
            `;

      const roles = await executeQuery(query, queryParams);

      return {
        success: true,
        data: {
          user_id: userId,
          total_roles: roles.length,
          primary_role: roles.find(role => role.is_primary) || null,
          roles: roles.map(role => ({
            id: role.id,
            role_id: role.role_id,
            role_name: role.role_name,
            role_description: role.role_description,
            role_priority: role.role_priority,
            is_primary: Boolean(role.is_primary),
            is_active: Boolean(role.is_active),
            assigned_at: role.assigned_at,
            expires_at: role.expires_at,
            assignment_reason: role.assignment_reason,
            assigned_by: role.assigned_by,
            conditions: role.conditions ? JSON.parse(role.conditions) : null,
            permissions: role.permissions ? role.permissions.split(',') : []
          }))
        }
      };

    } catch (error) {
      console.error('Error in getUserRoles:', error);
      return {
        success: false,
        message: `Failed to get user roles: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Get all users assigned to a role
     *
     * @param {number} roleId - Role ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Role's users
     */
  static async getRoleUsers(roleId, options = {}) {
    try {
      const {
        includeInactive = false,
        includeExpired = false,
        page = 1,
        limit = 50,
        search = ''
      } = options;

      const whereConditions = ['ur.role_id = ?'];
      const queryParams = [roleId];

      if (!includeInactive) {
        whereConditions.push('ur.is_active = 1');
      }

      if (!includeExpired) {
        whereConditions.push('(ur.expires_at IS NULL OR ur.expires_at > NOW())');
      }

      if (search) {
        whereConditions.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      // Count total users
      const countQuery = `
                SELECT COUNT(*) as total
                FROM user_roles ur
                JOIN users u ON ur.user_id = u.id AND u.is_active = 1
                WHERE ${whereConditions.join(' AND ')}
            `;

      const [countResult] = await executeQuery(countQuery, queryParams);
      const total = countResult.total;

      // Get users with pagination
      const offset = (page - 1) * limit;
      const usersQuery = `
                SELECT 
                    ur.id,
                    ur.user_id,
                    ur.is_primary,
                    ur.is_active,
                    ur.assigned_at,
                    ur.expires_at,
                    ur.assignment_reason,
                    ur.assigned_by,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.is_verified
                FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY ur.is_primary DESC, ur.assigned_at DESC
                LIMIT ? OFFSET ?
            `;

      queryParams.push(limit, offset);
      const users = await executeQuery(usersQuery, queryParams);

      return {
        success: true,
        data: {
          role_id: roleId,
          total_users: total,
          page: page,
          limit: limit,
          total_pages: Math.ceil(total / limit),
          users: users.map(user => ({
            id: user.id,
            user_id: user.user_id,
            email: user.email,
            full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            is_primary: Boolean(user.is_primary),
            is_active: Boolean(user.is_active),
            is_verified: Boolean(user.is_verified),
            assigned_at: user.assigned_at,
            expires_at: user.expires_at,
            assignment_reason: user.assignment_reason,
            assigned_by: user.assigned_by
          }))
        }
      };

    } catch (error) {
      console.error('Error in getRoleUsers:', error);
      return {
        success: false,
        message: `Failed to get role users: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Check if user has a specific role
     *
     * @param {number} userId - User ID
     * @param {string|number} roleIdentifier - Role ID or role name
     * @returns {Promise<Object>} Role check result
     */
  static async userHasRole(userId, roleIdentifier) {
    try {
      let roleCondition, roleParam;

      if (typeof roleIdentifier === 'number') {
        roleCondition = 'r.id = ?';
        roleParam = roleIdentifier;
      } else {
        roleCondition = 'r.name = ?';
        roleParam = roleIdentifier;
      }

      const query = `
                SELECT 
                    ur.id,
                    ur.is_active,
                    ur.expires_at,
                    r.name as role_name,
                    r.id as role_id
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = ? 
                  AND ${roleCondition}
                  AND ur.is_active = 1
                  AND r.is_active = 1
                  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            `;

      const [result] = await executeQuery(query, [userId, roleParam]);

      return {
        success: true,
        hasRole: !!result,
        data: result ? {
          assignment_id: result.id,
          role_id: result.role_id,
          role_name: result.role_name,
          expires_at: result.expires_at
        } : null
      };

    } catch (error) {
      console.error('Error in userHasRole:', error);
      return {
        success: false,
        message: `Failed to check user role: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Find user-role assignment by user ID and role ID
     *
     * @param {number} userId - User ID
     * @param {number} roleId - Role ID
     * @returns {Promise<Object|null>} User-role assignment or null
     */
  static async findByUserAndRole(userId, roleId) {
    try {
      const query = `
                SELECT 
                    ur.*,
                    r.name as role_name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = ? AND ur.role_id = ?
                ORDER BY ur.created_at DESC
                LIMIT 1
            `;

      const [result] = await executeQuery(query, [userId, roleId]);
      return result || null;

    } catch (error) {
      console.error('Error in findByUserAndRole:', error);
      return null;
    }
  }

  /**
     * Get user's primary role
     *
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Primary role or null
     */
  static async getUserPrimaryRole(userId) {
    try {
      const query = `
                SELECT 
                    ur.*,
                    r.name as role_name,
                    r.description as role_description,
                    r.priority as role_priority
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = ? 
                  AND ur.is_primary = 1 
                  AND ur.is_active = 1
                  AND r.is_active = 1
                  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            `;

      const [result] = await executeQuery(query, [userId]);

      if (result) {
        return {
          success: true,
          data: {
            id: result.id,
            role_id: result.role_id,
            role_name: result.role_name,
            role_description: result.role_description,
            role_priority: result.role_priority,
            assigned_at: result.assigned_at,
            expires_at: result.expires_at
          }
        };
      }

      return {
        success: false,
        message: 'No primary role found for user'
      };

    } catch (error) {
      console.error('Error in getUserPrimaryRole:', error);
      return {
        success: false,
        message: `Failed to get user primary role: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Set role as primary for user
     *
     * @param {number} userId - User ID
     * @param {number} roleId - Role ID to set as primary
     * @returns {Promise<Object>} Operation result
     */
  static async setPrimaryRole(userId, roleId) {
    try {
      // Check if user has the role and it's active
      const assignment = await this.findByUserAndRole(userId, roleId);

      if (!assignment || !assignment.is_active) {
        return {
          success: false,
          message: 'User does not have this role assigned or role is inactive'
        };
      }

      return await executeTransaction(async (connection) => {
        // Remove primary flag from all user's roles
        const removePrimaryQuery = `
                    UPDATE user_roles 
                    SET is_primary = 0, updated_at = NOW()
                    WHERE user_id = ? AND is_primary = 1
                `;
        await connection.execute(removePrimaryQuery, [userId]);

        // Set new primary role
        const setPrimaryQuery = `
                    UPDATE user_roles 
                    SET is_primary = 1, updated_at = NOW()
                    WHERE user_id = ? AND role_id = ? AND is_active = 1
                `;
        await connection.execute(setPrimaryQuery, [userId, roleId]);

        return {
          success: true,
          message: 'Primary role updated successfully',
          data: {
            user_id: userId,
            primary_role_id: roleId
          }
        };
      });

    } catch (error) {
      console.error('Error in setPrimaryRole:', error);
      return {
        success: false,
        message: `Failed to set primary role: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Update role user count
     * Helper function to maintain accurate user count on roles
     *
     * @param {Object} connection - Database connection
     * @param {number} roleId - Role ID
     */
  static async updateRoleUserCount(connection, roleId) {
    const updateQuery = `
            UPDATE roles 
            SET user_count = (
                SELECT COUNT(*) 
                FROM user_roles 
                WHERE role_id = ? AND is_active = 1
            ),
            updated_at = NOW()
            WHERE id = ?
        `;

    await connection.execute(updateQuery, [roleId, roleId]);
  }

  /**
     * Get user role statistics
     *
     * @param {number|null} userId - User ID (null for all users)
     * @returns {Promise<Object>} Role statistics
     */
  static async getRoleStats(userId = null) {
    try {
      let whereCondition = '1=1';
      const queryParams = [];

      if (userId) {
        whereCondition = 'ur.user_id = ?';
        queryParams.push(userId);
      }

      const query = `
                SELECT 
                    COUNT(*) as total_assignments,
                    COUNT(CASE WHEN ur.is_active = 1 THEN 1 END) as active_assignments,
                    COUNT(CASE WHEN ur.is_primary = 1 THEN 1 END) as primary_assignments,
                    COUNT(CASE WHEN ur.expires_at IS NOT NULL AND ur.expires_at > NOW() THEN 1 END) as expiring_assignments,
                    COUNT(CASE WHEN ur.expires_at IS NOT NULL AND ur.expires_at <= NOW() THEN 1 END) as expired_assignments
                FROM user_roles ur
                WHERE ${whereCondition}
            `;

      const [stats] = await executeQuery(query, queryParams);

      return {
        success: true,
        data: {
          user_id: userId,
          statistics: {
            total_assignments: parseInt(stats.total_assignments),
            active_assignments: parseInt(stats.active_assignments),
            primary_assignments: parseInt(stats.primary_assignments),
            expiring_assignments: parseInt(stats.expiring_assignments),
            expired_assignments: parseInt(stats.expired_assignments)
          }
        }
      };

    } catch (error) {
      console.error('Error in getRoleStats:', error);
      return {
        success: false,
        message: `Failed to get role statistics: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = UserRoleModel;
