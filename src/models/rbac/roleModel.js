/**
 * File: src/models/rbac/roleModel.js
 * Role Model - MySQL2 Database Operations
 *
 * This file handles all database operations for the roles table.
 * It manages role creation, updates, hierarchy, and user assignments.
 *
 * For beginners:
 * - Roles represent different types of users (admin, manager, employee, etc.)
 * - Roles can have parent-child relationships (hierarchy)
 * - Each role can have a maximum number of users and usage tracking
 * - We prevent circular hierarchies and maintain data integrity
 */

const { executeQuery, executeTransaction } = require('../database');

/**
 * Role Model Class
 * Contains all role-related database operations
 */
class RoleModel {
  /**
     * Create a new role
     *
     * @param {Object} roleData - Role data to create
     * @returns {Promise<Object>} Created role object
     */
  static async create(roleData) {
    try {
      const {
        name,
        displayName,
        description = null,
        parentRoleId = null,
        isActive = true,
        isDefault = false,
        maxUsers = null,
        colorCode = null,
        icon = null,
        priority = 0,
        createdBy = null
      } = roleData;

      // Check if role name already exists
      const existingRole = await this.findByName(name);
      if (existingRole) {
        throw new Error('Role name already exists');
      }

      // Validate parent role if specified
      if (parentRoleId) {
        const parentRole = await this.findById(parentRoleId);
        if (!parentRole) {
          throw new Error('Parent role not found');
        }

        // Check for circular hierarchy (basic check)
        if (await this._wouldCreateCircularHierarchy(null, parentRoleId)) {
          throw new Error('Cannot create circular role hierarchy');
        }
      }

      // If this is set as default, remove default from other roles
      if (isDefault) {
        await this._removeDefaultFromOtherRoles();
      }

      const insertQuery = `
        INSERT INTO roles (
          name, display_name, description, parent_role_id,
          is_active, is_default, max_users, user_count,
          color_code, icon, priority, created_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NOW(), NOW())
      `;

      const insertParams = [
        name.toLowerCase(),
        displayName,
        description,
        parentRoleId,
        isActive,
        isDefault,
        maxUsers,
        colorCode,
        icon,
        priority,
        createdBy
      ];

      const result = await executeQuery(insertQuery, insertParams);

      // Get the newly created role
      const newRole = await this.findById(result.insertId);

      console.log(`✅ Role created: ${name} with ID: ${result.insertId}`);
      return newRole;

    } catch (error) {
      console.error('❌ Error creating role:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Find role by ID
     *
     * @param {number} roleId - Role ID
     * @param {Object} options - Query options
     * @returns {Promise<Object|null>} Role object or null
     */
  static async findById(roleId, options = {}) {
    try {
      const { includeParent = false, includeChildren = false } = options;

      const query = `
        SELECT 
          r.id, r.name, r.display_name, r.description, r.parent_role_id,
          r.is_system_role, r.is_active, r.is_default, r.max_users, r.user_count,
          r.color_code, r.icon, r.priority, r.deleted_at,
          r.created_at, r.updated_at, r.created_by, r.updated_by
        FROM roles r
        WHERE r.id = ? AND r.deleted_at IS NULL
      `;

      const results = await executeQuery(query, [roleId]);

      if (results.length === 0) {
        return null;
      }

      const role = this._formatRoleObject(results[0]);

      // Include parent role if requested
      if (includeParent && role.parentRoleId) {
        const parentRole = await this.findById(role.parentRoleId);
        role.parentRole = parentRole;
      }

      // Include child roles if requested
      if (includeChildren) {
        const childRoles = await this.findByParentId(role.id);
        role.childRoles = childRoles;
      }

      return role;

    } catch (error) {
      console.error('❌ Error finding role by ID:', error);
      throw new Error(`Failed to find role: ${error.message}`);
    }
  }

  /**
     * Find role by name
     *
     * @param {string} name - Role name
     * @returns {Promise<Object|null>} Role object or null
     */
  static async findByName(name) {
    try {
      const query = `
        SELECT 
          id, name, display_name, description, parent_role_id,
          is_system_role, is_active, is_default, max_users, user_count,
          color_code, icon, priority, deleted_at,
          created_at, updated_at, created_by, updated_by
        FROM roles 
        WHERE name = ? AND deleted_at IS NULL
      `;

      const results = await executeQuery(query, [name.toLowerCase()]);

      if (results.length === 0) {
        return null;
      }

      return this._formatRoleObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding role by name:', error);
      throw new Error(`Failed to find role: ${error.message}`);
    }
  }

  /**
     * Find child roles by parent ID
     *
     * @param {number} parentRoleId - Parent role ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of child roles
     */
  static async findByParentId(parentRoleId, options = {}) {
    try {
      const {
        includeInactive = false,
        sortBy = 'priority',
        sortOrder = 'DESC'
      } = options;

      let query = `
        SELECT 
          id, name, display_name, description, parent_role_id,
          is_system_role, is_active, is_default, max_users, user_count,
          color_code, icon, priority,
          created_at, updated_at
        FROM roles 
        WHERE parent_role_id = ? AND deleted_at IS NULL
      `;

      const params = [parentRoleId];

      if (!includeInactive) {
        query += ' AND is_active = TRUE';
      }

      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      const results = await executeQuery(query, params);

      return results.map(role => this._formatRoleObject(role));

    } catch (error) {
      console.error('❌ Error finding child roles:', error);
      throw new Error(`Failed to find child roles: ${error.message}`);
    }
  }

  /**
     * Get role hierarchy (all parent roles up to root)
     *
     * @param {number} roleId - Role ID
     * @returns {Promise<Array>} Array of roles from current to root
     */
  static async getRoleHierarchy(roleId) {
    try {
      const hierarchy = [];
      let currentRoleId = roleId;
      let depth = 0;
      const maxDepth = 10; // Prevent infinite loops

      while (currentRoleId && depth < maxDepth) {
        const role = await this.findById(currentRoleId);

        if (!role) {
          break;
        }

        hierarchy.push(role);
        currentRoleId = role.parentRoleId;
        depth++;
      }

      return hierarchy;

    } catch (error) {
      console.error('❌ Error getting role hierarchy:', error);
      throw new Error(`Failed to get role hierarchy: ${error.message}`);
    }
  }

  /**
     * Update role
     *
     * @param {number} roleId - Role ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>} Updated role object
     */
  static async update(roleId, updateData) {
    try {
      const allowedFields = [
        'display_name', 'description', 'parent_role_id', 'is_active',
        'is_default', 'max_users', 'color_code', 'icon', 'priority', 'updated_by'
      ];

      // Filter only allowed fields
      const updateFields = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          updateFields[key] = updateData[key];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Special validations
      if (updateFields.parent_role_id !== undefined) {
        if (updateFields.parent_role_id === roleId) {
          throw new Error('Role cannot be its own parent');
        }

        if (updateFields.parent_role_id && await this._wouldCreateCircularHierarchy(roleId, updateFields.parent_role_id)) {
          throw new Error('Cannot create circular role hierarchy');
        }
      }

      // Check max users constraint
      if (updateFields.max_users !== undefined) {
        const currentRole = await this.findById(roleId);
        if (updateFields.max_users !== null && currentRole.userCount > updateFields.max_users) {
          throw new Error('Cannot set max users below current user count');
        }
      }

      // If setting as default, remove default from other roles
      if (updateFields.is_default === true) {
        await this._removeDefaultFromOtherRoles(roleId);
      }

      // Build update query dynamically
      const setClause = Object.keys(updateFields)
        .map(field => `${field} = ?`)
        .join(', ');

      const query = `
        UPDATE roles 
        SET ${setClause}, updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      const params = [...Object.values(updateFields), roleId];
      const result = await executeQuery(query, params);

      if (result.affectedRows === 0) {
        return null; // Role not found
      }

      // Return updated role
      return await this.findById(roleId);

    } catch (error) {
      console.error('❌ Error updating role:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Soft delete role
     *
     * @param {number} roleId - Role ID
     * @param {Object} options - Deletion options
     * @returns {Promise<boolean>} Success status
     */
  static async delete(roleId, options = {}) {
    try {
      const {
        replacementRoleId = null,
        deletedBy = null,
        force = false
      } = options;

      const role = await this.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Prevent deletion of system roles
      if (role.isSystemRole && !force) {
        throw new Error('Cannot delete system roles');
      }

      // Check if role has users assigned
      if (role.userCount > 0 && !replacementRoleId && !force) {
        throw new Error('Cannot delete role with assigned users. Provide a replacement role or use force delete.');
      }

      await executeTransaction(async (connection) => {
        // If replacement role specified, reassign users
        if (replacementRoleId && role.userCount > 0) {
          const reassignQuery = `
            UPDATE user_roles 
            SET role_id = ?, updated_at = NOW()
            WHERE role_id = ? AND is_active = TRUE
          `;
          await connection.execute(reassignQuery, [replacementRoleId, roleId]);

          // Update user counts
          await this._updateUserCount(replacementRoleId, connection);
        }

        // Update child roles to have no parent
        const orphanChildrenQuery = `
          UPDATE roles 
          SET parent_role_id = NULL, updated_at = NOW()
          WHERE parent_role_id = ?
        `;
        await connection.execute(orphanChildrenQuery, [roleId]);

        // Soft delete the role
        const deleteQuery = `
          UPDATE roles 
          SET 
            deleted_at = NOW(),
            is_active = FALSE,
            name = CONCAT(name, '_deleted_', UNIX_TIMESTAMP()),
            updated_by = ?,
            updated_at = NOW()
          WHERE id = ?
        `;
        await connection.execute(deleteQuery, [deletedBy, roleId]);
      });

      console.log(`✅ Role ${role.name} soft deleted`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting role:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Search roles with filters and pagination
     *
     * @param {Object} filters - Search filters
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Search results with pagination info
     */
  static async search(filters = {}, pagination = {}) {
    try {
      const {
        search = '',
        isActive = null,
        isSystemRole = null,
        isDefault = null,
        parentRoleId = null,
        hasUsers = null
      } = filters;

      const {
        page = 1,
        pageSize = 10,
        sortBy = 'priority',
        sortOrder = 'DESC',
        includeUserCount = true
      } = pagination;

      // Build WHERE conditions
      const conditions = ['deleted_at IS NULL'];
      const params = [];

      if (search) {
        conditions.push('(name LIKE ? OR display_name LIKE ? OR description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (isActive !== null) {
        conditions.push('is_active = ?');
        params.push(isActive);
      }

      if (isSystemRole !== null) {
        conditions.push('is_system_role = ?');
        params.push(isSystemRole);
      }

      if (isDefault !== null) {
        conditions.push('is_default = ?');
        params.push(isDefault);
      }

      if (parentRoleId !== null) {
        if (parentRoleId === 0) {
          conditions.push('parent_role_id IS NULL');
        } else {
          conditions.push('parent_role_id = ?');
          params.push(parentRoleId);
        }
      }

      if (hasUsers !== null) {
        if (hasUsers) {
          conditions.push('user_count > 0');
        } else {
          conditions.push('user_count = 0');
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM roles ${whereClause}`;
      const countResult = await executeQuery(countQuery, params);
      const totalRecords = countResult[0].total;

      // Calculate pagination
      const offset = (page - 1) * pageSize;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Get paginated results
      const selectFields = includeUserCount
        ? 'id, name, display_name, description, parent_role_id, is_system_role, is_active, is_default, max_users, user_count, color_code, icon, priority, created_at, updated_at'
        : 'id, name, display_name, description, parent_role_id, is_system_role, is_active, is_default, max_users, color_code, icon, priority, created_at, updated_at';

      const query = `
        SELECT ${selectFields}
        FROM roles 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const results = await executeQuery(query, [...params, pageSize, offset]);

      return {
        data: results.map(role => this._formatRoleObject(role)),
        pagination: {
          currentPage: page,
          pageSize,
          totalPages,
          totalRecords,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      console.error('❌ Error searching roles:', error);
      throw new Error(`Failed to search roles: ${error.message}`);
    }
  }

  /**
     * Get default role
     *
     * @returns {Promise<Object|null>} Default role or null
     */
  static async getDefaultRole() {
    try {
      const query = `
        SELECT 
          id, name, display_name, description, parent_role_id,
          is_system_role, is_active, is_default, max_users, user_count,
          color_code, icon, priority,
          created_at, updated_at
        FROM roles 
        WHERE is_default = TRUE AND is_active = TRUE AND deleted_at IS NULL
        LIMIT 1
      `;

      const results = await executeQuery(query);

      if (results.length === 0) {
        return null;
      }

      return this._formatRoleObject(results[0]);

    } catch (error) {
      console.error('❌ Error getting default role:', error);
      throw new Error(`Failed to get default role: ${error.message}`);
    }
  }

  /**
     * Update user count for a role
     *
     * @param {number} roleId - Role ID
     * @param {Object} connection - Database connection (optional, for transactions)
     * @returns {Promise<boolean>} Success status
     */
  static async updateUserCount(roleId, connection = null) {
    return this._updateUserCount(roleId, connection);
  }

  /**
     * Get role statistics
     *
     * @returns {Promise<Object>} Role statistics
     */
  static async getStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_roles,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_roles,
          SUM(CASE WHEN is_system_role = TRUE THEN 1 ELSE 0 END) as system_roles,
          SUM(CASE WHEN is_default = TRUE THEN 1 ELSE 0 END) as default_roles,
          SUM(CASE WHEN parent_role_id IS NULL THEN 1 ELSE 0 END) as root_roles,
          SUM(CASE WHEN user_count > 0 THEN 1 ELSE 0 END) as roles_with_users,
          SUM(user_count) as total_user_assignments,
          AVG(user_count) as avg_users_per_role,
          MAX(user_count) as max_users_in_role
        FROM roles 
        WHERE deleted_at IS NULL
      `;

      const result = await executeQuery(query);
      return {
        ...result[0],
        avgUsersPerRole: parseFloat((result[0].avg_users_per_role || 0).toFixed(2))
      };

    } catch (error) {
      console.error('❌ Error getting role statistics:', error);
      throw new Error(`Failed to get role statistics: ${error.message}`);
    }
  }

  /**
     * Check if role hierarchy would be circular
     *
     * @private
     * @param {number} childRoleId - Child role ID
     * @param {number} parentRoleId - Parent role ID
     * @returns {Promise<boolean>} True if circular
     */
  static async _wouldCreateCircularHierarchy(childRoleId, parentRoleId) {
    try {
      if (!parentRoleId) return false;

      // Get hierarchy of potential parent
      const parentHierarchy = await this.getRoleHierarchy(parentRoleId);

      // Check if child role appears in parent's hierarchy
      return parentHierarchy.some(role => role.id === childRoleId);

    } catch (error) {
      console.error('❌ Error checking circular hierarchy:', error);
      return false; // Allow operation on error
    }
  }

  /**
     * Remove default flag from other roles
     *
     * @private
     * @param {number} excludeRoleId - Role ID to exclude from update
     * @returns {Promise<void>}
     */
  static async _removeDefaultFromOtherRoles(excludeRoleId = null) {
    try {
      let query = 'UPDATE roles SET is_default = FALSE, updated_at = NOW() WHERE is_default = TRUE';
      const params = [];

      if (excludeRoleId) {
        query += ' AND id != ?';
        params.push(excludeRoleId);
      }

      await executeQuery(query, params);

    } catch (error) {
      console.error('❌ Error removing default from other roles:', error);
      // Don't throw - this is a helper operation
    }
  }

  /**
     * Update user count for a role
     *
     * @private
     * @param {number} roleId - Role ID
     * @param {Object} connection - Database connection (optional)
     * @returns {Promise<boolean>} Success status
     */
  static async _updateUserCount(roleId, connection = null) {
    try {
      const query = `
        UPDATE roles 
        SET 
          user_count = (
            SELECT COUNT(*) 
            FROM user_roles 
            WHERE role_id = ? AND is_active = TRUE
          ),
          updated_at = NOW()
        WHERE id = ?
      `;

      if (connection) {
        await connection.execute(query, [roleId, roleId]);
      } else {
        await executeQuery(query, [roleId, roleId]);
      }

      return true;

    } catch (error) {
      console.error('❌ Error updating user count:', error);
      return false;
    }
  }

  /**
     * Format role object for consistent output
     *
     * @private
     * @param {Object} roleRow - Raw role data from database
     * @returns {Object} Formatted role object
     */
  static _formatRoleObject(roleRow) {
    return {
      id: roleRow.id,
      name: roleRow.name,
      displayName: roleRow.display_name,
      description: roleRow.description,
      parentRoleId: roleRow.parent_role_id,
      isSystemRole: Boolean(roleRow.is_system_role),
      isActive: Boolean(roleRow.is_active),
      isDefault: Boolean(roleRow.is_default),
      maxUsers: roleRow.max_users,
      userCount: roleRow.user_count || 0,
      colorCode: roleRow.color_code,
      icon: roleRow.icon,
      priority: roleRow.priority || 0,
      deletedAt: roleRow.deleted_at,
      createdAt: roleRow.created_at,
      updatedAt: roleRow.updated_at,
      createdBy: roleRow.created_by,
      updatedBy: roleRow.updated_by,
      // Calculated fields
      hasCapacityLimit: roleRow.max_users !== null,
      isAtCapacity: roleRow.max_users !== null && roleRow.user_count >= roleRow.max_users,
      availableSlots: roleRow.max_users !== null ? Math.max(0, roleRow.max_users - (roleRow.user_count || 0)) : null
    };
  }
}

module.exports = RoleModel;
