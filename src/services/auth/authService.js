/**
 * File: src/services/auth/authService.js
 * Authentication Service - MySQL2 Business Logic
 *
 * This file contains all authentication-related business logic.
 * It handles user registration, login, logout, and profile management.
 *
 * For beginners:
 * - Services contain business logic and coordinate between controllers and models
 * - This service uses MySQL2 models for database operations
 * - Yup schemas are used for data validation
 * - JWT tokens are used for user authentication
 * - Uses functional programming instead of classes
 */

const bcrypt = require('bcryptjs');
const { UserModel, SessionModel } = require('../../models');
const { jwtService } = require('./jwtService');
const { Auth: AuthSchemas } = require('../../schemas');
const config = require('../../../config/environment');

/**
 * Register a new user
 *
 * @param {Object} userData - User registration data
 * @param {Object} options - Registration options
 * @returns {Promise<Object>} Registration result
 */
const registerUser = async (userData, options = {}) => {
  try {
    const { ipAddress, userAgent } = options;

    // Validate registration data using Yup
    const validatedData = await AuthSchemas.registerSchema.validate(userData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(validatedData.email);
    if (existingUser) {
      return {
        success: false,
        message: 'User with this email already exists',
        field: 'email'
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      validatedData.password,
      config.auth.bcryptRounds
    );

    // Create user
    const newUser = await UserModel.create({
      ...validatedData,
      password: hashedPassword,
      registrationIp: ipAddress,
      isVerified: false,
      isActive: true
    });

    if (!newUser.success) {
      return {
        success: false,
        message: 'Failed to create user account',
        error: newUser.error
      };
    }

    // Generate verification token if email verification is enabled
    let verificationToken = null;
    if (config.features.emailVerificationEnabled) {
      verificationToken = await UserModel.generateVerificationToken(newUser.data.id);
    }

    // Prepare response (exclude sensitive data)
    const userResponse = {
      id: newUser.data.id,
      email: newUser.data.email,
      firstName: newUser.data.firstName,
      lastName: newUser.data.lastName,
      isVerified: newUser.data.isVerified,
      isActive: newUser.data.isActive,
      createdAt: newUser.data.createdAt
    };

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        requiresEmailVerification: config.features.emailVerificationEnabled,
        verificationToken: config.features.emailVerificationEnabled ? verificationToken : null
      }
    };

  } catch (error) {
    console.error('Error in registerUser:', error);

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
      message: 'Registration failed',
      error: error.message
    };
  }
};

/**
 * Authenticate user login
 *
 * @param {Object} loginData - Login credentials
 * @param {Object} options - Login options
 * @returns {Promise<Object>} Authentication result
 */
const loginUser = async (loginData, options = {}) => {
  try {
    const { ipAddress, userAgent, rememberMe = false } = options;

    // Validate login data using Yup
    const validatedData = await AuthSchemas.loginSchema.validate(loginData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Find user by email
    const user = await UserModel.findByEmail(validatedData.email);
    if (!user) {
      // Record failed login attempt
      await UserModel.recordLoginAttempt(validatedData.email, ipAddress, false);

      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if account is locked
    if (user.isLocked) {
      return {
        success: false,
        message: `Account is locked due to too many failed login attempts. Try again after ${new Date(user.lockUntil).toLocaleString()}`
      };
    }

    // Check if account is active
    if (!user.isActive) {
      return {
        success: false,
        message: 'Account is deactivated. Please contact support.'
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

    if (!isPasswordValid) {
      // Record failed login attempt
      await UserModel.recordLoginAttempt(user.id, ipAddress, false);

      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if email verification is required
    if (config.features.emailVerificationEnabled && !user.isVerified) {
      return {
        success: false,
        message: 'Please verify your email before logging in',
        requiresEmailVerification: true
      };
    }

    // Record successful login attempt
    await UserModel.recordLoginAttempt(user.id, ipAddress, true);

    // Generate JWT tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      isVerified: user.isVerified
    };

    const accessToken = jwtService.generateAccessToken(tokenPayload);
    const refreshToken = jwtService.generateRefreshToken(tokenPayload);

    // Create session record
    const sessionData = {
      userId: user.id,
      token: accessToken,
      refreshToken: refreshToken,
      ipAddress: ipAddress,
      userAgent: userAgent,
      expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)), // 30 days or 1 day
      isActive: true
    };

    const session = await SessionModel.create(sessionData);

    if (!session.success) {
      return {
        success: false,
        message: 'Failed to create session',
        error: session.error
      };
    }

    // Update user last login
    await UserModel.updateLastLogin(user.id, ipAddress);

    // Prepare user response (exclude sensitive data)
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
      isActive: user.isActive,
      lastLoginAt: new Date()
    };

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        tokens: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresIn: rememberMe ? '30d' : '1d'
        },
        session: {
          id: session.data.id,
          expiresAt: sessionData.expiresAt
        }
      }
    };

  } catch (error) {
    console.error('Error in loginUser:', error);

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
      message: 'Login failed',
      error: error.message
    };
  }
};

/**
 * Logout user and invalidate session
 *
 * @param {string} userId - User ID
 * @param {string} sessionToken - Session token to invalidate
 * @param {Object} options - Logout options
 * @returns {Promise<Object>} Logout result
 */
