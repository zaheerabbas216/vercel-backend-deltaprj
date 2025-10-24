/**
 * Custom Database Seeder Runner
 *
 * This script runs SQL seeder files to populate the database with initial data.
 * Seeders add sample or required data like admin users, default roles, etc.
 *
 * For beginners:
 * - Seeders are SQL files that insert initial data into your database
 * - They run after migrations to populate tables with required data
 * - Like migrations, we track which seeders have run to avoid duplicates
 * - Use seeders for admin users, default settings, sample data, etc.
 */

const fs = require('fs').promises;
const path = require('path');
const { executeQuery, executeTransaction, testConnection } = require('../src/models/database');

// Seeder configuration
const SEEDERS_DIR = path.join(__dirname, '../database/seeders');
const SEEDER_TABLE = 'database_seeders';

/**
 * Create seeders tracking table if it doesn't exist
 * This table keeps track of which seeders have been run
 */
async function createSeedersTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${SEEDER_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seeder_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_seeder_name (seeder_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  try {
    await executeQuery(createTableQuery);
    console.log('✅ Seeders tracking table ready');
  } catch (error) {
    console.error('❌ Failed to create seeders table:', error);
    throw error;
  }
}

/**
 * Get list of seeder files from the seeders directory
 * Only includes .sql files and sorts them alphabetically
 */
async function getSeederFiles() {
  try {
    const files = await fs.readdir(SEEDERS_DIR);

    // Filter only .sql files and sort them
    const seederFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Alphabetical sort ensures proper order (001, 002, etc.)

    console.log(`📁 Found ${seederFiles.length} seeder files`);
    return seederFiles;
  } catch (error) {
    console.error('❌ Failed to read seeders directory:', error);
    throw error;
  }
}

/**
 * Get list of seeders that have already been executed
 */
async function getExecutedSeeders() {
  try {
    const query = `SELECT seeder_name FROM ${SEEDER_TABLE} ORDER BY seeder_name`;
    const results = await executeQuery(query);

    const executedSeeders = results.map(row => row.seeder_name);
    console.log(`📋 ${executedSeeders.length} seeders already executed`);

    return executedSeeders;
  } catch (error) {
    console.error('❌ Failed to get executed seeders:', error);
    throw error;
  }
}

/**
 * Read and parse SQL seeder file
 * Handles multiple SQL statements separated by semicolons
 */
async function readSeederFile(filename) {
  try {
    const filePath = path.join(SEEDERS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf8');

    // Split by semicolons and filter out empty statements
    const statements = content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📄 Loaded seeder ${filename} with ${statements.length} statements`);
    return statements;
  } catch (error) {
    console.error(`❌ Failed to read seeder file ${filename}:`, error);
    throw error;
  }
}

/**
 * Execute a single seeder file
 * All statements in the seeder run in a transaction
 */
async function executeSeeder(filename) {
  console.log(`🔄 Executing seeder: ${filename}`);

  try {
    // Read seeder file
    const statements = await readSeederFile(filename);

    if (statements.length === 0) {
      console.log(`⚠️ Seeder ${filename} is empty, skipping`);
      return;
    }

    // Execute all statements in a transaction
    await executeTransaction(async (connection) => {
      for (const statement of statements) {
        console.log(`   ⚡ Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
      }

      // Record that this seeder was executed
      const recordQuery = `
        INSERT INTO ${SEEDER_TABLE} (seeder_name) 
        VALUES (?)
      `;
      await connection.execute(recordQuery, [filename]);
    });

    console.log(`✅ Seeder ${filename} completed successfully`);
  } catch (error) {
    console.error(`❌ Seeder ${filename} failed:`, error);
    throw error;
  }
}

/**
 * Run all pending seeders
 */
