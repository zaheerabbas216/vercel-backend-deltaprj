/**
 * File: src/models/index.js
 * Model Registry - Central Model Exports and Database Management
 *
 * This file serves as the main entry point for all database models.
 * It provides centralized access to models and database utilities.
 *
 * For beginners:
 * - This file imports all our model classes and exports them in one place
 * - Instead of importing models individually, you can import them all from here
 * - It also provides database health checks and connection management
 * - Think of it as a "phone book" for all your database models
 */

const { getConnection, closePool, checkHealth } = require('./database');

// Import Authentication Models
const UserModel = require('./auth/userModel');
const SessionModel = require('./auth/sessionModel');
const PasswordResetModel = require('./auth/passwordResetModel');

// Import RBAC Models
const RoleModel = require('./rbac/roleModel');
const PermissionModel = require('./rbac/permissionModel');
const RolePermissionModel = require('./rbac/rolePermissionModel');
const UserRoleModel = require('./rbac/userRoleModel');

/**
 * Model Registry Class
 * Provides centralized access to all models and database utilities
 */
class ModelRegistry {
  /**
     * Initialize the model registry
     * Sets up database connections and validates models
     *
     * @returns {Promise<Object>} Initialization result
     */
  static async initialize() {
    try {
      console.log('🚀 Initializing Model Registry...');

      // Check database connection health
      const healthCheck = await this.checkDatabaseHealth();

      if (!healthCheck.success) {
        throw new Error(`Database health check failed: ${healthCheck.message}`);
      }

      console.log('✅ Model Registry initialized successfully');
      console.log(`📊 Database Status: ${healthCheck.status}`);

      return {
        success: true,
        message: 'Model Registry initialized successfully',
        databaseStatus: healthCheck.status,
        models: this.getAvailableModels()
      };

    } catch (error) {
      console.error('❌ Model Registry initialization failed:', error);
      return {
        success: false,
        message: `Model Registry initialization failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Get all available models
     *
     * @returns {Array} List of available models
     */
  static getAvailableModels() {
    return [
      { category: 'Authentication', models: ['User', 'Session', 'PasswordReset'] },
      { category: 'RBAC', models: ['Role', 'Permission', 'RolePermission', 'UserRole'] }
    ];
  }

  /**
     * Check database health and connectivity
     *
     * @returns {Promise<Object>} Health check result
     */
  static async checkDatabaseHealth() {
    try {
      const health = await checkHealth();

      return {
        success: true,
        status: health.status,
        message: 'Database is healthy',
        details: {
          connected: health.connected,
          activeConnections: health.activeConnections,
          totalConnections: health.totalConnections,
          freeConnections: health.freeConnections,
          queuedRequests: health.queuedRequests,
          serverVersion: health.serverVersion
        }
      };

    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        message: `Database health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Test all model connections
     * Verifies that each model can perform basic database operations
     *
     * @returns {Promise<Object>} Model test results
     */
  static async testModels() {
    try {
      console.log('🧪 Testing model connections...');

      const testResults = {
        passed: [],
        failed: [],
        total: 0
      };

      // Test Authentication Models
      const authTests = [
        { name: 'UserModel', test: () => UserModel.getStatistics() },
        { name: 'SessionModel', test: () => SessionModel.getStatistics() },
        { name: 'PasswordResetModel', test: () => PasswordResetModel.getStatistics() }
      ];

      // Test RBAC Models
      const rbacTests = [
        { name: 'RoleModel', test: () => RoleModel.getStatistics() },
        { name: 'PermissionModel', test: () => PermissionModel.getStatistics() },
        { name: 'RolePermissionModel', test: () => RolePermissionModel.getStatistics() },
        { name: 'UserRoleModel', test: () => UserRoleModel.getRoleStats() }
      ];

      const allTests = [...authTests, ...rbacTests];
      testResults.total = allTests.length;

      // Run each test
      for (const modelTest of allTests) {
        try {
          await modelTest.test();
          testResults.passed.push(modelTest.name);
          console.log(`✅ ${modelTest.name} - Connection OK`);
        } catch (error) {
          testResults.failed.push({
            name: modelTest.name,
            error: error.message
          });
          console.log(`❌ ${modelTest.name} - Connection Failed: ${error.message}`);
        }
      }

      const success = testResults.failed.length === 0;
      const message = success
        ? 'All model connections tested successfully'
        : `${testResults.failed.length} model(s) failed connection test`;

      return {
        success,
        message,
        results: testResults
      };

    } catch (error) {
      console.error('❌ Model testing failed:', error);
      return {
        success: false,
        message: `Model testing failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Get model statistics summary
     * Provides overview of data across all models
     *
     * @returns {Promise<Object>} Statistics summary
     */
  static async getModelStatistics() {
    try {
      console.log('📊 Gathering model statistics...');

      const stats = {
        authentication: {},
        rbac: {},
        summary: {
          totalUsers: 0,
          totalRoles: 0,
          totalPermissions: 0,
          totalSessions: 0,
          totalPasswordResets: 0
        }
      };

      // Get Authentication Statistics
      try {
        const userStats = await UserModel.getStatistics();
        stats.authentication.users = userStats.data || userStats;
        stats.summary.totalUsers = userStats.data?.totalUsers || 0;
      } catch (error) {
        console.log(`⚠️ Could not get user statistics: ${error.message}`);
        stats.authentication.users = { error: error.message };
      }

      try {
        const sessionStats = await SessionModel.getStatistics();
        stats.authentication.sessions = sessionStats.data || sessionStats;
        stats.summary.totalSessions = sessionStats.data?.totalSessions || 0;
      } catch (error) {
        console.log(`⚠️ Could not get session statistics: ${error.message}`);
        stats.authentication.sessions = { error: error.message };
      }

      try {
        const resetStats = await PasswordResetModel.getStatistics();
        stats.authentication.passwordResets = resetStats;
        stats.summary.totalPasswordResets = resetStats.total_requests || 0;
      } catch (error) {
        console.log(`⚠️ Could not get password reset statistics: ${error.message}`);
        stats.authentication.passwordResets = { error: error.message };
      }

      // Get RBAC Statistics
      try {
        const roleStats = await RoleModel.getStatistics();
        stats.rbac.roles = roleStats.data || roleStats;
        stats.summary.totalRoles = roleStats.data?.totalRoles || 0;
      } catch (error) {
        console.log(`⚠️ Could not get role statistics: ${error.message}`);
        stats.rbac.roles = { error: error.message };
      }

      try {
        const permissionStats = await PermissionModel.getStatistics();
        stats.rbac.permissions = permissionStats.data || permissionStats;
        stats.summary.totalPermissions = permissionStats.data?.totalPermissions || 0;
      } catch (error) {
        console.log(`⚠️ Could not get permission statistics: ${error.message}`);
        stats.rbac.permissions = { error: error.message };
      }

      try {
        const rolePermStats = await RolePermissionModel.getStatistics();
        stats.rbac.rolePermissions = rolePermStats.data || rolePermStats;
      } catch (error) {
        console.log(`⚠️ Could not get role-permission statistics: ${error.message}`);
        stats.rbac.rolePermissions = { error: error.message };
      }

      try {
        const userRoleStats = await UserRoleModel.getRoleStats();
        stats.rbac.userRoles = userRoleStats.data || userRoleStats;
      } catch (error) {
        console.log(`⚠️ Could not get user-role statistics: ${error.message}`);
        stats.rbac.userRoles = { error: error.message };
      }

      return {
        success: true,
        message: 'Model statistics gathered successfully',
        data: stats
      };

    } catch (error) {
      console.error('❌ Error gathering model statistics:', error);
      return {
        success: false,
        message: `Failed to gather model statistics: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Gracefully close all database connections
     * Should be called during application shutdown
     *
     * @returns {Promise<Object>} Cleanup result
     */
  static async cleanup() {
    try {
      console.log('🧹 Cleaning up Model Registry...');

      await closePool();

      console.log('✅ Model Registry cleanup completed');
      return {
        success: true,
        message: 'Model Registry cleanup completed successfully'
      };

    } catch (error) {
      console.error('❌ Model Registry cleanup failed:', error);
      return {
        success: false,
        message: `Model Registry cleanup failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
     * Get a specific model by name
     * Provides a dynamic way to access models
     *
     * @param {string} modelName - Name of the model to retrieve
     * @returns {Object|null} Model class or null if not found
     */
  static getModel(modelName) {
    const models = {
      // Authentication Models
      'User': UserModel,
      'UserModel': UserModel,
      'Session': SessionModel,
      'SessionModel': SessionModel,
      'PasswordReset': PasswordResetModel,
      'PasswordResetModel': PasswordResetModel,

      // RBAC Models
      'Role': RoleModel,
      'RoleModel': RoleModel,
      'Permission': PermissionModel,
      'PermissionModel': PermissionModel,
      'RolePermission': RolePermissionModel,
      'RolePermissionModel': RolePermissionModel,
      'UserRole': UserRoleModel,
      'UserRoleModel': UserRoleModel
    };

    return models[modelName] || null;
  }

  /**
     * Check if a model exists
     *
     * @param {string} modelName - Name of the model to check
     * @returns {boolean} True if model exists
     */
  static hasModel(modelName) {
    return this.getModel(modelName) !== null;
  }
}

// Export all models individually (for direct imports)
module.exports = {
  // Model Registry
  ModelRegistry,

  // Authentication Models
  UserModel,
  SessionModel,
  PasswordResetModel,

  // RBAC Models
  RoleModel,
  PermissionModel,
  RolePermissionModel,
  UserRoleModel,

  // Database Utilities (re-exported for convenience)
  getConnection,
  closePool,
  checkHealth,

  // Grouped exports for organized imports
  Auth: {
    UserModel,
    SessionModel,
    PasswordResetModel
  },

  RBAC: {
    RoleModel,
    PermissionModel,
    RolePermissionModel,
    UserRoleModel
  },

  // Utility functions
  initialize: ModelRegistry.initialize.bind(ModelRegistry),
  testModels: ModelRegistry.testModels.bind(ModelRegistry),
  getModelStatistics: ModelRegistry.getModelStatistics.bind(ModelRegistry),
  cleanup: ModelRegistry.cleanup.bind(ModelRegistry),
  getModel: ModelRegistry.getModel.bind(ModelRegistry),
  hasModel: ModelRegistry.hasModel.bind(ModelRegistry)
};
