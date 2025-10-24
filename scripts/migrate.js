/**
 * Custom Database Migration Runner
 *
 * This script runs SQL migration files in order to set up or update the database schema.
 * Migrations are like version control for your database - they track changes over time.
 *
 * For beginners:
 * - Migrations are SQL files that create or modify database tables
 * - They run in order (001, 002, 003, etc.) to build your database schema
 * - We track which migrations have run to avoid running them twice
 * - This script is much simpler than ORM migrations - just plain SQL
 */

const fs = require('fs').promises;
const path = require('path');
const { executeQuery, executeTransaction, testConnection } = require('../src/models/database');

// Migration configuration
const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');
const MIGRATION_TABLE = 'schema_migrations';

/**
 * Create migrations tracking table if it doesn't exist
 * This table keeps track of which migrations have been run
 */
async function createMigrationsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_migration_name (migration_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  try {
    await executeQuery(createTableQuery);
    console.log('✅ Migrations tracking table ready');
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error);
    throw error;
  }
}

/**
 * Get list of migration files from the migrations directory
 * Only includes .sql files and sorts them alphabetically
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);

    // Filter only .sql files and sort them
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Alphabetical sort ensures proper order (001, 002, etc.)

    console.log(`📁 Found ${migrationFiles.length} migration files`);
    return migrationFiles;
  } catch (error) {
    console.error('❌ Failed to read migrations directory:', error);
    throw error;
  }
}

/**
 * Get list of migrations that have already been executed
 */
async function getExecutedMigrations() {
  try {
    const query = `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY migration_name`;
    const results = await executeQuery(query);

    const executedMigrations = results.map(row => row.migration_name);
    console.log(`📋 ${executedMigrations.length} migrations already executed`);

    return executedMigrations;
  } catch (error) {
    console.error('❌ Failed to get executed migrations:', error);
    throw error;
  }
}

/**
 * Read and parse SQL migration file
 * Handles multiple SQL statements separated by semicolons
 */
async function readMigrationFile(filename) {
  try {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf8');

    //Split by semicolons and filter out empty statements
    const statements = content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    console.log(`📄 Loaded migration ${filename} with ${statements.length} statements`);
    return statements;
    // console.log(`📄 Loaded migration ${filename}`);
    // return [content.trim()];
  } catch (error) {
    console.error(`❌ Failed to read migration file ${filename}:`, error);
    throw error;
  }
}

/**
 * Execute a single migration file
 * All statements in the migration run in a transaction
 */
async function executeMigration(filename) {
  console.log(`🔄 Executing migration: ${filename}`);

  try {
    // Read migration file
    const statements = await readMigrationFile(filename);

    if (statements.length === 0) {
      console.log(`⚠️ Migration ${filename} is empty, skipping`);
      return;
    }

    // Execute all statements in a transaction
    await executeTransaction(async (connection) => {
      for (const statement of statements) {
        console.log(`   ⚡ Executing: ${statement.substring(0, 50)}...`);
        // await connection.execute(statement);
        try {
          await connection.query(statement);
        } catch (error) {
          // Ignore duplicate index/key errors
          if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_DUP_INDEX') {
            console.log(`   ⚠️  Index already exists, skipping`);
          } else if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log(`   ⚠️  Cannot drop index, skipping`);
          } else {
            throw error; // Re-throw other errors
          }
        }
      }

      // Record that this migration was executed
      const recordQuery = `
        INSERT INTO ${MIGRATION_TABLE} (migration_name) 
        VALUES (?)
      `;
      await connection.execute(recordQuery, [filename]);
    });

    console.log(`✅ Migration ${filename} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection established\n');

    // Create migrations table if needed
    await createMigrationsTable();

    // Get migration files and executed migrations
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();

    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations. Database is up to date!\n');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations:\n`);
    pendingMigrations.forEach(migration => {
      console.log(`   • ${migration}`);
    });
    console.log('');

    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log(`\n🎉 Successfully executed ${pendingMigrations.length} migrations!`);
    console.log('✅ Database schema is now up to date\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('💡 Please fix the error and run migrations again\n');
    process.exit(1);
  }
}

