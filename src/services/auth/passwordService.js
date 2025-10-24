/**
 * File: src/services/auth/passwordService.js
 * Password Service - MySQL2 Business Logic
 *
 * This file handles all password-related operations including
 * password changes, resets, and security validation.
 *
 * For beginners:
 * - This service manages password security operations
 * - Uses bcrypt for password hashing and comparison
 * - Handles password reset tokens and email notifications
 * - Uses functional programming approach
 */

const bcrypt = require('bcryptjs');
const { UserModel, PasswordResetModel } = require('../../models');
const { jwtService } = require('./jwtService');
const { Auth: AuthSchemas } = require('../../schemas');
const config = require('../../../config/environment');

/**
 * Change user password (authenticated user)
 *
 * @param {string} userId - User ID
 * @param {Object} passwordData - Password change data
 * @returns {Promise<Object>} Password change result
 */
const changePassword = async (userId, passwordData) => {
  try {
    // Validate password data using Yup
    const validatedData = await AuthSchemas.passwordChangeSchema.validate(passwordData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Find user
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return {
        success: false,
        message: 'Current password is incorrect',
        field: 'currentPassword'
      };
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(
      validatedData.newPassword,
      user.password
    );

    if (isSamePassword) {
      return {
        success: false,
        message: 'New password must be different from current password',
        field: 'newPassword'
      };
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(
      validatedData.newPassword,
      config.auth.bcryptRounds
    );

    // Update password in database
    const updateResult = await UserModel.updatePassword(userId, hashedNewPassword);

    if (!updateResult.success) {
      return {
        success: false,
        message: 'Failed to update password',
        error: updateResult.error
      };
    }

    return {
      success: true,
      message: 'Password changed successfully',
      data: {
        userId: userId,
        changedAt: new Date()
      }
    };

  } catch (error) {
    console.error('Error in changePassword:', error);

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
      message: 'Password change failed',
      error: error.message
    };
  }
};

/**
 * Request password reset
 *
 * @param {Object} resetData - Password reset request data
 * @param {Object} options - Reset options
 * @returns {Promise<Object>} Reset request result
 */
const requestPasswordReset = async (resetData, options = {}) => {
  try {
    const { ipAddress, userAgent } = options;

    // Validate reset data using Yup
    const validatedData = await AuthSchemas.passwordResetRequestSchema.validate(resetData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Find user by email
    const user = await UserModel.findByEmail(validatedData.email);

    // Always return success to prevent email enumeration attacks
    // But only actually send reset if user exists and is active
    if (user && user.isActive) {
      // Create password reset request
      const resetRequest = await PasswordResetModel.createResetRequest({
        email: validatedData.email,
        userId: user.id,
        ipAddress: ipAddress,
        userAgent: userAgent
      });

      if (resetRequest && resetRequest.plainToken) {
        return {
          success: true,
          message: 'Password reset instructions have been sent to your email',
          data: {
            resetToken: resetRequest.plainToken,
            expiresAt: resetRequest.expiresAt,
            requestId: resetRequest.id
          }
        };
      }
    }

    // Return success even if user doesn't exist (security best practice)
    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent',
      data: {
        email: validatedData.email,
        requestedAt: new Date()
      }
    };

  } catch (error) {
    console.error('Error in requestPasswordReset:', error);

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
      message: 'Password reset request failed',
      error: error.message
    };
  }
};

/**
 * Reset password using reset token
 *
 * @param {Object} resetData - Password reset data
 * @param {Object} options - Reset options
 * @returns {Promise<Object>} Password reset result
 */
