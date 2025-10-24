/**
 * File: src/models/auth/sessionModel.js
 * User Session Model - MySQL2 Database Operations
 *
 * This file handles all database operations for user sessions and JWT tokens.
 * It manages session creation, validation, expiration, and cleanup.
 *
 * For beginners:
 * - Sessions track user login state and store JWT token information
 * - We track device info, IP addresses, and expiration times for security
 * - Sessions can be revoked (logged out) individually or in bulk
 * - We automatically clean up expired sessions to keep the database clean
 */

const { executeQuery, executeTransaction } = require('../database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Session Model Class
 * Contains all session-related database operations
 */
class SessionModel {
  /**
   * Create a new user session
   *
   * @param {Object} sessionData - Session data
   * @returns {Promise<Object>} Created session object
   */
  static async create(sessionData) {
    try {
      const {
        userId,
        sessionToken,
        refreshToken = null,
        deviceName = null,
        deviceType = 'web',
        userAgent = null,
        ipAddress,
        country = null,
        city = null,
        expiresAt,
        isRememberMe = false
      } = sessionData;

      // Generate unique session token if not provided
      const finalSessionToken = sessionToken || this._generateSessionToken();

      const insertQuery = `
        INSERT INTO user_sessions (
          user_id, session_token, refresh_token, device_name, device_type,
          user_agent, ip_address, country, city, expires_at,
          is_remember_me, last_used_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      `;

      const insertParams = [
        userId,
        finalSessionToken,
        refreshToken,
        deviceName,
        deviceType,
        userAgent,
        ipAddress,
        country,
        city,
        expiresAt,
        isRememberMe
      ];

      const result = await executeQuery(insertQuery, insertParams);

      // Return the created session
      const newSession = await this.findById(result.insertId);

      console.log(`✅ Session created for user ${userId} with ID: ${result.insertId}`);
      return newSession;

    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Find session by ID
   *
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object|null>} Session object or null
   */
  static async findById(sessionId) {
    try {
      const query = `
        SELECT 
          s.id, s.user_id, s.session_token, s.refresh_token,
          s.device_name, s.device_type, s.user_agent,
          s.ip_address, s.country, s.city,
          s.expires_at, s.last_used_at, s.is_active, s.revoked_at,
          s.revoked_reason, s.is_remember_me, s.is_suspicious,
          s.created_at, s.updated_at,
          u.email, u.first_name, u.last_name
        FROM user_sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `;

      const results = await executeQuery(query, [sessionId]);

      if (results.length === 0) {
        return null;
      }

      return this._formatSessionObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding session by ID:', error);
      throw new Error(`Failed to find session: ${error.message}`);
    }
  }

  /**
   * Find session by token
   *
   * @param {string} sessionToken - Session token
   * @returns {Promise<Object|null>} Session object or null
   */
  static async findByToken(sessionToken) {
    try {
      const query = `
        SELECT 
          s.id, s.user_id, s.session_token, s.refresh_token,
          s.device_name, s.device_type, s.user_agent,
          s.ip_address, s.country, s.city,
          s.expires_at, s.last_used_at, s.is_active, s.revoked_at,
          s.revoked_reason, s.is_remember_me, s.is_suspicious,
          s.created_at, s.updated_at,
          u.email, u.first_name, u.last_name, u.is_active as user_active
        FROM user_sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ? AND u.deleted_at IS NULL
      `;

      const results = await executeQuery(query, [sessionToken]);

      if (results.length === 0) {
        return null;
      }

      return this._formatSessionObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding session by token:', error);
      throw new Error(`Failed to find session: ${error.message}`);
    }
  }

  /**
   * Validate session and check if it's active
   *
   * @param {string} sessionToken - Session token to validate
   * @returns {Promise<Object|null>} Valid session object or null
   */
  static async validateSession(sessionToken) {
    try {
      const session = await this.findByToken(sessionToken);

      if (!session) {
        return null;
      }

      // Check if session is active
      if (!session.isActive) {
        console.log(`ℹ️ Session ${session.id} is inactive`);
        return null;
      }

      // Check if user account is active
      if (!session.user.isActive) {
        console.log(`ℹ️ User ${session.userId} account is inactive`);
        return null;
      }

      // Check if session has expired
      if (new Date() > new Date(session.expiresAt)) {
        console.log(`ℹ️ Session ${session.id} has expired`);

        // Automatically revoke expired session
        await this.revokeSession(session.id, 'expired');
        return null;
      }

      // Update last used time
      await this.updateLastUsed(session.id);

      return session;

    } catch (error) {
      console.error('❌ Error validating session:', error);
      throw new Error(`Failed to validate session: ${error.message}`);
    }
  }

  /**
   * Update session's last used time
   *
   * @param {number} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  static async updateLastUsed(sessionId) {
    try {
      const query = `
        UPDATE user_sessions 
        SET last_used_at = NOW(), updated_at = NOW()
        WHERE id = ? AND is_active = TRUE
      `;

      const result = await executeQuery(query, [sessionId]);
      return result.affectedRows > 0;

    } catch (error) {
      console.error('❌ Error updating session last used:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Revoke a specific session
   *
   * @param {number} sessionId - Session ID to revoke
   * @param {string} reason - Reason for revocation
   * @returns {Promise<boolean>} Success status
   */
  static async revokeSession(sessionId, reason = 'logout') {
    try {
      const query = `
        UPDATE user_sessions 
        SET 
          is_active = FALSE,
          revoked_at = NOW(),
          revoked_reason = ?,
          updated_at = NOW()
        WHERE id = ? AND is_active = TRUE
      `;

      const result = await executeQuery(query, [reason, sessionId]);

      if (result.affectedRows > 0) {
        console.log(`✅ Session ${sessionId} revoked with reason: ${reason}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error revoking session:', error);
      throw new Error(`Failed to revoke session: ${error.message}`);
    }
  }

  /**
   * Revoke session by token
   *
   * @param {string} sessionToken - Session token to revoke
   * @param {string} reason - Reason for revocation
   * @returns {Promise<boolean>} Success status
   */
  static async revokeSessionByToken(sessionToken, reason = 'logout') {
    try {
      const query = `
        UPDATE user_sessions 
        SET 
          is_active = FALSE,
          revoked_at = NOW(),
          revoked_reason = ?,
          updated_at = NOW()
        WHERE session_token = ? AND is_active = TRUE
      `;

      const result = await executeQuery(query, [reason, sessionToken]);

      if (result.affectedRows > 0) {
        console.log(`✅ Session revoked by token with reason: ${reason}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error revoking session by token:', error);
      throw new Error(`Failed to revoke session: ${error.message}`);
    }
  }

  /**
   * Revoke all sessions for a user
   *
   * @param {number} userId - User ID
   * @param {string} reason - Reason for revocation
   * @param {number} excludeSessionId - Session ID to exclude from revocation
   * @returns {Promise<number>} Number of revoked sessions
   */
  static async revokeAllUserSessions(userId, reason = 'logout_all', excludeSessionId = null) {
    try {
      let query = `
        UPDATE user_sessions 
        SET 
          is_active = FALSE,
          revoked_at = NOW(),
          revoked_reason = ?,
          updated_at = NOW()
        WHERE user_id = ? AND is_active = TRUE
      `;

      const params = [reason, userId];

      if (excludeSessionId) {
        query += ' AND id != ?';
        params.push(excludeSessionId);
      }

      const result = await executeQuery(query, params);

      console.log(`✅ Revoked ${result.affectedRows} sessions for user ${userId}`);
      return result.affectedRows;

    } catch (error) {
      console.error('❌ Error revoking all user sessions:', error);
      throw new Error(`Failed to revoke user sessions: ${error.message}`);
    }
  }

  /**
   * Get all active sessions for a user
   *
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of session objects
   */
  static async getUserSessions(userId, options = {}) {
    try {
      const {
        includeInactive = false,
        sortBy = 'last_used_at',
        sortOrder = 'DESC',
        limit = null
      } = options;

      let query = `
        SELECT 
          id, session_token, device_name, device_type, user_agent,
          ip_address, country, city, expires_at, last_used_at,
          is_active, revoked_at, revoked_reason, is_remember_me,
          is_suspicious, created_at, updated_at
        FROM user_sessions 
        WHERE user_id = ?
      `;

      const params = [userId];

      if (!includeInactive) {
        query += ' AND is_active = TRUE';
      }

      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const results = await executeQuery(query, params);

      return results.map(session => this._formatSessionObject(session, false));

    } catch (error) {
      console.error('❌ Error getting user sessions:', error);
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  /**
   * Mark session as suspicious
   *
   * @param {number} sessionId - Session ID
   * @param {string} reason - Reason for marking as suspicious
   * @returns {Promise<boolean>} Success status
   */
  static async markSuspicious(sessionId, reason = '') {
    try {
      const query = `
        UPDATE user_sessions 
        SET is_suspicious = TRUE, updated_at = NOW()
        WHERE id = ?
      `;

      const result = await executeQuery(query, [sessionId]);

      if (result.affectedRows > 0) {
        console.log(`⚠️ Session ${sessionId} marked as suspicious: ${reason}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error marking session as suspicious:', error);
      throw new Error(`Failed to mark session as suspicious: ${error.message}`);
    }
  }

  /**
   * Clean up expired sessions
   *
   * @param {number} olderThanHours - Remove sessions older than X hours
   * @returns {Promise<number>} Number of cleaned sessions
   */
  static async cleanupExpiredSessions(olderThanHours = 24) {
    try {
      // Mark expired sessions as inactive first
      const expireQuery = `
        UPDATE user_sessions 
        SET 
          is_active = FALSE,
          revoked_at = NOW(),
          revoked_reason = 'expired',
          updated_at = NOW()
        WHERE is_active = TRUE 
        AND expires_at < NOW()
      `;

      const expireResult = await executeQuery(expireQuery);
      console.log(`✅ Marked ${expireResult.affectedRows} expired sessions as inactive`);

      // Delete old inactive sessions
      const deleteQuery = `
        DELETE FROM user_sessions 
        WHERE is_active = FALSE 
        AND revoked_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
      `;

      const deleteResult = await executeQuery(deleteQuery, [olderThanHours]);

      console.log(`✅ Deleted ${deleteResult.affectedRows} old sessions`);
      return deleteResult.affectedRows;

    } catch (error) {
      console.error('❌ Error cleaning up expired sessions:', error);
      throw new Error(`Failed to cleanup sessions: ${error.message}`);
    }
  }

  /**
   * Get session statistics
   *
   * @param {number} userId - User ID (optional, for user-specific stats)
   * @returns {Promise<Object>} Session statistics
   */
  static async getStatistics(userId = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_sessions,
          SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_sessions,
          SUM(CASE WHEN is_suspicious = TRUE THEN 1 ELSE 0 END) as suspicious_sessions,
          SUM(CASE WHEN device_type = 'web' THEN 1 ELSE 0 END) as web_sessions,
          SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) as mobile_sessions,
          SUM(CASE WHEN is_remember_me = TRUE THEN 1 ELSE 0 END) as remember_me_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(revoked_at, NOW()))) as avg_session_duration_minutes
        FROM user_sessions
      `;

      const params = [];

      if (userId) {
        query += ' WHERE user_id = ?';
        params.push(userId);
      }

      const result = await executeQuery(query, params);
      return {
        ...result[0],
        avgSessionDurationMinutes: Math.round(result[0].avg_session_duration_minutes || 0)
      };

    } catch (error) {
      console.error('❌ Error getting session statistics:', error);
      throw new Error(`Failed to get session statistics: ${error.message}`);
    }
  }

  /**
   * Find sessions by IP address (for security monitoring)
   *
   * @param {string} ipAddress - IP address to search
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of sessions
   */
  static async findByIpAddress(ipAddress, options = {}) {
    try {
      const {
        timeframe = 24, // hours
        includeInactive = false,
        limit = 50
      } = options;

      let query = `
        SELECT 
          s.id, s.user_id, s.device_name, s.device_type,
          s.ip_address, s.country, s.city, s.is_active,
          s.is_suspicious, s.created_at, s.last_used_at,
          u.email, u.first_name, u.last_name
        FROM user_sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.ip_address = ?
        AND s.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      `;

      const params = [ipAddress, timeframe];

      if (!includeInactive) {
        query += ' AND s.is_active = TRUE';
      }

      query += ' ORDER BY s.created_at DESC LIMIT ?';
      params.push(limit);

      const results = await executeQuery(query, params);

      return results.map(session => this._formatSessionObject(session, true));

    } catch (error) {
      console.error('❌ Error finding sessions by IP address:', error);
      throw new Error(`Failed to find sessions by IP: ${error.message}`);
    }
  }

  /**
   * Update refresh token
   *
   * @param {number} sessionId - Session ID
   * @param {string} newRefreshToken - New refresh token
   * @returns {Promise<boolean>} Success status
   */
  static async updateRefreshToken(sessionId, newRefreshToken) {
    try {
      const query = `
        UPDATE user_sessions 
        SET refresh_token = ?, updated_at = NOW()
        WHERE id = ? AND is_active = TRUE
      `;

      const result = await executeQuery(query, [newRefreshToken, sessionId]);
      return result.affectedRows > 0;

    } catch (error) {
      console.error('❌ Error updating refresh token:', error);
      throw new Error(`Failed to update refresh token: ${error.message}`);
    }
  }

  /**
   * Extend session expiration
   *
   * @param {number} sessionId - Session ID
   * @param {Date} newExpirationTime - New expiration time
   * @returns {Promise<boolean>} Success status
   */
  static async extendSession(sessionId, newExpirationTime) {
    try {
      const query = `
        UPDATE user_sessions 
        SET expires_at = ?, updated_at = NOW()
        WHERE id = ? AND is_active = TRUE
      `;

      const result = await executeQuery(query, [newExpirationTime, sessionId]);

      if (result.affectedRows > 0) {
        console.log(`✅ Session ${sessionId} extended until ${newExpirationTime}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error extending session:', error);
      throw new Error(`Failed to extend session: ${error.message}`);
    }
  }

  /**
   * Get concurrent sessions count for a user
   *
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of active sessions
   */
  static async getConcurrentSessionsCount(userId) {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM user_sessions 
        WHERE user_id = ? AND is_active = TRUE AND expires_at > NOW()
      `;

      const result = await executeQuery(query, [userId]);
      return result[0].count;

    } catch (error) {
      console.error('❌ Error getting concurrent sessions count:', error);
      throw new Error(`Failed to get concurrent sessions count: ${error.message}`);
    }
  }

  /**
   * Generate secure session token
   *
   * @private
   * @returns {string} Generated session token
   */
  static _generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Format session object for consistent output
   *
   * @private
   * @param {Object} sessionRow - Raw session data from database
   * @param {boolean} includeUserInfo - Whether to include user information
   * @returns {Object} Formatted session object
   */
  static _formatSessionObject(sessionRow, includeUserInfo = true) {
    const session = {
      id: sessionRow.id,
      userId: sessionRow.user_id,
      sessionToken: sessionRow.session_token,
      refreshToken: sessionRow.refresh_token,
      deviceName: sessionRow.device_name,
      deviceType: sessionRow.device_type,
      userAgent: sessionRow.user_agent,
      ipAddress: sessionRow.ip_address,
      country: sessionRow.country,
      city: sessionRow.city,
      expiresAt: sessionRow.expires_at,
      lastUsedAt: sessionRow.last_used_at,
      isActive: Boolean(sessionRow.is_active),
      revokedAt: sessionRow.revoked_at,
      revokedReason: sessionRow.revoked_reason,
      isRememberMe: Boolean(sessionRow.is_remember_me),
      isSuspicious: Boolean(sessionRow.is_suspicious),
      createdAt: sessionRow.created_at,
      updatedAt: sessionRow.updated_at
    };

    // Add user information if available and requested
    if (includeUserInfo && sessionRow.email) {
      session.user = {
        email: sessionRow.email,
        firstName: sessionRow.first_name,
        lastName: sessionRow.last_name,
        fullName: `${sessionRow.first_name} ${sessionRow.last_name}`.trim(),
        isActive: Boolean(sessionRow.user_active !== undefined ? sessionRow.user_active : true)
      };
    }

    return session;
  }
}

module.exports = SessionModel;
