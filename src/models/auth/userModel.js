/**
 * File: src/models/auth/userModel.js
 * User Model - MySQL2 Database Operations
 *
 * This file contains all database operations for the users table.
 * It uses raw SQL queries with MySQL2 for direct database interaction.
 *
 * For beginners:
 * - This model handles all user-related database operations
 * - We use parameterized queries (?) to prevent SQL injection attacks
 * - Each function is async because database operations take time
 * - We return consistent data structures from all functions
 */

const { executeQuery, executeTransaction } = require('../database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * User Model Class
 * Contains all user-related database operations
 */
class UserModel {
  /**
     * Create a new user account
     *
     * @param {Object} userData - User data to create
     * @returns {Promise<Object>} Created user object
     */
  static async create(userData) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        username = null,
        phone = null,
        timezone = 'UTC',
        language = 'en',
        emailVerified = false
      } = userData;

      // Hash password before storing
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // SQL query to insert new user
      const insertQuery = `
        INSERT INTO users (
          email, password, first_name, last_name, username, phone,
          timezone, language, email_verified, password_changed_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      `;

      const insertParams = [
        email.toLowerCase(),
        hashedPassword,
        firstName,
        lastName,
        username,
        phone,
        timezone,
        language,
        emailVerified
      ];

      // Execute insert query
      const result = await executeQuery(insertQuery, insertParams);

      // Get the newly created user (without password)
      const newUser = await this.findById(result.insertId);

      console.log(`✅ User created with ID: ${result.insertId}`);
      return newUser;

    } catch (error) {
      console.error('❌ Error creating user:', error);

      // Handle duplicate email error
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage.includes('email')) {
          throw new Error('Email address is already registered');
        }
        if (error.sqlMessage.includes('username')) {
          throw new Error('Username is already taken');
        }
      }

      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
     * Find user by ID
     *
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
  static async findById(userId) {
    try {
      const query = `
        SELECT 
          id, email, first_name, last_name, username, phone,
          email_verified, email_verified_at, is_active,
          failed_login_attempts, locked_until,
          avatar_url, timezone, language,
          last_login_at, last_login_ip,
          created_at, updated_at
        FROM users 
        WHERE id = ? AND deleted_at IS NULL
      `;

      const results = await executeQuery(query, [userId]);

      if (results.length === 0) {
        return null;
      }

      return this._formatUserObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  /**
     * Find user by email address
     *
     * @param {string} email - User email
     * @param {boolean} includePassword - Whether to include password hash
     * @returns {Promise<Object|null>} User object or null
     */
  static async findByEmail(email, includePassword = false) {
    try {
      // Select fields based on whether password is needed
      const selectFields = includePassword
        ? `id, email, password, first_name, last_name, username, phone,
           email_verified, email_verified_at, is_active,
           failed_login_attempts, locked_until, password_changed_at,
           avatar_url, timezone, language,
           last_login_at, last_login_ip,
           created_at, updated_at`
        : `id, email, first_name, last_name, username, phone,
           email_verified, email_verified_at, is_active,
           failed_login_attempts, locked_until,
           avatar_url, timezone, language,
           last_login_at, last_login_ip,
           created_at, updated_at`;

      const query = `
        SELECT ${selectFields}
        FROM users 
        WHERE email = ? AND deleted_at IS NULL
      `;

      const results = await executeQuery(query, [email.toLowerCase()]);

      if (results.length === 0) {
        return null;
      }

      return this._formatUserObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  /**
     * Find user by username
     *
     * @param {string} username - Username
     * @returns {Promise<Object|null>} User object or null
     */
  static async findByUsername(username) {
    try {
      const query = `
        SELECT 
          id, email, first_name, last_name, username, phone,
          email_verified, email_verified_at, is_active,
          failed_login_attempts, locked_until,
          avatar_url, timezone, language,
          last_login_at, last_login_ip,
          created_at, updated_at
        FROM users 
        WHERE username = ? AND deleted_at IS NULL
      `;

      const results = await executeQuery(query, [username.toLowerCase()]);

      if (results.length === 0) {
        return null;
      }

      return this._formatUserObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding user by username:', error);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  /**
     * Update user information
     *
     * @param {number} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>} Updated user object
     */
  static async update(userId, updateData) {
    try {
      const allowedFields = [
        'first_name', 'last_name', 'username', 'phone',
        'avatar_url', 'timezone', 'language', 'is_active'
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

      // Build update query dynamically
      const setClause = Object.keys(updateFields)
        .map(field => `${field} = ?`)
        .join(', ');

      const query = `
        UPDATE users 
        SET ${setClause}, updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      const params = [...Object.values(updateFields), userId];
      const result = await executeQuery(query, params);

      if (result.affectedRows === 0) {
        return null; // User not found
      }

      // Return updated user
      return await this.findById(userId);

    } catch (error) {
      console.error('❌ Error updating user:', error);

      // Handle duplicate constraints
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage.includes('username')) {
          throw new Error('Username is already taken');
        }
      }

      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
     * Verify user password
     *
     * @param {string} email - User email
     * @param {string} password - Plain text password
     * @returns {Promise<Object|null>} User object if password valid, null otherwise
     */
  static async verifyPassword(email, password) {
    try {
      // Get user with password hash
      const user = await this.findByEmail(email, true);

      if (!user) {
        return null;
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new Error('Account is temporarily locked due to too many failed login attempts');
      }

      // Check if account is active
      if (!user.is_active) {
        throw new Error('Account is disabled');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        // Increment failed login attempts
        await this.incrementFailedLoginAttempts(user.id);
        return null;
      }

      // Reset failed login attempts on successful login
      if (user.failed_login_attempts > 0) {
        await this.resetFailedLoginAttempts(user.id);
      }

      // Remove password from returned object
      delete user.password;

      return user;

    } catch (error) {
      console.error('❌ Error verifying password:', error);
      throw error; // Re-throw to preserve error messages
    }
  }

  /**
     * Update user password
     *
     * @param {number} userId - User ID
     * @param {string} newPassword - New plain text password
     * @returns {Promise<boolean>} Success status
     */
  static async updatePassword(userId, newPassword) {
    try {
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const query = `
        UPDATE users 
        SET password = ?, password_changed_at = NOW(), updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      const result = await executeQuery(query, [hashedPassword, userId]);

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      console.log(`✅ Password updated for user ID: ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error updating password:', error);
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
     * Update last login information
     *
     * @param {number} userId - User ID
     * @param {string} ipAddress - Login IP address
     * @returns {Promise<boolean>} Success status
     */
  static async updateLastLogin(userId, ipAddress) {
    try {
      const query = `
        UPDATE users 
        SET last_login_at = NOW(), last_login_ip = ?, updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      const result = await executeQuery(query, [ipAddress, userId]);

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      return true;

    } catch (error) {
      console.error('❌ Error updating last login:', error);
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  /**
     * Increment failed login attempts and lock account if necessary
     *
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
  static async incrementFailedLoginAttempts(userId) {
    try {
      const maxAttempts = 5; // Maximum failed attempts before locking
      const lockDuration = 30; // Lock duration in minutes

      const query = `
        UPDATE users 
        SET 
          failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts + 1 >= ? 
            THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
            ELSE locked_until 
          END,
          updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      await executeQuery(query, [maxAttempts, lockDuration, userId]);

      console.log(`⚠️ Incremented failed login attempts for user ID: ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error incrementing failed login attempts:', error);
      throw new Error(`Failed to update login attempts: ${error.message}`);
    }
  }

  /**
     * Reset failed login attempts
     *
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
  static async resetFailedLoginAttempts(userId) {
    try {
      const query = `
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      await executeQuery(query, [userId]);

      return true;

    } catch (error) {
      console.error('❌ Error resetting failed login attempts:', error);
      throw new Error(`Failed to reset login attempts: ${error.message}`);
    }
  }

  /**
     * Verify user email
     *
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
  static async verifyEmail(userId) {
    try {
      const query = `
        UPDATE users 
        SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      const result = await executeQuery(query, [userId]);

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      console.log(`✅ Email verified for user ID: ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error verifying email:', error);
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }

  /**
     * Soft delete user account
     *
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
  static async delete(userId) {
    try {
      const query = `
        UPDATE users 
        SET 
          deleted_at = NOW(), 
          is_active = FALSE,
          email = CONCAT(email, '_deleted_', UNIX_TIMESTAMP()),
          username = CASE 
            WHEN username IS NOT NULL 
            THEN CONCAT(username, '_deleted_', UNIX_TIMESTAMP())
            ELSE NULL 
          END,
          updated_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
      `;

      const result = await executeQuery(query, [userId]);

      if (result.affectedRows === 0) {
        throw new Error('User not found or already deleted');
      }

      console.log(`✅ User soft deleted: ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
     * Search users with filters and pagination
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
        emailVerified = null,
        createdAfter = null,
        createdBefore = null
      } = filters;

      const {
        page = 1,
        pageSize = 10,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = pagination;

      // Build WHERE conditions
      const conditions = ['deleted_at IS NULL'];
      const params = [];

      if (search) {
        conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (isActive !== null) {
        conditions.push('is_active = ?');
        params.push(isActive);
      }

      if (emailVerified !== null) {
        conditions.push('email_verified = ?');
        params.push(emailVerified);
      }

      if (createdAfter) {
        conditions.push('created_at >= ?');
        params.push(createdAfter);
      }

      if (createdBefore) {
        conditions.push('created_at <= ?');
        params.push(createdBefore);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const countResult = await executeQuery(countQuery, params);
      const totalRecords = countResult[0].total;

      // Calculate pagination
      const offset = (page - 1) * pageSize;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Get paginated results
      const query = `
        SELECT 
          id, email, first_name, last_name, username, phone,
          email_verified, email_verified_at, is_active,
          avatar_url, timezone, language,
          last_login_at, created_at, updated_at
        FROM users 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const results = await executeQuery(query, [...params, pageSize, offset]);

      return {
        data: results.map(user => this._formatUserObject(user)),
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
      console.error('❌ Error searching users:', error);
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  /**
     * Check if email exists
     *
     * @param {string} email - Email to check
     * @param {number} excludeUserId - User ID to exclude from check
     * @returns {Promise<boolean>} True if exists
     */
  static async emailExists(email, excludeUserId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE email = ? AND deleted_at IS NULL';
      const params = [email.toLowerCase()];

      if (excludeUserId) {
        query += ' AND id != ?';
        params.push(excludeUserId);
      }

      const result = await executeQuery(query, params);
      return result[0].count > 0;

    } catch (error) {
      console.error('❌ Error checking email existence:', error);
      throw new Error(`Failed to check email: ${error.message}`);
    }
  }

  /**
     * Check if username exists
     *
     * @param {string} username - Username to check
     * @param {number} excludeUserId - User ID to exclude from check
     * @returns {Promise<boolean>} True if exists
     */
  static async usernameExists(username, excludeUserId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE username = ? AND deleted_at IS NULL';
      const params = [username.toLowerCase()];

      if (excludeUserId) {
        query += ' AND id != ?';
        params.push(excludeUserId);
      }

      const result = await executeQuery(query, params);
      return result[0].count > 0;

    } catch (error) {
      console.error('❌ Error checking username existence:', error);
      throw new Error(`Failed to check username: ${error.message}`);
    }
  }

  /**
     * Get user statistics
     *
     * @returns {Promise<Object>} User statistics
     */
  static async getStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) as verified_users,
          SUM(CASE WHEN last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_last_30_days,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as created_last_30_days
        FROM users 
        WHERE deleted_at IS NULL
      `;

      const result = await executeQuery(query);
      return result[0];

    } catch (error) {
      console.error('❌ Error getting user statistics:', error);
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
     * Format user object for consistent output
     *
     * @private
     * @param {Object} userRow - Raw user data from database
     * @returns {Object} Formatted user object
     */
  static _formatUserObject(userRow) {
    return {
      id: userRow.id,
      email: userRow.email,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      fullName: `${userRow.first_name} ${userRow.last_name}`.trim(),
      username: userRow.username,
      phone: userRow.phone,
      emailVerified: Boolean(userRow.email_verified),
      emailVerifiedAt: userRow.email_verified_at,
      isActive: Boolean(userRow.is_active),
      failedLoginAttempts: userRow.failed_login_attempts || 0,
      lockedUntil: userRow.locked_until,
      avatarUrl: userRow.avatar_url,
      timezone: userRow.timezone || 'UTC',
      language: userRow.language || 'en',
      lastLoginAt: userRow.last_login_at,
      lastLoginIp: userRow.last_login_ip,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      // Include password only if it was selected
      ...(userRow.password && { password: userRow.password })
    };
  }
}

module.exports = UserModel;
