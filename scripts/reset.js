/**
 * Database Reset Script
 *
 * This script completely resets the database by dropping all tables,
 * running all migrations, and then running all seeders.
 *
 * For beginners:
 * - This is a "nuclear option" that completely rebuilds your database
 * - Use this during development when you need a fresh start
 * - NEVER use this in production - it will delete all your data!
 * - The process: DROP tables → RUN migrations → RUN seeders
 */

const readline = require('readline');
const { executeQuery, executeTransaction, testConnection } = require('../src/models/database');
const { runMigrations } = require('./migrate');
const { runSeeders } = require('./seed');

/**
 * Create readline interface for user confirmation
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Promisify readline question
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Get all table names in the database
 * We need this to drop all tables in the correct order (foreign key constraints)
 */
async function getAllTables() {
  try {
    const query = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    const results = await executeQuery(query);
    const tableNames = results.map(row => row.TABLE_NAME);

    console.log(`📋 Found ${tableNames.length} tables in database`);
    return tableNames;
  } catch (error) {
    console.error('❌ Failed to get table list:', error);
    throw error;
  }
}

/**
 * Drop all tables in the database
 * We disable foreign key checks temporarily to avoid constraint errors
 */
async function dropAllTables() {
  try {
    console.log('🗑️ Dropping all tables...\n');

    // Get all table names
    const tables = await getAllTables();

    if (tables.length === 0) {
      console.log('ℹ️ No tables to drop\n');
      return;
    }

    // Drop all tables in a transaction
    await executeTransaction(async (connection) => {
      // Disable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      console.log('⚠️ Disabled foreign key checks');

      // Drop each table
      for (const table of tables) {
        console.log(`   🗑️ Dropping table: ${table}`);
        await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
      }

      // Re-enable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Re-enabled foreign key checks');
    });

    console.log(`✅ Dropped ${tables.length} tables successfully\n`);
  } catch (error) {
    console.error('❌ Failed to drop tables:', error);
    throw error;
  }
}

/**
 * Check if database has any tables
 */
async function isDatabaseEmpty() {
  try {
    const tables = await getAllTables();
    return tables.length === 0;
  } catch (error) {
    console.error('❌ Failed to check database state:', error);
    return false;
  }
}

/**
 * Show database status (tables, records, etc.)
 */
async function showDatabaseStatus() {
  try {
    console.log('📊 Database Status:\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('❌ Database connection failed\n');
      return;
    }

    // Get table information
    const query = `
      SELECT 
        TABLE_NAME as table_name,
        TABLE_ROWS as estimated_rows,
        ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as size_mb
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_ROWS DESC
    `;

    const tables = await executeQuery(query);

    if (tables.length === 0) {
      console.log('✅ Database is empty (no tables found)\n');
      return;
    }

    console.log('Database Tables:');
    console.log('='.repeat(60));
    console.log('| Table Name               | Rows  | Size (MB) |');
    console.log('|'.repeat(60));

    let totalRows = 0;
    let totalSize = 0;

    tables.forEach(table => {
      const rows = table.estimated_rows || 0;
      const size = table.size_mb || 0;
      totalRows += parseInt(rows);
      totalSize += parseFloat(size);

      console.log(`| ${table.table_name.padEnd(24)} | ${rows.toString().padStart(5)} | ${size.toString().padStart(9)} |`);
    });

    console.log('|'.repeat(60));
    console.log(`| ${'TOTAL'.padEnd(24)} | ${totalRows.toString().padStart(5)} | ${totalSize.toFixed(2).padStart(9)} |`);
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    console.error('❌ Failed to get database status:', error);
  }
}

/**
 * Reset database completely (drop, migrate, seed)
 */
async function resetDatabase() {
  try {
    console.log('🔄 Starting complete database reset...\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection established\n');

    // Step 1: Drop all existing tables
    await dropAllTables();

    // Step 2: Run all migrations
    console.log('📋 Running migrations...');
    await runMigrations();

    // Step 3: Run all seeders
    console.log('🌱 Running seeders...');
    await runSeeders();

    console.log('🎉 Database reset completed successfully!\n');
    console.log('✅ Your database is now fresh with all tables and initial data\n');

  } catch (error) {
    console.error('\n❌ Database reset failed:', error.message);
    console.error('💡 Please fix the error and try again\n');
    throw error;
  }
}

/**
 * Soft reset - only clear data, keep structure
 * This truncates all tables but keeps the schema
 */
