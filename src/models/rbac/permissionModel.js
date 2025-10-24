/**
 * File: src/models/rbac/permissionModel.js
 * Permission Model - MySQL2 Database Operations
 *
 * This file handles all database operations for the permissions table.
 * It manages permission creation, updates, dependencies, and usage tracking.
 *
 * For beginners:
 * - Permissions are specific actions users can perform (users.create, posts.edit, etc.)
 * - Each permission follows module.action naming convention
 * - Permissions can depend on other permissions (hierarchical access)
 * - We track which roles use each permission for management and cleanup
 */

const { executeQuery, executeTransaction } = require('../database');

/**
 * Permission Model Class
 * Contains all permission-related database operations
 */
class PermissionModel {
  /**
     * Create a new permission
     *
     * @param {Object} permissionData - Permission data to create
     * @returns {Promise<Object>} Created permission object
     */
  static async create(permissionData) {
    try {
      const {
        name,
        displayName,
        description = null,
        module,
        action,
        resource = null,
        isActive = true,
        groupName = null,
        sortOrder = 0,
        icon = null,
        colorCode = null,
        accessLevel = 'basic',
        scope = 'own',
        requiresPermissions = null,
        createdBy = null
      } = permissionData;

      // Validate permission name format (module.action)
      if (!this._isValidPermissionName(name)) {
        throw new Error('Permission name must follow format: module.action');
      }

      // Check if permission already exists
      const existingPermission = await this.findByName(name);
      if (existingPermission) {
        throw new Error('Permission name already exists');
      }

      // Validate module and action match the name
      const nameParts = name.split('.');
      if (nameParts[0] !== module || nameParts[1] !== action) {
        throw new Error('Module and action must match the permission name');
      }

      const insertQuery = `
        INSERT INTO permissions (
          name, display_name, description, module, action, resource,
          is_active, group_name, sort_order, icon, color_code,
          access_level, scope, requires_permissions, usage_count,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())
      `;

      const requiresPermissionsJson = requiresPermissions ? JSON.stringify(requiresPermissions) : null;

      const insertParams = [
        name.toLowerCase(),
        displayName,
        description,
        module.toLowerCase(),
        action.toLowerCase(),
        resource,
        isActive,
        groupName,
        sortOrder,
        icon,
        colorCode,
        accessLevel,
        scope,
        requiresPermissionsJson,
        createdBy
      ];

      const result = await executeQuery(insertQuery, insertParams);

      // Get the newly created permission
      const newPermission = await this.findById(result.insertId);

      console.log(`✅ Permission created: ${name} with ID: ${result.insertId}`);
      return newPermission;

    } catch (error) {
      console.error('❌ Error creating permission:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Find permission by ID
     *
     * @param {number} permissionId - Permission ID
     * @returns {Promise<Object|null>} Permission object or null
     */
  static async findById(permissionId) {
    try {
      const query = `
        SELECT 
          id, name, display_name, description, module, action, resource,
          is_system_permission, is_active, group_name, sort_order,
          icon, color_code, access_level, scope, requires_permissions,
          usage_count, deleted_at, created_at, updated_at, created_by, updated_by
        FROM permissions 
        WHERE id = ? AND deleted_at IS NULL
      `;

      const results = await executeQuery(query, [permissionId]);

      if (results.length === 0) {
        return null;
      }

      return this._formatPermissionObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding permission by ID:', error);
      throw new Error(`Failed to find permission: ${error.message}`);
    }
  }

  /**
     * Find permission by name
     *
     * @param {string} name - Permission name
     * @returns {Promise<Object|null>} Permission object or null
     */
  static async findByName(name) {
    try {
      const query = `
        SELECT 
          id, name, display_name, description, module, action, resource,
          is_system_permission, is_active, group_name, sort_order,
          icon, color_code, access_level, scope, requires_permissions,
          usage_count, deleted_at, created_at, updated_at, created_by, updated_by
        FROM permissions 
        WHERE name = ? AND deleted_at IS NULL
      `;

      const results = await executeQuery(query, [name.toLowerCase()]);

      if (results.length === 0) {
        return null;
      }

      return this._formatPermissionObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding permission by name:', error);
      throw new Error(`Failed to find permission: ${error.message}`);
    }
  }

  /**
     * Find permissions by module
     *
     * @param {string} module - Module name
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of permissions
     */
  static async findByModule(module, options = {}) {
    try {
      const {
        includeInactive = false,
        sortBy = 'sort_order',
        sortOrder = 'ASC'
      } = options;

      let query = `
        SELECT 
          id, name, display_name, description, module, action, resource,
          is_system_permission, is_active, group_name, sort_order,
          icon, color_code, access_level, scope, requires_permissions,
          usage_count, created_at, updated_at
        FROM permissions 
        WHERE module = ? AND deleted_at IS NULL
      `;

      const params = [module.toLowerCase()];

      if (!includeInactive) {
        query += ' AND is_active = TRUE';
      }

      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      const results = await executeQuery(query, params);

      return results.map(permission => this._formatPermissionObject(permission));

    } catch (error) {
      console.error('❌ Error finding permissions by module:', error);
      throw new Error(`Failed to find permissions by module: ${error.message}`);
    }
  }

  /**
     * Get permissions grouped by module
     *
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Permissions grouped by module
     */
  static async getGroupedByModule(options = {}) {
    try {
      const { includeInactive = false } = options;

      let query = `
        SELECT 
          module,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', id,
              'name', name,
              'displayName', display_name,
              'action', action,
              'accessLevel', access_level,
              'scope', scope,
              'usageCount', usage_count,
              'isActive', is_active
            )
          ) as permissions
        FROM permissions 
        WHERE deleted_at IS NULL
      `;

      const params = [];

      if (!includeInactive) {
        query += ' AND is_active = TRUE';
      }

      query += ' GROUP BY module ORDER BY module';

      const results = await executeQuery(query, params);

      // Convert to object with module as key
      const grouped = {};
      results.forEach(row => {
        grouped[row.module] = JSON.parse(row.permissions);
      });

      return grouped;

    } catch (error) {
      console.error('❌ Error getting permissions grouped by module:', error);
      throw new Error(`Failed to get grouped permissions: ${error.message}`);
    }
  }

  /**
     * Update permission
     *
     * @param {number} permissionId - Permission ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>} Updated permission object
     */
  static async update(permissionId, updateData) {
    try {
      const allowedFields = [
        'display_name', 'description', 'is_active', 'group_name', 'sort_order',
        'icon', 'color_code', 'access_level', 'scope', 'requires_permissions', 'updated_by'
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

      // Convert requires_permissions array to JSON string if provided
      if (updateFields.requires_permissions) {
        updateFields.requires_permissions = JSON.stringify(updateFields.requires_permissions);
      }

      // Build update query dynamically
      const setClause = Object.keys(updateFields)
        .map(field => `${field} = ?`)
        .join(', ');

      const query = `
        UPDATE permissions 
        SET ${setClause}, updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      const params = [...Object.values(updateFields), permissionId];
      const result = await executeQuery(query, params);

      if (result.affectedRows === 0) {
        return null; // Permission not found
      }

      // Return updated permission
      return await this.findById(permissionId);

    } catch (error) {
      console.error('❌ Error updating permission:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Soft delete permission
     *
     * @param {number} permissionId - Permission ID
     * @param {Object} options - Deletion options
     * @returns {Promise<boolean>} Success status
     */
  static async delete(permissionId, options = {}) {
    try {
      const {
        deletedBy = null,
        force = false
      } = options;

      const permission = await this.findById(permissionId);
      if (!permission) {
        throw new Error('Permission not found');
      }

      // Prevent deletion of system permissions
      if (permission.isSystemPermission && !force) {
        throw new Error('Cannot delete system permissions');
      }

      // Check if permission is in use
      if (permission.usageCount > 0 && !force) {
        throw new Error('Cannot delete permission that is assigned to roles. Remove from roles first or use force delete.');
      }

      await executeTransaction(async (connection) => {
        // Remove permission from all roles if force delete
        if (force && permission.usageCount > 0) {
          const removeQuery = `
            UPDATE role_permissions 
            SET is_active = FALSE, revoked_at = NOW(), revoked_reason = 'permission_deleted'
            WHERE permission_id = ? AND is_active = TRUE
          `;
          await connection.execute(removeQuery, [permissionId]);
        }

        // Soft delete the permission
        const deleteQuery = `
          UPDATE permissions 
          SET 
            deleted_at = NOW(),
            is_active = FALSE,
            name = CONCAT(name, '_deleted_', UNIX_TIMESTAMP()),
            updated_by = ?,
            updated_at = NOW()
          WHERE id = ?
        `;
        await connection.execute(deleteQuery, [deletedBy, permissionId]);
      });

      console.log(`✅ Permission ${permission.name} soft deleted`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting permission:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Search permissions with filters and pagination
     *
     * @param {Object} filters - Search filters
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Search results with pagination info
     */
  static async search(filters = {}, pagination = {}) {
    try {
      const {
        search = '',
        module = null,
        action = null,
        accessLevel = null,
        scope = null,
        groupName = null,
        isActive = null,
        isSystemPermission = null,
        hasUsage = null
      } = filters;

      const {
        page = 1,
        pageSize = 10,
        sortBy = 'module',
        sortOrder = 'ASC',
        groupBy = null
      } = pagination;

      // Build WHERE conditions
      const conditions = ['deleted_at IS NULL'];
      const params = [];

      if (search) {
        conditions.push('(name LIKE ? OR display_name LIKE ? OR description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (module) {
        conditions.push('module = ?');
        params.push(module.toLowerCase());
      }

      if (action) {
        conditions.push('action = ?');
        params.push(action.toLowerCase());
      }

      if (accessLevel) {
        conditions.push('access_level = ?');
        params.push(accessLevel);
      }

      if (scope) {
        conditions.push('scope = ?');
        params.push(scope);
      }

      if (groupName) {
        conditions.push('group_name = ?');
        params.push(groupName);
      }

      if (isActive !== null) {
        conditions.push('is_active = ?');
        params.push(isActive);
      }

      if (isSystemPermission !== null) {
        conditions.push('is_system_permission = ?');
        params.push(isSystemPermission);
      }

      if (hasUsage !== null) {
        if (hasUsage) {
          conditions.push('usage_count > 0');
        } else {
          conditions.push('usage_count = 0');
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM permissions ${whereClause}`;
      const countResult = await executeQuery(countQuery, params);
      const totalRecords = countResult[0].total;

      // Calculate pagination
      const offset = (page - 1) * pageSize;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Get paginated results
      let query = `
        SELECT 
          id, name, display_name, description, module, action, resource,
          is_system_permission, is_active, group_name, sort_order,
          icon, color_code, access_level, scope, requires_permissions,
          usage_count, created_at, updated_at
        FROM permissions 
        ${whereClause}
      `;

      // Handle grouping
      if (groupBy === 'module') {
        query += ' ORDER BY module, sort_order, name';
      } else if (groupBy === 'group') {
        query += ' ORDER BY group_name, sort_order, name';
      } else {
        query += ` ORDER BY ${sortBy} ${sortOrder}`;
      }

      query += ' LIMIT ? OFFSET ?';

      const results = await executeQuery(query, [...params, pageSize, offset]);

      let data = results.map(permission => this._formatPermissionObject(permission));

      // Group results if requested
      if (groupBy === 'module') {
        data = this._groupPermissionsByModule(data);
      } else if (groupBy === 'group') {
        data = this._groupPermissionsByGroup(data);
      }

      return {
        data,
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
      console.error('❌ Error searching permissions:', error);
      throw new Error(`Failed to search permissions: ${error.message}`);
    }
  }

  /**
     * Create bulk permissions for a module
     *
     * @param {Object} moduleData - Module information and permissions to create
     * @returns {Promise<Array>} Array of created permissions
     */
  static async createBulkForModule(moduleData) {
    try {
      const {
        moduleName,
        moduleDisplayName,
        permissions = [],
        defaultAccessLevel = 'basic',
        defaultScope = 'own',
        createdBy = null
      } = moduleData;

      if (permissions.length === 0) {
        throw new Error('No permissions specified');
      }

      const createdPermissions = [];

      await executeTransaction(async (connection) => {
        for (const permissionData of permissions) {
          const {
            action,
            displayName = null,
            description = null,
            accessLevel = defaultAccessLevel,
            scope = defaultScope,
            sortOrder = 0
          } = permissionData;

          const permissionName = `${moduleName.toLowerCase()}.${action.toLowerCase()}`;
          const finalDisplayName = displayName || `${action.charAt(0).toUpperCase() + action.slice(1)} ${moduleDisplayName}`;

          const insertQuery = `
            INSERT INTO permissions (
              name, display_name, description, module, action,
              access_level, scope, sort_order, group_name, usage_count,
              created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())
          `;

          const insertParams = [
            permissionName,
            finalDisplayName,
            description,
            moduleName.toLowerCase(),
            action.toLowerCase(),
            accessLevel,
            scope,
            sortOrder,
                        `${moduleDisplayName} Management`,
                        createdBy
          ];

          const result = await connection.execute(insertQuery, insertParams);

          // Get the created permission
          const newPermissionQuery = `SELECT * FROM permissions WHERE id = ?`;
          const newPermissionResult = await connection.execute(newPermissionQuery, [result[0].insertId]);

          if (newPermissionResult[0].length > 0) {
            createdPermissions.push(this._formatPermissionObject(newPermissionResult[0][0]));
          }
        }
      });

      console.log(`✅ Created ${createdPermissions.length} permissions for module: ${moduleName}`);
      return createdPermissions;

    } catch (error) {
      console.error('❌ Error creating bulk permissions:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Update usage count for a permission
     *
     * @param {number} permissionId - Permission ID
     * @param {Object} connection - Database connection (optional, for transactions)
     * @returns {Promise<boolean>} Success status
     */
  static async updateUsageCount(permissionId, connection = null) {
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

      if (connection) {
        await connection.execute(query, [permissionId, permissionId]);
      } else {
        await executeQuery(query, [permissionId, permissionId]);
      }

      return true;

    } catch (error) {
      console.error('❌ Error updating permission usage count:', error);
      return false;
    }
  }

  /**
     * Get permission statistics
     *
     * @returns {Promise<Object>} Permission statistics
     */
  static async getStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_permissions,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_permissions,
          SUM(CASE WHEN is_system_permission = TRUE THEN 1 ELSE 0 END) as system_permissions,
          SUM(CASE WHEN usage_count > 0 THEN 1 ELSE 0 END) as permissions_in_use,
          COUNT(DISTINCT module) as unique_modules,
          COUNT(DISTINCT group_name) as unique_groups,
          SUM(usage_count) as total_role_assignments,
          AVG(usage_count) as avg_usage_per_permission,
          MAX(usage_count) as max_usage_count
        FROM permissions 
        WHERE deleted_at IS NULL
      `;

      const result = await executeQuery(query);

      // Get module breakdown
      const moduleQuery = `
        SELECT 
          module,
          COUNT(*) as permission_count,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count,
          SUM(usage_count) as total_usage
        FROM permissions 
        WHERE deleted_at IS NULL
        GROUP BY module
        ORDER BY permission_count DESC
      `;

      const moduleResult = await executeQuery(moduleQuery);

      return {
        ...result[0],
        avgUsagePerPermission: parseFloat((result[0].avg_usage_per_permission || 0).toFixed(2)),
        moduleBreakdown: moduleResult
      };

    } catch (error) {
      console.error('❌ Error getting permission statistics:', error);
      throw new Error(`Failed to get permission statistics: ${error.message}`);
    }
  }

  /**
     * Get unused permissions (not assigned to any role)
     *
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of unused permissions
     */
  static async getUnusedPermissions(options = {}) {
    try {
      const {
        includeSystemPermissions = false,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        limit = 50
      } = options;

      let query = `
        SELECT 
          id, name, display_name, module, action, access_level,
          is_system_permission, created_at
        FROM permissions 
        WHERE usage_count = 0 
        AND is_active = TRUE 
        AND deleted_at IS NULL
      `;

      const params = [];

      if (!includeSystemPermissions) {
        query += ' AND is_system_permission = FALSE';
      }

      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const results = await executeQuery(query, params);

      return results.map(permission => this._formatPermissionObject(permission));

    } catch (error) {
      console.error('❌ Error getting unused permissions:', error);
      throw new Error(`Failed to get unused permissions: ${error.message}`);
    }
  }

  /**
     * Validate permission name format
     *
     * @private
     * @param {string} name - Permission name to validate
     * @returns {boolean} True if valid format
     */
  static _isValidPermissionName(name) {
    if (!name || typeof name !== 'string') return false;

    const regex = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
    return regex.test(name.toLowerCase());
  }

  /**
     * Group permissions by module
     *
     * @private
     * @param {Array} permissions - Array of permission objects
     * @returns {Object} Permissions grouped by module
     */
  static _groupPermissionsByModule(permissions) {
    return permissions.reduce((groups, permission) => {
      const module = permission.module;
      if (!groups[module]) {
        groups[module] = [];
      }
      groups[module].push(permission);
      return groups;
    }, {});
  }

  /**
     * Group permissions by group name
     *
     * @private
     * @param {Array} permissions - Array of permission objects
     * @returns {Object} Permissions grouped by group name
     */
  static _groupPermissionsByGroup(permissions) {
    return permissions.reduce((groups, permission) => {
      const groupName = permission.groupName || 'Ungrouped';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(permission);
      return groups;
    }, {});
  }

  /**
     * Format permission object for consistent output
     *
     * @private
     * @param {Object} permissionRow - Raw permission data from database
     * @returns {Object} Formatted permission object
     */
  static _formatPermissionObject(permissionRow) {
    return {
      id: permissionRow.id,
      name: permissionRow.name,
      displayName: permissionRow.display_name,
      description: permissionRow.description,
      module: permissionRow.module,
      action: permissionRow.action,
      resource: permissionRow.resource,
      isSystemPermission: Boolean(permissionRow.is_system_permission),
      isActive: Boolean(permissionRow.is_active),
      groupName: permissionRow.group_name,
      sortOrder: permissionRow.sort_order || 0,
      icon: permissionRow.icon,
      colorCode: permissionRow.color_code,
      accessLevel: permissionRow.access_level,
      scope: permissionRow.scope,
      requiresPermissions: permissionRow.requires_permissions
        ? JSON.parse(permissionRow.requires_permissions)
        : null,
      usageCount: permissionRow.usage_count || 0,
      deletedAt: permissionRow.deleted_at,
      createdAt: permissionRow.created_at,
      updatedAt: permissionRow.updated_at,
      createdBy: permissionRow.created_by,
      updatedBy: permissionRow.updated_by,
      // Calculated fields
      isInUse: (permissionRow.usage_count || 0) > 0,
      hasDependencies: permissionRow.requires_permissions !== null
    };
  }
}

module.exports = PermissionModel;