const resetPassword = async (resetData, options = {}) => {
  try {
    const { ipAddress } = options;

    // Validate reset data using Yup
    const validatedData = await AuthSchemas.passwordResetSchema.validate(resetData, {
      stripUnknown: true,
      abortEarly: false
    });

    const { token, email, newPassword } = validatedData;

    // Use the password reset token
    const resetResult = await PasswordResetModel.useResetToken(
      token,
      email,
      newPassword,
      ipAddress
    );

    if (!resetResult) {
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }

    return {
      success: true,
      message: 'Password has been reset successfully',
      data: {
        email: email,
        resetAt: new Date()
      }
    };

  } catch (error) {
    console.error('Error in resetPassword:', error);

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
      message: 'Password reset failed',
      error: error.message
    };
  }
};

/**
 * Validate password reset token
 *
 * @param {Object} tokenData - Token validation data
 * @returns {Promise<Object>} Token validation result
 */
const validateResetToken = async (tokenData) => {
  try {
    // Validate token data using Yup
    const validatedData = await AuthSchemas.passwordResetTokenSchema.validate(tokenData, {
      stripUnknown: true,
      abortEarly: false
    });

    const { token, email } = validatedData;

    // Validate the reset token
    const resetRequest = await PasswordResetModel.validateResetToken(token, email);

    if (!resetRequest) {
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }

    return {
      success: true,
      message: 'Reset token is valid',
      data: {
        email: resetRequest.email,
        expiresAt: resetRequest.expiresAt,
        canReset: true
      }
    };

  } catch (error) {
    console.error('Error in validateResetToken:', error);

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
      message: 'Token validation failed',
      error: error.message
    };
  }
};

/**
 * Get password reset history for an email
 *
 * @param {string} email - Email address
 * @param {Object} options - History options
 * @returns {Promise<Object>} Reset history result
 */
const getResetHistory = async (email, options = {}) => {
  try {
    const { limit = 10, timeframe = 24 } = options;

    // Validate email using Yup
    const validatedData = await AuthSchemas.emailSchema.validate({ email });

    const history = await PasswordResetModel.getEmailResetHistory(
      validatedData.email,
      { limit, timeframe }
    );

    return {
      success: true,
      message: 'Reset history retrieved successfully',
      data: {
        email: validatedData.email,
        history: history,
        totalRequests: history.length
      }
    };

  } catch (error) {
    console.error('Error in getResetHistory:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Invalid email address',
        field: 'email'
      };
    }

    return {
      success: false,
      message: 'Failed to retrieve reset history',
      error: error.message
    };
  }
};

/**
 * Validate password strength
 *
 * @param {string} password - Password to validate
 * @returns {Object} Password strength validation result
 */
