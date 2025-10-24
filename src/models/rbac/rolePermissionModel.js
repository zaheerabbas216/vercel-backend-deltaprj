/**
 * File: src/models/rbac/rolePermissionModel.js
 * Role Permission Model - MySQL2 Database Operations
 *
 * This file handles the many-to-many relationship between roles and permissions.
 * It manages permission assignments to roles, inheritance, and expiration.
 *
 * For beginners:
 * - This is a "junction table" that connects roles with their permissions
 * - Each row represents one permission assigned to one role
 * - Roles can inherit permissions from parent roles automatically
 * - Permissions can have conditions and expiration dates
 */

const { executeQuery, executeTransaction } = require('../database');

/**
 * Role Permission Model Class
 * Contains all role-permission relationship database operations
 */
class RolePermissionModel {
  /**
     * Assign permission to role
     *
     * @param {Object} assignmentData - Assignment data
     * @returns {Promise<Object>} Created role-permission assignment
     */
  static async assignPermission(assignmentData) {
    try {
      const {
        roleId,
        permissionId,
        grantedBy = null,
        conditions = null,
        expiresAt = null,
        isInherited = false,
        inheritedFromRoleId = null
      } = assignmentData;

      // Check if assignment already exists
      const existingAssignment = await this.findByRoleAndPermission(roleId, permissionId);

      if (existingAssignment && existingAssignment.isActive) {
        throw new Error('Permission is already assigned to this role');
      }

      // If assignment exists but is inactive, reactivate it
      if (existingAssignment && !existingAssignment.isActive) {
        return await this.reactivateAssignment(existingAssignment.id, {
          grantedBy,
          conditions,
          expiresAt,
          isInherited,
          inheritedFromRoleId
        });
      }

      const insertQuery = `
        INSERT INTO role_permissions (
          role_id, permission_id, granted_by, granted_at, conditions,
          expires_at, is_active, is_inherited, inherited_from_role_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, NOW(), ?, ?, TRUE, ?, ?, NOW(), NOW())
      `;

      const conditionsJson = conditions ? JSON.stringify(conditions) : null;

      const insertParams = [
        roleId,
        permissionId,
        grantedBy,
        conditionsJson,
        expiresAt,
        isInherited,
        inheritedFromRoleId
      ];

      const result = await executeQuery(insertQuery, insertParams);

      // Update usage count for the permission
      await this._updatePermissionUsageCount(permissionId);

      // Get the created assignment
      const newAssignment = await this.findById(result.insertId);

      console.log(`✅ Permission ${permissionId} assigned to role ${roleId}`);
      return newAssignment;

    } catch (error) {
      console.error('❌ Error assigning permission to role:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Revoke permission from role
     *
     * @param {number} roleId - Role ID
     * @param {number} permissionId - Permission ID
     * @param {Object} revocationData - Revocation details
     * @returns {Promise<boolean>} Success status
     */
  static async revokePermission(roleId, permissionId, revocationData = {}) {
    try {
      const {
        revokedBy = null,
        revocationReason = 'manual_revocation'
      } = revocationData;

      const assignment = await this.findByRoleAndPermission(roleId, permissionId);

      if (!assignment) {
        throw new Error('Permission assignment not found');
      }

      if (!assignment.isActive) {
        throw new Error('Permission assignment is already inactive');
      }

      const revokeQuery = `
        UPDATE role_permissions 
        SET 
          is_active = FALSE,
          revoked_by = ?,
          revoked_at = NOW(),
          revocation_reason = ?,
          updated_at = NOW()
        WHERE role_id = ? AND permission_id = ? AND is_active = TRUE
      `;

      const result = await executeQuery(revokeQuery, [revokedBy, revocationReason, roleId, permissionId]);

      // Update usage count for the permission
      await this._updatePermissionUsageCount(permissionId);

      if (result.affectedRows > 0) {
        console.log(`✅ Permission ${permissionId} revoked from role ${roleId}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error revoking permission from role:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Find role-permission assignment by ID
     *
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Object|null>} Assignment object or null
     */
  static async findById(assignmentId) {
    try {
      const query = `
        SELECT 
          rp.id, rp.role_id, rp.permission_id, rp.granted_by, rp.granted_at,
          rp.conditions, rp.expires_at, rp.is_active, rp.is_inherited,
          rp.inherited_from_role_id, rp.revoked_by, rp.revoked_at,
          rp.revocation_reason, rp.created_at, rp.updated_at,
          r.name as role_name, r.display_name as role_display_name,
          p.name as permission_name, p.display_name as permission_display_name,
          p.module as permission_module, p.action as permission_action
        FROM role_permissions rp
        INNER JOIN roles r ON rp.role_id = r.id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.id = ?
      `;

      const results = await executeQuery(query, [assignmentId]);

      if (results.length === 0) {
        return null;
      }

      return this._formatAssignmentObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding role-permission assignment by ID:', error);
      throw new Error(`Failed to find assignment: ${error.message}`);
    }
  }

  /**
     * Find role-permission assignment by role and permission
     *
     * @param {number} roleId - Role ID
     * @param {number} permissionId - Permission ID
     * @returns {Promise<Object|null>} Assignment object or null
     */
  static async findByRoleAndPermission(roleId, permissionId) {
    try {
      const query = `
        SELECT 
          rp.id, rp.role_id, rp.permission_id, rp.granted_by, rp.granted_at,
          rp.conditions, rp.expires_at, rp.is_active, rp.is_inherited,
          rp.inherited_from_role_id, rp.revoked_by, rp.revoked_at,
          rp.revocation_reason, rp.created_at, rp.updated_at,
          r.name as role_name, r.display_name as role_display_name,
          p.name as permission_name, p.display_name as permission_display_name,
          p.module as permission_module, p.action as permission_action
        FROM role_permissions rp
        INNER JOIN roles r ON rp.role_id = r.id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND rp.permission_id = ?
        ORDER BY rp.created_at DESC
        LIMIT 1
      `;

      const results = await executeQuery(query, [roleId, permissionId]);

      if (results.length === 0) {
        return null;
      }

      return this._formatAssignmentObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding role-permission assignment:', error);
      throw new Error(`Failed to find assignment: ${error.message}`);
    }
  }

  /**
     * Get all permissions for a role
     *
     * @param {number} roleId - Role ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of permissions
     */
  static async getRolePermissions(roleId, options = {}) {
    try {
      const {
        includeInactive = false,
        includeExpired = false,
        includeInherited = true,
        sortBy = 'permission_module',
        sortOrder = 'ASC'
      } = options;

      let query = `
        SELECT 
          rp.id as assignment_id, rp.granted_at, rp.conditions, rp.expires_at,
          rp.is_active, rp.is_inherited, rp.inherited_from_role_id,
          p.id as permission_id, p.name as permission_name,
          p.display_name as permission_display_name, p.module as permission_module,
          p.action as permission_action, p.access_level, p.scope,
          ir.name as inherited_from_role_name
        FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        LEFT JOIN roles ir ON rp.inherited_from_role_id = ir.id
        WHERE rp.role_id = ? AND p.deleted_at IS NULL
      `;

      const params = [roleId];

      if (!includeInactive) {
        query += ' AND rp.is_active = TRUE';
      }

      if (!includeExpired) {
        query += ' AND (rp.expires_at IS NULL OR rp.expires_at > NOW())';
      }

      if (!includeInherited) {
        query += ' AND rp.is_inherited = FALSE';
      }

      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      const results = await executeQuery(query, params);

      return results.map(row => this._formatPermissionWithAssignment(row));

    } catch (error) {
      console.error('❌ Error getting role permissions:', error);
      throw new Error(`Failed to get role permissions: ${error.message}`);
    }
  }

  /**
     * Get all effective permissions for a role (including inherited)
     *
     * @param {number} roleId - Role ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of effective permissions
     */
  static async getEffectiveRolePermissions(roleId, options = {}) {
    try {
      const { includeExpired = false } = options;

      // Using recursive CTE to get all permissions from role hierarchy
      let query = `
        WITH RECURSIVE role_hierarchy AS (
          -- Base case: the role itself
          SELECT id, parent_role_id, name, 0 as level
          FROM roles 
          WHERE id = ? AND deleted_at IS NULL
          
          UNION ALL
          
          -- Recursive case: parent roles
          SELECT r.id, r.parent_role_id, r.name, rh.level + 1
          FROM roles r
          INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
          WHERE r.deleted_at IS NULL AND rh.level < 10
        )
        SELECT DISTINCT
          p.id as permission_id,
          p.name as permission_name,
          p.display_name as permission_display_name,
          p.module as permission_module,
          p.action as permission_action,
          p.access_level,
          p.scope,
          rp.conditions,
          rp.expires_at,
          rp.is_inherited,
          rp.inherited_from_role_id,
          rh.name as source_role_name,
          rh.level as inheritance_level
        FROM role_hierarchy rh
        INNER JOIN role_permissions rp ON rh.id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.is_active = TRUE 
          AND p.is_active = TRUE 
          AND p.deleted_at IS NULL
      `;

      const params = [roleId];

      if (!includeExpired) {
        query += ' AND (rp.expires_at IS NULL OR rp.expires_at > NOW())';
      }

      query += ' ORDER BY p.module, p.action';

      const results = await executeQuery(query, params);

      return results.map(row => this._formatEffectivePermission(row));

    } catch (error) {
      console.error('❌ Error getting effective role permissions:', error);
      throw new Error(`Failed to get effective permissions: ${error.message}`);
    }
  }

  /**
     * Get roles that have a specific permission
     *
     * @param {number} permissionId - Permission ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of roles
     */
  static async getPermissionRoles(permissionId, options = {}) {
    try {
      const {
        includeInactive = false,
        includeExpired = false,
        sortBy = 'role_name',
        sortOrder = 'ASC'
      } = options;

      let query = `
        SELECT 
          rp.id as assignment_id, rp.granted_at, rp.conditions, rp.expires_at,
          rp.is_active, rp.is_inherited,
          r.id as role_id, r.name as role_name, r.display_name as role_display_name,
          r.is_system_role, r.user_count
        FROM role_permissions rp
        INNER JOIN roles r ON rp.role_id = r.id
        WHERE rp.permission_id = ? AND r.deleted_at IS NULL
      `;

      const params = [permissionId];

      if (!includeInactive) {
        query += ' AND rp.is_active = TRUE AND r.is_active = TRUE';
      }

      if (!includeExpired) {
        query += ' AND (rp.expires_at IS NULL OR rp.expires_at > NOW())';
      }

      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      const results = await executeQuery(query, params);

      return results.map(row => this._formatRoleWithAssignment(row));

    } catch (error) {
      console.error('❌ Error getting permission roles:', error);
      throw new Error(`Failed to get permission roles: ${error.message}`);
    }
  }

  /**
     * Sync inherited permissions for a role
     *
     * @param {number} roleId - Role ID
     * @returns {Promise<Object>} Sync results
     */
  static async syncInheritedPermissions(roleId) {
    try {
      const syncResults = {
        added: 0,
        removed: 0,
        updated: 0
      };

      await executeTransaction(async (connection) => {
        // Remove existing inherited permissions
        const removeQuery = `
          DELETE FROM role_permissions 
          WHERE role_id = ? AND is_inherited = TRUE
        `;
        const removeResult = await connection.execute(removeQuery, [roleId]);
        syncResults.removed = removeResult[0].affectedRows;

        // Get role hierarchy (parent roles)
        const hierarchyQuery = `
          WITH RECURSIVE role_hierarchy AS (
            SELECT parent_role_id, 1 as level
            FROM roles 
            WHERE id = ? AND parent_role_id IS NOT NULL
            
            UNION ALL
            
            SELECT r.parent_role_id, rh.level + 1
            FROM roles r
            INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
            WHERE r.parent_role_id IS NOT NULL AND rh.level < 10
          )
          SELECT DISTINCT 
            rp.permission_id,
            rp.conditions,
            rp.expires_at,
            rp.role_id as inherited_from_role_id
          FROM role_hierarchy rh
          INNER JOIN role_permissions rp ON rh.parent_role_id = rp.role_id
          WHERE rp.is_active = TRUE 
            AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
        `;

        const hierarchyResult = await connection.execute(hierarchyQuery, [roleId]);
        const inheritablePermissions = hierarchyResult[0];

        // Add inherited permissions
        for (const inheritedPerm of inheritablePermissions) {
          // Check if permission is not already directly assigned
          const directAssignmentQuery = `
            SELECT COUNT(*) as count 
            FROM role_permissions 
            WHERE role_id = ? AND permission_id = ? AND is_inherited = FALSE AND is_active = TRUE
          `;
          const directResult = await connection.execute(directAssignmentQuery, [roleId, inheritedPerm.permission_id]);

          if (directResult[0][0].count === 0) {
            const insertQuery = `
              INSERT INTO role_permissions (
                role_id, permission_id, conditions, expires_at,
                is_inherited, inherited_from_role_id, granted_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, TRUE, ?, NOW(), NOW(), NOW())
            `;

            await connection.execute(insertQuery, [
              roleId,
              inheritedPerm.permission_id,
              inheritedPerm.conditions,
              inheritedPerm.expires_at,
              inheritedPerm.inherited_from_role_id
            ]);

            syncResults.added++;
          }
        }
      });

      console.log(`✅ Synced inherited permissions for role ${roleId}: +${syncResults.added}, -${syncResults.removed}`);
      return syncResults;

    } catch (error) {
      console.error('❌ Error syncing inherited permissions:', error);
      throw new Error(`Failed to sync inherited permissions: ${error.message}`);
    }
  }

  /**
     * Bulk assign permissions to role
     *
     * @param {number} roleId - Role ID
     * @param {Array} permissionIds - Array of permission IDs
     * @param {Object} assignmentData - Common assignment data
     * @returns {Promise<Object>} Bulk assignment results
     */
  static async bulkAssignPermissions(roleId, permissionIds, assignmentData = {}) {
    try {
      const {
        grantedBy = null,
        conditions = null,
        expiresAt = null
      } = assignmentData;

      const results = {
        assigned: 0,
        skipped: 0,
        errors: []
      };

      await executeTransaction(async (connection) => {
        for (const permissionId of permissionIds) {
          try {
            // Check if already assigned
            const existingQuery = `
              SELECT COUNT(*) as count 
              FROM role_permissions 
              WHERE role_id = ? AND permission_id = ? AND is_active = TRUE
            `;
            const existingResult = await connection.execute(existingQuery, [roleId, permissionId]);

            if (existingResult[0][0].count > 0) {
              results.skipped++;
              continue;
            }

            // Assign permission
            const insertQuery = `
              INSERT INTO role_permissions (
                role_id, permission_id, granted_by, conditions, expires_at,
                granted_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())
            `;

            const conditionsJson = conditions ? JSON.stringify(conditions) : null;

            await connection.execute(insertQuery, [
              roleId,
              permissionId,
              grantedBy,
              conditionsJson,
              expiresAt
            ]);

            results.assigned++;

          } catch (error) {
            results.errors.push({
              permissionId,
              error: error.message
            });
          }
        }

        // Update usage counts for all affected permissions
        if (results.assigned > 0) {
          const updateUsageQuery = `
            UPDATE permissions 
            SET usage_count = (
              SELECT COUNT(*) 
              FROM role_permissions 
              WHERE permission_id = permissions.id AND is_active = TRUE
            )
            WHERE id IN (${permissionIds.map(() => '?').join(',')})
          `;
          await connection.execute(updateUsageQuery, permissionIds);
        }
      });

      console.log(`✅ Bulk assigned permissions to role ${roleId}: ${results.assigned} assigned, ${results.skipped} skipped`);
      return results;

    } catch (error) {
      console.error('❌ Error bulk assigning permissions:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Clean up expired role-permission assignments
     *
     * @param {number} olderThanHours - Remove assignments older than X hours after expiration
     * @returns {Promise<number>} Number of cleaned assignments
     */
  static async cleanupExpiredAssignments(olderThanHours = 24) {
    try {
      // Mark expired assignments as inactive
      const expireQuery = `
        UPDATE role_permissions 
        SET 
          is_active = FALSE,
          revoked_at = NOW(),
          revocation_reason = 'expired',
          updated_at = NOW()
        WHERE is_active = TRUE 
          AND expires_at IS NOT NULL 
          AND expires_at < NOW()
      `;

      const expireResult = await executeQuery(expireQuery);
      console.log(`✅ Marked ${expireResult.affectedRows} expired role-permission assignments as inactive`);

      // Update usage counts for affected permissions
      if (expireResult.affectedRows > 0) {
        const updateUsageQuery = `
          UPDATE permissions p
          SET usage_count = (
            SELECT COUNT(*) 
            FROM role_permissions rp 
            WHERE rp.permission_id = p.id AND rp.is_active = TRUE
          )
        `;
        await executeQuery(updateUsageQuery);
      }

      return expireResult.affectedRows;

    } catch (error) {
      console.error('❌ Error cleaning up expired assignments:', error);
      throw new Error(`Failed to cleanup expired assignments: ${error.message}`);
    }
  }

  /**
     * Get role-permission assignment statistics
     *
     * @returns {Promise<Object>} Assignment statistics
     */
  static async getStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_assignments,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_assignments,
          SUM(CASE WHEN is_inherited = TRUE THEN 1 ELSE 0 END) as inherited_assignments,
          SUM(CASE WHEN expires_at IS NOT NULL THEN 1 ELSE 0 END) as temporary_assignments,
          SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 ELSE 0 END) as expired_assignments,
          COUNT(DISTINCT role_id) as roles_with_permissions,
          COUNT(DISTINCT permission_id) as permissions_in_use,
          AVG(
            CASE 
              WHEN expires_at IS NOT NULL 
              THEN TIMESTAMPDIFF(HOUR, granted_at, expires_at)
              ELSE NULL 
            END
          ) as avg_assignment_duration_hours
        FROM role_permissions
      `;

      const result = await executeQuery(query);

      return {
        ...result[0],
        avgAssignmentDurationHours: Math.round(result[0].avg_assignment_duration_hours || 0)
      };

    } catch (error) {
      console.error('❌ Error getting role-permission statistics:', error);
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
     * Reactivate an inactive assignment
     *
     * @private
     * @param {number} assignmentId - Assignment ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Reactivated assignment
     */
  static async reactivateAssignment(assignmentId, updateData) {
    try {
      const {
        grantedBy,
        conditions,
        expiresAt,
        isInherited,
        inheritedFromRoleId
      } = updateData;

      const updateQuery = `
        UPDATE role_permissions 
        SET 
          is_active = TRUE,
          granted_by = ?,
          granted_at = NOW(),
          conditions = ?,
          expires_at = ?,
          is_inherited = ?,
          inherited_from_role_id = ?,
          revoked_by = NULL,
          revoked_at = NULL,
          revocation_reason = NULL,
          updated_at = NOW()
        WHERE id = ?
      `;

      const conditionsJson = conditions ? JSON.stringify(conditions) : null;

      await executeQuery(updateQuery, [
        grantedBy,
        conditionsJson,
        expiresAt,
        isInherited,
        inheritedFromRoleId,
        assignmentId
      ]);

      const reactivatedAssignment = await this.findById(assignmentId);
      console.log(`✅ Reactivated role-permission assignment ${assignmentId}`);

      return reactivatedAssignment;

    } catch (error) {
      console.error('❌ Error reactivating assignment:', error);
      throw error;
    }
  }

  /**
     * Update permission usage count
     *
     * @private
     * @param {number} permissionId - Permission ID
     * @returns {Promise<void>}
     */
  static async _updatePermissionUsageCount(permissionId) {
    try {
      const query = `
        UPDATE permissions 
        SET 
          usage_count = (
            SELECT COUNT(*) 
            FROM role_permissions 
            WHERE permission_id = ? AND is_active = TRUE
          ),
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [permissionId, permissionId]);

    } catch (error) {
      console.error('❌ Error updating permission usage count:', error);
      // Don't throw - this is a helper operation
    }
  }

  /**
     * Format assignment object for consistent output
     *
     * @private
     * @param {Object} assignmentRow - Raw assignment data from database
     * @returns {Object} Formatted assignment object
     */
  static _formatAssignmentObject(assignmentRow) {
    return {
      id: assignmentRow.id,
      roleId: assignmentRow.role_id,
      permissionId: assignmentRow.permission_id,
      grantedBy: assignmentRow.granted_by,
      grantedAt: assignmentRow.granted_at,
      conditions: assignmentRow.conditions ? JSON.parse(assignmentRow.conditions) : null,
      expiresAt: assignmentRow.expires_at,
      isActive: Boolean(assignmentRow.is_active),
      isInherited: Boolean(assignmentRow.is_inherited),
      inheritedFromRoleId: assignmentRow.inherited_from_role_id,
      revokedBy: assignmentRow.revoked_by,
      revokedAt: assignmentRow.revoked_at,
      revocationReason: assignmentRow.revocation_reason,
      createdAt: assignmentRow.created_at,
      updatedAt: assignmentRow.updated_at,
      // Related objects
      role: assignmentRow.role_name ? {
        name: assignmentRow.role_name,
        displayName: assignmentRow.role_display_name
      } : null,
      permission: assignmentRow.permission_name ? {
        name: assignmentRow.permission_name,
        displayName: assignmentRow.permission_display_name,
        module: assignmentRow.permission_module,
        action: assignmentRow.permission_action
      } : null,
      // Calculated fields
      isExpired: assignmentRow.expires_at && new Date(assignmentRow.expires_at) < new Date(),
      hasConditions: assignmentRow.conditions !== null
    };
  }

  /**
     * Format permission with assignment details
     *
     * @private
     * @param {Object} row - Raw data from database
     * @returns {Object} Formatted permission with assignment
     */
  static _formatPermissionWithAssignment(row) {
    return {
      assignmentId: row.assignment_id,
      permissionId: row.permission_id,
      permissionName: row.permission_name,
      displayName: row.permission_display_name,
      module: row.permission_module,
      action: row.permission_action,
      accessLevel: row.access_level,
      scope: row.scope,
      grantedAt: row.granted_at,
      conditions: row.conditions ? JSON.parse(row.conditions) : null,
      expiresAt: row.expires_at,
      isActive: Boolean(row.is_active),
      isInherited: Boolean(row.is_inherited),
      inheritedFromRoleId: row.inherited_from_role_id,
      inheritedFromRoleName: row.inherited_from_role_name,
      // Calculated fields
      isExpired: row.expires_at && new Date(row.expires_at) < new Date()
    };
  }

  /**
     * Format role with assignment details
     *
     * @private
     * @param {Object} row - Raw data from database
     * @returns {Object} Formatted role with assignment
     */
  static _formatRoleWithAssignment(row) {
    return {
      assignmentId: row.assignment_id,
      roleId: row.role_id,
      roleName: row.role_name,
      displayName: row.role_display_name,
      isSystemRole: Boolean(row.is_system_role),
      userCount: row.user_count || 0,
      grantedAt: row.granted_at,
      conditions: row.conditions ? JSON.parse(row.conditions) : null,
      expiresAt: row.expires_at,
      isActive: Boolean(row.is_active),
      isInherited: Boolean(row.is_inherited),
      // Calculated fields
      isExpired: row.expires_at && new Date(row.expires_at) < new Date()
    };
  }

  /**
     * Format effective permission from hierarchy query
     *
     * @private
     * @param {Object} row - Raw data from database
     * @returns {Object} Formatted effective permission
     */
  static _formatEffectivePermission(row) {
    return {
      permissionId: row.permission_id,
      permissionName: row.permission_name,
      displayName: row.permission_display_name,
      module: row.permission_module,
      action: row.permission_action,
      accessLevel: row.access_level,
      scope: row.scope,
      conditions: row.conditions ? JSON.parse(row.conditions) : null,
      expiresAt: row.expires_at,
      isInherited: Boolean(row.is_inherited),
      inheritedFromRoleId: row.inherited_from_role_id,
      sourceRoleName: row.source_role_name,
      inheritanceLevel: row.inheritance_level,
      // Calculated fields
      isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
      isDirect: row.inheritance_level === 0
    };
  }
}

module.exports = RolePermissionModel;