const logoutUser = async (userId, sessionToken, options = {}) => {
  try {
    const { logoutAllSessions = false, ipAddress } = options;

    if (logoutAllSessions) {
      // Invalidate all user sessions
      const result = await SessionModel.invalidateAllUserSessions(userId, ipAddress);

      return {
        success: result.success,
        message: result.success ? 'Logged out from all sessions' : 'Failed to logout from all sessions',
        data: {
          sessionsInvalidated: result.data?.sessionsInvalidated || 0
        }
      };
    } else {
      // Invalidate specific session
      const result = await SessionModel.invalidateSession(sessionToken, userId, ipAddress);

      return {
        success: result.success,
        message: result.success ? 'Logged out successfully' : 'Failed to logout',
        data: {
          sessionId: result.data?.sessionId
        }
      };
    }

  } catch (error) {
    console.error('Error in logoutUser:', error);
    return {
      success: false,
      message: 'Logout failed',
      error: error.message
    };
  }
};

/**
 * Refresh authentication tokens
 *
 * @param {string} refreshToken - Refresh token
 * @param {Object} options - Refresh options
 * @returns {Promise<Object>} Token refresh result
 */
const refreshTokens = async (refreshToken, options = {}) => {
  try {
    const { ipAddress, userAgent } = options;

    // Verify refresh token
    const tokenPayload = jwtService.verifyRefreshToken(refreshToken);
    if (!tokenPayload) {
      return {
        success: false,
        message: 'Invalid refresh token'
      };
    }

    // Find user
    const user = await UserModel.findById(tokenPayload.userId);
    if (!user || !user.isActive) {
      return {
        success: false,
        message: 'User not found or inactive'
      };
    }

    // Find session
    const session = await SessionModel.findByRefreshToken(refreshToken);
    if (!session || !session.isActive) {
      return {
        success: false,
        message: 'Session not found or expired'
      };
    }

    // Generate new tokens
    const newTokenPayload = {
      userId: user.id,
      email: user.email,
      isVerified: user.isVerified
    };

    const newAccessToken = jwtService.generateAccessToken(newTokenPayload);
    const newRefreshToken = jwtService.generateRefreshToken(newTokenPayload);

    // Update session with new tokens
    const updateResult = await SessionModel.updateTokens(session.id, newAccessToken, newRefreshToken);

    if (!updateResult.success) {
      return {
        success: false,
        message: 'Failed to update session tokens'
      };
    }

    return {
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.jwt.expiresIn
        }
      }
    };

  } catch (error) {
    console.error('Error in refreshTokens:', error);
    return {
      success: false,
      message: 'Token refresh failed',
      error: error.message
    };
  }
};

/**
 * Verify user email
 *
 * @param {string} token - Email verification token
 * @returns {Promise<Object>} Verification result
 */
const verifyEmail = async (token) => {
  try {
    // Validate token using Yup
    const validatedData = await AuthSchemas.emailVerificationSchema.validate({ token });

    // Verify the token and get user
    const result = await UserModel.verifyEmailToken(validatedData.token);

    return {
      success: result.success,
      message: result.success ? 'Email verified successfully' : result.message,
      data: result.success ? { userId: result.data?.userId } : null
    };

  } catch (error) {
    console.error('Error in verifyEmail:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Invalid verification token format',
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Email verification failed',
      error: error.message
    };
  }
};

/**
 * Get user profile information
 *
 * @param {string} userId - User ID
 * @param {Object} options - Profile options
 * @returns {Promise<Object>} Profile result
 */
const getUserProfile = async (userId, options = {}) => {
  try {
    const { includeStats = false } = options;

    // Find user
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Prepare user response (exclude sensitive data)
    const userProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      isVerified: user.isVerified,
      isActive: user.isActive,
      registeredAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    // Include statistics if requested
    let stats = null;
    if (includeStats) {
      const userStats = await UserModel.getStatistics(userId);
      stats = userStats.data || null;
    }

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        profile: userProfile,
        stats: stats
      }
    };

  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return {
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message
    };
  }
};

/**
 * Update user profile
 *
 * @param {string} userId - User ID
 * @param {Object} updateData - Profile update data
 * @returns {Promise<Object>} Update result
 */
const updateUserProfile = async (userId, updateData) => {
  try {
    // Validate update data using Yup
    const validatedData = await AuthSchemas.profileUpdateSchema.validate(updateData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Update user profile
    const result = await UserModel.update(userId, validatedData);

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to update profile',
        error: result.error
      };
    }

    // Get updated user data
    const updatedUser = await UserModel.findById(userId);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          isVerified: updatedUser.isVerified,
          updatedAt: new Date()
        }
      }
    };

  } catch (error) {
    console.error('Error in updateUserProfile:', error);

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
      message: 'Profile update failed',
      error: error.message
    };
  }
};

/**
 * Get user sessions
 *
 * @param {string} userId - User ID
 * @param {Object} options - Session options
 * @returns {Promise<Object>} Sessions result
 */
const getUserSessions = async (userId, options = {}) => {
  try {
    const { includeInactive = false, page = 1, limit = 10 } = options;

    const sessionsResult = await SessionModel.getUserSessions(userId, {
      includeInactive,
      page,
      limit
    });

    return {
      success: sessionsResult.success,
      message: sessionsResult.success ? 'Sessions retrieved successfully' : sessionsResult.message,
      data: sessionsResult.data
    };

  } catch (error) {
    console.error('Error in getUserSessions:', error);
    return {
      success: false,
      message: 'Failed to retrieve sessions',
      error: error.message
    };
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokens,
  verifyEmail,
  getUserProfile,
  updateUserProfile,
  getUserSessions
};