/**
 * Show migration status without running anything
 */
async function showMigrationStatus() {
  try {
    console.log('📊 Migration Status:\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('❌ Database connection failed\n');
      return;
    }

    // Create migrations table if needed (for status checking)
    await createMigrationsTable();

    // Get migration files and executed migrations
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();

    console.log('Migration Files Status:');
    console.log('='.repeat(50));

    migrationFiles.forEach(file => {
      const status = executedMigrations.includes(file) ? '✅ Executed' : '⏳ Pending';
      console.log(`${status} - ${file}`);
    });

    const pendingCount = migrationFiles.length - executedMigrations.length;
    console.log('\nSummary:');
    console.log(`  Total migrations: ${migrationFiles.length}`);
    console.log(`  Executed: ${executedMigrations.length}`);
    console.log(`  Pending: ${pendingCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
  }
}

/**
 * Rollback last migration (if rollback file exists)
 * This is a basic rollback - only works if you create rollback files
 */
async function rollbackLastMigration() {
  try {
    console.log('🔄 Rolling back last migration...\n');

    // Get last executed migration
    const query = `
      SELECT migration_name FROM ${MIGRATION_TABLE} 
      ORDER BY executed_at DESC 
      LIMIT 1
    `;
    const results = await executeQuery(query);

    if (results.length === 0) {
      console.log('ℹ️ No migrations to rollback\n');
      return;
    }

    const lastMigration = results[0].migration_name;
    console.log(`📄 Last migration: ${lastMigration}`);

    // Look for rollback file (e.g., 001-rollback-create-users.sql)
    const rollbackFileName = lastMigration.replace('.sql', '-rollback.sql');
    const rollbackPath = path.join(MIGRATIONS_DIR, rollbackFileName);

    try {
      await fs.access(rollbackPath);
    } catch (error) {
      console.log(`⚠️ No rollback file found: ${rollbackFileName}`);
      console.log('💡 Create a rollback file to enable rollback functionality\n');
      return;
    }

    // Execute rollback
    const rollbackStatements = await readMigrationFile(rollbackFileName);

    await executeTransaction(async (connection) => {
      for (const statement of rollbackStatements) {
        console.log(`   ⚡ Rolling back: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }

      // Remove migration record
      const deleteQuery = `DELETE FROM ${MIGRATION_TABLE} WHERE migration_name = ?`;
      await connection.execute(deleteQuery, [lastMigration]);
    });

    console.log(`✅ Rollback completed for: ${lastMigration}\n`);

  } catch (error) {
    console.error('❌ Rollback failed:', error);
  }
}

/**
 * Main function - handle command line arguments
 */
async function main() {

  const args = process.argv.slice(2);

  // Handle both --rollback and rollback formats

  let command = args[0] || 'up';


  // Remove leading dashes if present

  if (command.startsWith('--')) {

    command = command.substring(2);

  } else if (command.startsWith('-')) {

    command = command.substring(1);

  }


  switch (command) {

    case 'up':

    case 'migrate':

      await runMigrations();

      break;


    case 'status':

      await showMigrationStatus();

      break;


    case 'rollback':

      await rollbackLastMigration();

      break;


    case 'help':

      console.log(`

📚 Migration Commands:



  npm run db:migrate              - Run all pending migrations (default)

  npm run db:migrate up           - Run all pending migrations  

  npm run db:migrate status       - Show migration status

  npm run db:migrate rollback     - Rollback last migration

  npm run db:migrate help         - Show this help message



💡 Tips:

  • Migration files should be named: 001-description.sql, 002-description.sql, etc.

  • Create rollback files as: 001-description-rollback.sql for rollback support

  • Always backup your database before running migrations in production

      `);

      break;


    default:

      console.log(`❌ Unknown command: ${command}`);

      console.log('Run "npm run db:migrate help" for available commands');

      process.exit(1);

  }
  // Close database connections

  process.exit(0);

}

// Run the migration script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigrations,
  showMigrationStatus,
  rollbackLastMigration,
  getMigrationFiles,
  getExecutedMigrations
};