async function softReset() {
  try {
    console.log('🔄 Starting soft database reset (clear data only)...\n');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Get all tables
    const tables = await getAllTables();

    if (tables.length === 0) {
      console.log('ℹ️ No tables found to clear\n');
      return;
    }

    // Clear all data in a transaction
    await executeTransaction(async (connection) => {
      // Disable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      console.log('⚠️ Disabled foreign key checks');

      // Truncate each table (faster than DELETE)
      for (const table of tables) {
        console.log(`   🧹 Clearing table: ${table}`);
        await connection.execute(`TRUNCATE TABLE \`${table}\``);
      }

      // Re-enable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Re-enabled foreign key checks');
    });

    console.log(`✅ Cleared ${tables.length} tables successfully\n`);

    // Run seeders to restore initial data
    console.log('🌱 Running seeders to restore initial data...');
    await runSeeders();

    console.log('🎉 Soft reset completed successfully!\n');
    console.log('✅ Database schema preserved, data cleared and reseeded\n');

  } catch (error) {
    console.error('\n❌ Soft reset failed:', error.message);
    console.error('💡 Please fix the error and try again\n');
    throw error;
  }
}

/**
 * Interactive reset with confirmation
 */
async function interactiveReset() {
  try {
    console.log('⚠️  DANGER: Database Reset Operation\n');

    // Show current database status
    await showDatabaseStatus();

    console.log('🔄 Reset Options:\n');
    console.log('1. Full Reset - Drop all tables, run migrations and seeders');
    console.log('2. Soft Reset - Keep tables, clear data, run seeders');
    console.log('3. Show Status - Display current database status');
    console.log('4. Cancel - Exit without changes\n');

    const choice = await askQuestion('Select option (1-4): ');

    switch (choice.trim()) {
      case '1':
        console.log('\n⚠️  FULL RESET SELECTED');
        console.log('This will completely destroy all data and rebuild the database!\n');

        const confirmFull = await askQuestion('Type "RESET" to confirm full reset: ');
        if (confirmFull.trim().toUpperCase() === 'RESET') {
          await resetDatabase();
        } else {
          console.log('❌ Reset cancelled - confirmation text did not match\n');
        }
        break;

      case '2':
        console.log('\n⚠️  SOFT RESET SELECTED');
        console.log('This will clear all data but keep table structures!\n');

        const confirmSoft = await askQuestion('Type "CLEAR" to confirm soft reset: ');
        if (confirmSoft.trim().toUpperCase() === 'CLEAR') {
          await softReset();
        } else {
          console.log('❌ Reset cancelled - confirmation text did not match\n');
        }
        break;

      case '3':
        await showDatabaseStatus();
        break;

      case '4':
        console.log('✅ Reset cancelled by user\n');
        break;

      default:
        console.log('❌ Invalid option selected\n');
        break;
    }

  } catch (error) {
    console.error('❌ Interactive reset failed:', error);
  } finally {
    rl.close();
  }
}

/**
 * Main function - handle command line arguments
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'interactive';

  try {
    switch (command) {
      case 'full':
      case 'hard':
        console.log('⚠️  Running FULL database reset...\n');
        await resetDatabase();
        break;

      case 'soft':
        console.log('⚠️  Running SOFT database reset...\n');
        await softReset();
        break;

      case 'status':
        await showDatabaseStatus();
        break;

      case 'interactive':
      case 'i':
        await interactiveReset();
        break;

      case 'help':
        console.log(`
🔄 Database Reset Commands:

  npm run db:reset                  - Interactive reset with options (default)
  npm run db:reset full             - Full reset (drop, migrate, seed)
  npm run db:reset soft             - Soft reset (clear data, keep structure)
  npm run db:reset status           - Show database status
  npm run db:reset help             - Show this help message

⚠️  WARNING: These commands will modify or delete your database!

💡 Reset Types:
  • Full Reset: Drops all tables and rebuilds from scratch
  • Soft Reset: Keeps table structure, clears data, restores seeds
  • Interactive: Guides you through options with confirmations

🔒 Safety Features:
  • Interactive mode requires confirmation text
  • Shows database status before reset
  • Uses transactions to ensure consistency
  • Never runs automatically without explicit command
        `);
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run "npm run db:reset help" for available commands');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Reset operation failed:', error);
    process.exit(1);
  }

  // Close database connections
  process.exit(0);
}

// Run the reset script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Reset script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  resetDatabase,
  softReset,
  showDatabaseStatus,
  dropAllTables,
  getAllTables,
  isDatabaseEmpty
};