const validatePasswordStrength = (password) => {
  try {
    const result = {
      valid: false,
      score: 0,
      feedback: [],
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumbers: false,
        hasSpecialChars: false
      }
    };

    if (!password || typeof password !== 'string') {
      result.feedback.push('Password is required');
      return result;
    }

    const minLength = config.security.password.minLength || 8;

    // Check minimum length
    if (password.length >= minLength) {
      result.requirements.minLength = true;
      result.score += 20;
    } else {
      result.feedback.push(`Password must be at least ${minLength} characters long`);
    }

    // Check uppercase letters
    if (/[A-Z]/.test(password)) {
      result.requirements.hasUppercase = true;
      result.score += 20;
    } else if (config.security.password.requireUppercase) {
      result.feedback.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase letters
    if (/[a-z]/.test(password)) {
      result.requirements.hasLowercase = true;
      result.score += 20;
    } else if (config.security.password.requireLowercase) {
      result.feedback.push('Password must contain at least one lowercase letter');
    }

    // Check numbers
    if (/\d/.test(password)) {
      result.requirements.hasNumbers = true;
      result.score += 20;
    } else if (config.security.password.requireNumbers) {
      result.feedback.push('Password must contain at least one number');
    }

    // Check special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.requirements.hasSpecialChars = true;
      result.score += 20;
    } else if (config.security.password.requireSpecial) {
      result.feedback.push('Password must contain at least one special character');
    }

    // Additional strength checks
    if (password.length >= 12) {
      result.score += 10; // Bonus for longer passwords
    }

    if (/(.)\1{2,}/.test(password)) {
      result.score -= 10; // Penalty for repeated characters
      result.feedback.push('Avoid repeated characters');
    }

    // Common password patterns check
    const commonPatterns = ['123', 'abc', 'password', 'qwerty'];
    const lowerPassword = password.toLowerCase();

    for (const pattern of commonPatterns) {
      if (lowerPassword.includes(pattern)) {
        result.score -= 15;
        result.feedback.push('Avoid common password patterns');
        break;
      }
    }

    // Determine validity
    const requiredChecks = [
      !config.security.password.requireUppercase || result.requirements.hasUppercase,
      !config.security.password.requireLowercase || result.requirements.hasLowercase,
      !config.security.password.requireNumbers || result.requirements.hasNumbers,
      !config.security.password.requireSpecial || result.requirements.hasSpecialChars,
      result.requirements.minLength
    ];

    result.valid = requiredChecks.every(check => check);
    result.score = Math.max(0, Math.min(100, result.score));

    // Add strength description
    if (result.score >= 80) {
      result.strength = 'Very Strong';
    } else if (result.score >= 60) {
      result.strength = 'Strong';
    } else if (result.score >= 40) {
      result.strength = 'Medium';
    } else if (result.score >= 20) {
      result.strength = 'Weak';
    } else {
      result.strength = 'Very Weak';
    }

    if (result.valid) {
      result.feedback.unshift('Password meets all requirements');
    }

    return result;

  } catch (error) {
    console.error('Error validating password strength:', error);
    return {
      valid: false,
      score: 0,
      strength: 'Unknown',
      feedback: ['Error validating password'],
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumbers: false,
        hasSpecialChars: false
      },
      error: error.message
    };
  }
};

/**
 * Generate secure password
 *
 * @param {Object} options - Password generation options
 * @returns {Object} Generated password result
 */
const generateSecurePassword = (options = {}) => {
  try {
    const {
      length = 12,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSpecialChars = true,
      excludeSimilar = true,
      excludeAmbiguous = true
    } = options;

    let charset = '';

    if (includeLowercase) {
      charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }

    if (includeUppercase) {
      charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }

    if (includeNumbers) {
      charset += excludeSimilar ? '23456789' : '0123456789';
    }

    if (includeSpecialChars) {
      charset += excludeAmbiguous ? '!@#$%^&*+-=' : '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }

    if (!charset) {
      return {
        success: false,
        message: 'At least one character type must be included'
      };
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Validate the generated password
    const validation = validatePasswordStrength(password);

    return {
      success: true,
      message: 'Secure password generated successfully',
      data: {
        password: password,
        length: password.length,
        strength: validation.strength,
        score: validation.score,
        valid: validation.valid
      }
    };

  } catch (error) {
    console.error('Error generating secure password:', error);
    return {
      success: false,
      message: 'Failed to generate secure password',
      error: error.message
    };
  }
};

/**
 * Check if password has been compromised (basic check)
 *
 * @param {string} password - Password to check
 * @returns {Object} Compromise check result
 */
const checkPasswordCompromise = async (password) => {
  try {
    // This is a basic implementation
    // In production, you might want to integrate with HaveIBeenPwned API

    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome',
      'monkey', '1234567890', 'dragon', 'master', 'football'
    ];

    const isCommon = commonPasswords.includes(password.toLowerCase());

    return {
      success: true,
      data: {
        isCompromised: isCommon,
        riskLevel: isCommon ? 'high' : 'low',
        message: isCommon ? 'This password appears in common password lists' : 'Password not found in common compromise lists'
      }
    };

  } catch (error) {
    console.error('Error checking password compromise:', error);
    return {
      success: false,
      message: 'Failed to check password security',
      error: error.message
    };
  }
};

module.exports = {
  changePassword,
  requestPasswordReset,
  resetPassword,
  validateResetToken,
  getResetHistory,
  validatePasswordStrength,
  generateSecurePassword,
  checkPasswordCompromise
};