async function runSeeders() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection established\n');

    // Create seeders table if needed
    await createSeedersTable();

    // Get seeder files and executed seeders
    const seederFiles = await getSeederFiles();
    const executedSeeders = await getExecutedSeeders();

    // Find pending seeders
    const pendingSeeders = seederFiles.filter(
      file => !executedSeeders.includes(file)
    );

    if (pendingSeeders.length === 0) {
      console.log('✅ No pending seeders. Database is already seeded!\n');
      return;
    }

    console.log(`📋 Found ${pendingSeeders.length} pending seeders:\n`);
    pendingSeeders.forEach(seeder => {
      console.log(`   • ${seeder}`);
    });
    console.log('');

    // Execute each pending seeder
    for (const seeder of pendingSeeders) {
      await executeSeeder(seeder);
    }

    console.log(`\n🎉 Successfully executed ${pendingSeeders.length} seeders!`);
    console.log('✅ Database is now seeded with initial data\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error('💡 Please fix the error and run seeders again\n');
    process.exit(1);
  }
}

/**
 * Show seeder status without running anything
 */
async function showSeederStatus() {
  try {
    console.log('📊 Seeder Status:\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('❌ Database connection failed\n');
      return;
    }

    // Create seeders table if needed (for status checking)
    await createSeedersTable();

    // Get seeder files and executed seeders
    const seederFiles = await getSeederFiles();
    const executedSeeders = await getExecutedSeeders();

    console.log('Seeder Files Status:');
    console.log('='.repeat(50));

    seederFiles.forEach(file => {
      const status = executedSeeders.includes(file) ? '✅ Executed' : '⏳ Pending';
      console.log(`${status} - ${file}`);
    });

    const pendingCount = seederFiles.length - executedSeeders.length;
    console.log('\nSummary:');
    console.log(`  Total seeders: ${seederFiles.length}`);
    console.log(`  Executed: ${executedSeeders.length}`);
    console.log(`  Pending: ${pendingCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Failed to get seeder status:', error);
  }
}

/**
 * Reset all seeders (remove tracking records)
 * This allows seeders to run again - useful for development
 */
async function resetSeeders() {
  try {
    console.log('🔄 Resetting seeders...\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Create seeders table if needed
    await createSeedersTable();

    // Clear all seeder records
    const deleteQuery = `DELETE FROM ${SEEDER_TABLE}`;
    const result = await executeQuery(deleteQuery);

    console.log(`✅ Cleared ${result.affectedRows} seeder records`);
    console.log('💡 All seeders can now run again\n');

  } catch (error) {
    console.error('❌ Failed to reset seeders:', error);
  }
}

/**
 * Run specific seeder by name
 */
async function runSpecificSeeder(seederName) {
  try {
    console.log(`🔄 Running specific seeder: ${seederName}\n`);

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Create seeders table if needed
    await createSeedersTable();

    // Check if seeder file exists
    const seederFiles = await getSeederFiles();
    if (!seederFiles.includes(seederName)) {
      console.log(`❌ Seeder file not found: ${seederName}`);
      console.log('Available seeders:');
      seederFiles.forEach(file => console.log(`   • ${file}`));
      return;
    }

    // Check if already executed
    const executedSeeders = await getExecutedSeeders();
    if (executedSeeders.includes(seederName)) {
      console.log(`⚠️ Seeder ${seederName} has already been executed`);
      console.log('💡 Use --force flag to run it again\n');
      return;
    }

    // Execute the specific seeder
    await executeSeeder(seederName);

    console.log(`\n✅ Seeder ${seederName} completed successfully!\n`);

  } catch (error) {
    console.error(`❌ Failed to run seeder ${seederName}:`, error);
  }
}

/**
 * Force run a specific seeder (even if already executed)
 */
async function forceRunSeeder(seederName) {
  try {
    console.log(`🔄 Force running seeder: ${seederName}\n`);

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Create seeders table if needed
    await createSeedersTable();

    // Check if seeder file exists
    const seederFiles = await getSeederFiles();
    if (!seederFiles.includes(seederName)) {
      console.log(`❌ Seeder file not found: ${seederName}`);
      console.log('Available seeders:');
      seederFiles.forEach(file => console.log(`   • ${file}`));
      return;
    }

    // Remove from executed seeders if it exists
    const deleteQuery = `DELETE FROM ${SEEDER_TABLE} WHERE seeder_name = ?`;
    await executeQuery(deleteQuery, [seederName]);

    // Execute the seeder
    await executeSeeder(seederName);

    console.log(`\n✅ Seeder ${seederName} force executed successfully!\n`);

  } catch (error) {
    console.error(`❌ Failed to force run seeder ${seederName}:`, error);
  }
}

/**
 * Create a new seeder file template
 */
async function createSeederFile(name) {
  try {
    // Generate filename with timestamp
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const filename = `${timestamp}-${name}.sql`;
    const filePath = path.join(SEEDERS_DIR, filename);

    // Seeder template
    const template = `-- Seeder: ${name}
-- Created: ${new Date().toISOString()}
-- Description: Add description of what this seeder does

-- Example: Insert default roles
-- INSERT INTO roles (name, description, created_at) VALUES
-- ('admin', 'Administrator role with full access', NOW()),
-- ('user', 'Regular user role with limited access', NOW());

-- Example: Insert default permissions
-- INSERT INTO permissions (name, description, created_at) VALUES
-- ('users.create', 'Create new users', NOW()),
-- ('users.read', 'View users', NOW()),
-- ('users.update', 'Update users', NOW()),
-- ('users.delete', 'Delete users', NOW());

-- Add your SQL INSERT statements here
-- Remember to use proper data types and handle foreign keys correctly

-- Tips:
-- - Use NOW() or CURRENT_TIMESTAMP for timestamp fields
-- - Be careful with foreign key relationships
-- - Consider using INSERT IGNORE to avoid duplicate errors
-- - Test your SQL statements before running the seeder`;

    await fs.writeFile(filePath, template);
    console.log(`✅ Created seeder file: ${filename}`);
    console.log(`📁 Location: ${filePath}`);
    console.log('💡 Edit the file to add your SQL INSERT statements\n');

  } catch (error) {
    console.error(`❌ Failed to create seeder file:`, error);
  }
}

/**
 * Main function - handle command line arguments
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  switch (command) {
    case 'run':
    case 'seed':
      await runSeeders();
      break;

    case 'status':
      await showSeederStatus();
      break;

    case 'reset':
      await resetSeeders();
      break;

    case 'create':
      const seederName = args[1];
      if (!seederName) {
        console.log('❌ Seeder name is required');
        console.log('Usage: npm run db:seed create <seeder-name>');
        process.exit(1);
      }
      await createSeederFile(seederName);
      break;

    case 'run-specific':
      const specificSeeder = args[1];
      const forceFlag = args[2] === '--force';

      if (!specificSeeder) {
        console.log('❌ Seeder name is required');
        console.log('Usage: npm run db:seed run-specific <seeder-name> [--force]');
        process.exit(1);
      }

      if (forceFlag) {
        await forceRunSeeder(specificSeeder);
      } else {
        await runSpecificSeeder(specificSeeder);
      }
      break;

    case 'help':
      console.log(`
🌱 Seeder Commands:

  npm run db:seed                           - Run all pending seeders (default)
  npm run db:seed run                       - Run all pending seeders  
  npm run db:seed status                    - Show seeder status
  npm run db:seed reset                     - Reset all seeders (clear tracking)
  npm run db:seed create <name>             - Create new seeder file
  npm run db:seed run-specific <name>       - Run specific seeder
  npm run db:seed run-specific <name> --force - Force run seeder (even if executed)
  npm run db:seed help                      - Show this help message

💡 Tips:
  • Seeder files should be named: 001-description.sql, 002-description.sql, etc.
  • Use INSERT statements to add initial data to your tables
  • Be careful with foreign key relationships and data dependencies
  • Use 'reset' command in development to re-run all seeders
  • Always backup your database before running seeders in production

🔍 Examples:
  npm run db:seed create admin-user         - Create admin user seeder
  npm run db:seed run-specific 001-admin-user.sql - Run specific seeder
      `);
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Run "npm run db:seed help" for available commands');
      process.exit(1);
  }

  // Close database connections
  process.exit(0);
}

// Run the seeder script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Seeder script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runSeeders,
  showSeederStatus,
  resetSeeders,
  runSpecificSeeder,
  forceRunSeeder,
  createSeederFile,
  getSeederFiles,
  getExecutedSeeders
};
