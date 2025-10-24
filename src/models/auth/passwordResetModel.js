/**
 * File: src/models/auth/passwordResetModel.js
 * Password Reset Model - MySQL2 Database Operations
 *
 * This file handles all database operations for password reset functionality.
 * It manages reset token creation, validation, usage tracking, and cleanup.
 *
 * For beginners:
 * - Password reset allows users to change their password when they forget it
 * - We generate secure tokens that are sent via email for verification
 * - Tokens expire after a certain time and can only be used once
 * - We track attempts and IP addresses for security monitoring
 */

const { executeQuery, executeTransaction } = require('../database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Password Reset Model Class
 * Contains all password reset related database operations
 */
class PasswordResetModel {
  /**
     * Create a new password reset request
     *
     * @param {Object} resetData - Password reset data
     * @returns {Promise<Object>} Created password reset object
     */
  static async createResetRequest(resetData) {
    try {
      const {
        email,
        userId = null,
        ipAddress,
        userAgent = null,
        expiresAt = null
      } = resetData;

      // Generate secure reset token
      const resetToken = this._generateResetToken();
      const tokenHash = await this._hashToken(resetToken);

      // Default expiration: 15 minutes from now
      const defaultExpiration = new Date();
      defaultExpiration.setMinutes(defaultExpiration.getMinutes() + 15);

      const finalExpirationTime = expiresAt || defaultExpiration;

      // Check rate limiting before creating
      const canCreate = await this._checkRateLimit(email, ipAddress);
      if (!canCreate.allowed) {
        throw new Error(`Too many password reset requests. Please try again later.`);
      }

      const insertQuery = `
                INSERT INTO password_resets (
                    email, user_id, token, token_hash, ip_address, user_agent,
                    expires_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;

      const insertParams = [
        email.toLowerCase(),
        userId,
        resetToken, // Store plain token for returning to user
        tokenHash,  // Store hashed version for security
        ipAddress,
        userAgent,
        finalExpirationTime
      ];

      const result = await executeQuery(insertQuery, insertParams);

      // Get the created reset request (without sensitive data)
      const resetRequest = await this.findById(result.insertId);

      // Add the plain token to return (only for this response)
      resetRequest.plainToken = resetToken;

      console.log(`✅ Password reset request created for ${email} with ID: ${result.insertId}`);
      return resetRequest;

    } catch (error) {
      console.error('❌ Error creating password reset request:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Find password reset request by ID
     *
     * @param {number} resetId - Reset request ID
     * @returns {Promise<Object|null>} Reset request object or null
     */
  static async findById(resetId) {
    try {
      const query = `
                SELECT 
                    pr.id, pr.email, pr.user_id, pr.ip_address, pr.user_agent,
                    pr.expires_at, pr.is_used, pr.used_at, pr.used_ip,
                    pr.verification_attempts, pr.max_attempts, pr.request_count,
                    pr.created_at, pr.updated_at,
                    u.first_name, u.last_name, u.is_active as user_active
                FROM password_resets pr
                LEFT JOIN users u ON pr.user_id = u.id
                WHERE pr.id = ?
            `;

      const results = await executeQuery(query, [resetId]);

      if (results.length === 0) {
        return null;
      }

      return this._formatResetObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding password reset by ID:', error);
      throw new Error(`Failed to find password reset: ${error.message}`);
    }
  }

  /**
     * Find password reset request by token
     *
     * @param {string} token - Reset token
     * @returns {Promise<Object|null>} Reset request object or null
     */
  static async findByToken(token) {
    try {
      const tokenHash = await this._hashToken(token);

      const query = `
                SELECT 
                    pr.id, pr.email, pr.user_id, pr.ip_address, pr.user_agent,
                    pr.expires_at, pr.is_used, pr.used_at, pr.used_ip,
                    pr.verification_attempts, pr.max_attempts, pr.request_count,
                    pr.created_at, pr.updated_at,
                    u.first_name, u.last_name, u.is_active as user_active
                FROM password_resets pr
                LEFT JOIN users u ON pr.user_id = u.id
                WHERE pr.token_hash = ?
            `;

      const results = await executeQuery(query, [tokenHash]);

      if (results.length === 0) {
        return null;
      }

      return this._formatResetObject(results[0]);

    } catch (error) {
      console.error('❌ Error finding password reset by token:', error);
      throw new Error(`Failed to find password reset: ${error.message}`);
    }
  }

  /**
     * Validate reset token and check if it can be used
     *
     * @param {string} token - Reset token
     * @param {string} email - Email address
     * @returns {Promise<Object|null>} Valid reset request or null
     */
  static async validateResetToken(token, email) {
    try {
      const resetRequest = await this.findByToken(token);

      if (!resetRequest) {
        console.log('ℹ️ Password reset token not found');
        return null;
      }

      // Check if email matches
      if (resetRequest.email.toLowerCase() !== email.toLowerCase()) {
        console.log('ℹ️ Password reset token email mismatch');
        await this._incrementVerificationAttempts(resetRequest.id);
        return null;
      }

      // Check if already used
      if (resetRequest.isUsed) {
        console.log('ℹ️ Password reset token already used');
        return null;
      }

      // Check if expired
      if (new Date() > new Date(resetRequest.expiresAt)) {
        console.log('ℹ️ Password reset token expired');
        return null;
      }

      // Check verification attempts
      if (resetRequest.verificationAttempts >= resetRequest.maxAttempts) {
        console.log('ℹ️ Password reset token max attempts exceeded');
        return null;
      }

      return resetRequest;

    } catch (error) {
      console.error('❌ Error validating reset token:', error);
      throw new Error(`Failed to validate reset token: ${error.message}`);
    }
  }

  /**
     * Use reset token to complete password reset
     *
     * @param {string} token - Reset token
     * @param {string} email - Email address
     * @param {string} newPassword - New password
     * @param {string} clientIp - Client IP address
     * @returns {Promise<boolean>} Success status
     */
  static async useResetToken(token, email, newPassword, clientIp) {
    try {
      // Validate token first
      const resetRequest = await this.validateResetToken(token, email);

      if (!resetRequest) {
        throw new Error('Invalid or expired reset token');
      }

      if (!resetRequest.userId) {
        throw new Error('No user associated with this reset request');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Execute password update and token marking in transaction
      await executeTransaction(async (connection) => {
        // Update user password
        const updatePasswordQuery = `
                    UPDATE users 
                    SET password = ?, password_changed_at = NOW(), updated_at = NOW()
                    WHERE id = ?
                `;
        await connection.execute(updatePasswordQuery, [hashedPassword, resetRequest.userId]);

        // Mark reset token as used
        const markUsedQuery = `
                    UPDATE password_resets 
                    SET 
                        is_used = TRUE,
                        used_at = NOW(),
                        used_ip = ?,
                        updated_at = NOW()
                    WHERE id = ?
                `;
        await connection.execute(markUsedQuery, [clientIp, resetRequest.id]);

        // Invalidate all other reset tokens for this email
        const invalidateQuery = `
                    UPDATE password_resets 
                    SET 
                        is_used = TRUE,
                        used_at = NOW(),
                        used_ip = ?,
                        updated_at = NOW()
                    WHERE email = ? AND id != ? AND is_used = FALSE
                `;
        await connection.execute(invalidateQuery, [clientIp, resetRequest.email, resetRequest.id]);
      });

      console.log(`✅ Password reset completed for user ${resetRequest.userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error using reset token:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
     * Get all password reset requests for an email
     *
     * @param {string} email - Email address
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of reset requests
     */
  static async getEmailResetHistory(email, options = {}) {
    try {
      const {
        limit = 10,
        includeUsed = true,
        timeframe = 24 // hours
      } = options;

      let query = `
                SELECT 
                    id, email, ip_address, expires_at, is_used, used_at,
                    verification_attempts, request_count, created_at
                FROM password_resets 
                WHERE email = ?
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            `;

      const params = [email.toLowerCase(), timeframe];

      if (!includeUsed) {
        query += ' AND is_used = FALSE';
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const results = await executeQuery(query, params);

      return results.map(reset => this._formatResetObject(reset, false));

    } catch (error) {
      console.error('❌ Error getting email reset history:', error);
      throw new Error(`Failed to get reset history: ${error.message}`);
    }
  }

  /**
     * Clean up expired password reset requests
     *
     * @param {number} olderThanHours - Remove requests older than X hours
     * @returns {Promise<number>} Number of cleaned requests
     */
  static async cleanupExpiredRequests(olderThanHours = 24) {
    try {
      const query = `
                DELETE FROM password_resets 
                WHERE (
                    (is_used = TRUE AND used_at < DATE_SUB(NOW(), INTERVAL ? HOUR)) OR
                    (is_used = FALSE AND expires_at < DATE_SUB(NOW(), INTERVAL ? HOUR))
                )
            `;

      const result = await executeQuery(query, [olderThanHours, olderThanHours]);

      console.log(`✅ Cleaned up ${result.affectedRows} expired password reset requests`);
      return result.affectedRows;

    } catch (error) {
      console.error('❌ Error cleaning up expired requests:', error);
      throw new Error(`Failed to cleanup expired requests: ${error.message}`);
    }
  }

  /**
     * Get password reset statistics
     *
     * @param {Object} options - Statistics options
     * @returns {Promise<Object>} Reset statistics
     */
  static async getStatistics(options = {}) {
    try {
      const { timeframe = 24 } = options; // hours

      const query = `
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as completed_resets,
                    SUM(CASE WHEN expires_at < NOW() AND is_used = FALSE THEN 1 ELSE 0 END) as expired_requests,
                    SUM(CASE WHEN verification_attempts >= max_attempts THEN 1 ELSE 0 END) as blocked_requests,
                    COUNT(DISTINCT email) as unique_emails,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    AVG(verification_attempts) as avg_attempts,
                    AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(used_at, NOW()))) as avg_completion_time_minutes
                FROM password_resets 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            `;

      const result = await executeQuery(query, [timeframe]);

      return {
        ...result[0],
        avgCompletionTimeMinutes: Math.round(result[0].avg_completion_time_minutes || 0),
        avgAttempts: parseFloat((result[0].avg_attempts || 0).toFixed(2)),
        successRate: result[0].total_requests > 0
          ? parseFloat(((result[0].completed_resets / result[0].total_requests) * 100).toFixed(2))
          : 0
      };

    } catch (error) {
      console.error('❌ Error getting password reset statistics:', error);
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
     * Find suspicious password reset activity
     *
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Suspicious activity records
     */
  static async findSuspiciousActivity(options = {}) {
    try {
      const {
        timeframe = 24, // hours
        minRequests = 5, // minimum requests to consider suspicious
        limit = 50
      } = options;

      // Find IPs or emails with high request frequency
      const query = `
                SELECT 
                    COALESCE(email, 'Unknown') as identifier,
                    ip_address,
                    COUNT(*) as request_count,
                    SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as successful_resets,
                    SUM(CASE WHEN verification_attempts >= max_attempts THEN 1 ELSE 0 END) as blocked_attempts,
                    MIN(created_at) as first_request,
                    MAX(created_at) as last_request,
                    COUNT(DISTINCT email) as unique_emails_from_ip
                FROM password_resets 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                GROUP BY COALESCE(email, ip_address), ip_address
                HAVING request_count >= ?
                ORDER BY request_count DESC, blocked_attempts DESC
                LIMIT ?
            `;

      const results = await executeQuery(query, [timeframe, minRequests, limit]);

      return results.map(record => ({
        ...record,
        suspicionScore: this._calculateSuspicionScore(record)
      }));

    } catch (error) {
      console.error('❌ Error finding suspicious password reset activity:', error);
      throw new Error(`Failed to find suspicious activity: ${error.message}`);
    }
  }

  /**
     * Block password reset requests from IP or email
     *
     * @param {string} identifier - IP address or email to block
     * @param {string} type - 'ip' or 'email'
     * @param {number} durationHours - Block duration in hours
     * @returns {Promise<boolean>} Success status
     */
  static async blockResetRequests(identifier, type = 'ip', durationHours = 24) {
    try {
      // Set all future requests from this identifier as blocked
      let updateQuery;
      if (type === 'ip') {
        updateQuery = `
                    UPDATE password_resets 
                    SET max_attempts = 0, updated_at = NOW()
                    WHERE ip_address = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                `;
      } else {
        updateQuery = `
                    UPDATE password_resets 
                    SET max_attempts = 0, updated_at = NOW()
                    WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                `;
      }

      await executeQuery(updateQuery, [identifier, durationHours]);

      console.log(`✅ Blocked password reset requests for ${type}: ${identifier} for ${durationHours} hours`);
      return true;

    } catch (error) {
      console.error('❌ Error blocking password reset requests:', error);
      throw new Error(`Failed to block reset requests: ${error.message}`);
    }
  }

  // Private helper methods

  /**
     * Generate secure reset token
     *
     * @returns {string} Secure token
     * @private
     */
  static _generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
     * Hash token for secure storage
     *
     * @param {string} token - Plain token
     * @returns {Promise<string>} Hashed token
     * @private
     */
  static async _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
     * Check rate limiting for password reset requests
     *
     * @param {string} email - Email address
     * @param {string} ipAddress - IP address
     * @returns {Promise<Object>} Rate limit check result
     * @private
     */
  static async _checkRateLimit(email, ipAddress) {
    try {
      const timeWindow = 15; // minutes
      const maxRequests = 3; // max requests per email per time window
      const maxRequestsPerIP = 10; // max requests per IP per time window

      // Check email rate limit
      const emailQuery = `
                SELECT COUNT(*) as count
                FROM password_resets 
                WHERE email = ? 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
            `;
      const [emailResult] = await executeQuery(emailQuery, [email, timeWindow]);

      // Check IP rate limit
      const ipQuery = `
                SELECT COUNT(*) as count
                FROM password_resets 
                WHERE ip_address = ? 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
            `;
      const [ipResult] = await executeQuery(ipQuery, [ipAddress, timeWindow]);

      const emailExceeded = emailResult.count >= maxRequests;
      const ipExceeded = ipResult.count >= maxRequestsPerIP;

      return {
        allowed: !emailExceeded && !ipExceeded,
        emailLimited: emailExceeded,
        ipLimited: ipExceeded,
        emailCount: emailResult.count,
        ipCount: ipResult.count,
        maxRequests,
        maxRequestsPerIP,
        timeWindow
      };

    } catch (error) {
      console.error('❌ Error checking rate limit:', error);
      // Allow request in case of database error
      return { allowed: true };
    }
  }

  /**
     * Increment verification attempts for a reset request
     *
     * @param {number} resetId - Reset request ID
     * @returns {Promise<void>}
     * @private
     */
  static async _incrementVerificationAttempts(resetId) {
    try {
      const query = `
                UPDATE password_resets 
                SET verification_attempts = verification_attempts + 1, updated_at = NOW()
                WHERE id = ?
            `;
      await executeQuery(query, [resetId]);

    } catch (error) {
      console.error('❌ Error incrementing verification attempts:', error);
    }
  }

  /**
     * Format reset object for consistent output
     *
     * @param {Object} resetData - Raw reset data from database
     * @param {boolean} includeUser - Include user data
     * @returns {Object} Formatted reset object
     * @private
     */
  static _formatResetObject(resetData, includeUser = true) {
    const formatted = {
      id: resetData.id,
      email: resetData.email,
      userId: resetData.user_id,
      ipAddress: resetData.ip_address,
      userAgent: resetData.user_agent,
      expiresAt: resetData.expires_at,
      isUsed: Boolean(resetData.is_used),
      usedAt: resetData.used_at,
      usedIp: resetData.used_ip,
      verificationAttempts: resetData.verification_attempts || 0,
      maxAttempts: resetData.max_attempts || 3,
      requestCount: resetData.request_count || 1,
      createdAt: resetData.created_at,
      updatedAt: resetData.updated_at
    };

    if (includeUser && resetData.user_id) {
      formatted.user = {
        firstName: resetData.first_name,
        lastName: resetData.last_name,
        fullName: `${resetData.first_name || ''} ${resetData.last_name || ''}`.trim(),
        isActive: Boolean(resetData.user_active)
      };
    }

    return formatted;
  }

  /**
     * Calculate suspicion score for reset activity
     *
     * @param {Object} record - Activity record
     * @returns {number} Suspicion score (0-100)
     * @private
     */
  static _calculateSuspicionScore(record) {
    let score = 0;

    // High request count
    if (record.request_count > 10) score += 30;
    else if (record.request_count > 5) score += 15;

    // High blocked attempts
    if (record.blocked_attempts > 0) {
      score += Math.min(record.blocked_attempts * 20, 40);
    }

    // Multiple emails from same IP
    if (record.unique_emails_from_ip > 3) score += 20;
    else if (record.unique_emails_from_ip > 1) score += 10;

    // Low success rate
    const successRate = record.request_count > 0
      ? (record.successful_resets / record.request_count) * 100
      : 0;
    if (successRate < 10) score += 15;

    // Time pattern (rapid requests)
    const timeSpan = new Date(record.last_request) - new Date(record.first_request);
    const hoursSpan = timeSpan / (1000 * 60 * 60);
    if (hoursSpan < 1 && record.request_count > 3) score += 25;

    return Math.min(score, 100);
  }
}

module.exports = PasswordResetModel;
