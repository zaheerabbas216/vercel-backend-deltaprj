#!/usr/bin/env node

/**
 * Delta-2 Backend Setup Script
 * Initializes the project with required directories, files, and database setup
 */

const fs = require('fs');
const path = require('path');

class ProjectSetup {
  constructor() {
    this.rootDir = process.cwd();
    this.requiredDirs = [
      'config',
      'src/controllers/auth',
      'src/controllers/rbac',
      'src/controllers/customer',
      'src/controllers/employee',
      'src/controllers/order',
      'src/controllers/product',
      'src/models/auth',
      'src/models/rbac',
      'src/models/customer',
      'src/models/employee',
      'src/models/order',
      'src/models/product',
      'src/routes/auth',
      'src/routes/rbac',
      'src/routes/customer',
      'src/routes/employee',
      'src/routes/order',
      'src/routes/product',
      'src/middleware',
      'src/services/auth',
      'src/services/email',
      'src/services/file',
      'src/services/external',
      'src/services/common',
      'src/validators/auth',
      'src/validators/customer',
      'src/validators/employee',
      'src/validators/order',
      'src/validators/product',
      'src/utils',
      'database/migrations',
      'database/seeders',
      'database/backups',
      'storage/uploads/profiles',
      'storage/uploads/products',
      'storage/uploads/documents',
      'storage/uploads/temp',
      'storage/logs/access',
      'storage/logs/error',
      'storage/logs/application',
      'tests/unit/controllers',
      'tests/unit/services',
      'tests/unit/models',
      'tests/integration',
      'tests/fixtures',
      'tests/helpers',
      'docs/api',
      'docs/database',
      'docs/deployment',
      'scripts',
      '.docker'
    ];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  createDirectories() {
    this.log('Creating project directories...', 'info');

    this.requiredDirs.forEach(dir => {
      const fullPath = path.join(this.rootDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.log(`Created directory: ${dir}`, 'success');
      } else {
        this.log(`Directory already exists: ${dir}`, 'warning');
      }
    });

    // Create .gitkeep files for empty directories
    const emptyDirs = [
      'database/backups',
      'storage/uploads/temp',
      'storage/logs/access',
      'storage/logs/error',
      'storage/logs/application'
    ];

    emptyDirs.forEach(dir => {
      const gitkeepPath = path.join(this.rootDir, dir, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '');
        this.log(`Created .gitkeep in: ${dir}`, 'success');
      }
    });
  }

  createEnvironmentFile() {
    this.log('Creating environment files...', 'info');

    const envExample = `# Environment Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=3306
DB_NAME=delta2_backend_dev
DB_USER=root
DB_PASS=Reusic@123#
DB_STORAGE=./database/delta2_development.sqlite

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Upload Configuration
UPLOAD_DIR=./storage/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_DIR=./storage/logs

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
`;

    const envPath = path.join(this.rootDir, '.env.example');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envExample);
      this.log('Created .env.example file', 'success');
    }

    const actualEnvPath = path.join(this.rootDir, '.env');
    if (!fs.existsSync(actualEnvPath)) {
      fs.writeFileSync(actualEnvPath, envExample);
      this.log('Created .env file', 'success');
      this.log('⚠️  Please update .env with your actual configuration!', 'warning');
    }
  }

  createGitignore() {
    this.log('Creating .gitignore file...', 'info');

    const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.test
.env.production

# Database files
*.sqlite
*.sqlite3
*.db

# Upload directories
storage/uploads/profiles/*
!storage/uploads/profiles/.gitkeep
storage/uploads/products/*
!storage/uploads/products/.gitkeep
storage/uploads/documents/*
!storage/uploads/documents/.gitkeep
storage/uploads/temp/*
!storage/uploads/temp/.gitkeep

# Log files
storage/logs/*
!storage/logs/.gitkeep

# Database backups
database/backups/*
!database/backups/.gitkeep

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Temporary files
tmp/
temp/
`;

    const gitignorePath = path.join(this.rootDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, gitignore);
      this.log('Created .gitignore file', 'success');
    }
  }

  async run() {
    try {
      this.log('Starting Delta-2 Backend project setup...', 'info');

      // Create all required directories
      this.createDirectories();

      // Create environment files
      this.createEnvironmentFile();

      // Create .gitignore
      this.createGitignore();

      this.log('✅ Project setup completed successfully!', 'success');
      this.log('Next steps:', 'info');
      this.log('1. Update .env file with your configuration', 'info');
      this.log('2. Install dependencies: npm install', 'info');
      this.log('3. Run database migrations: npm run db:migrate', 'info');
      this.log('4. Seed database: npm run db:seed', 'info');
      this.log('5. Start development server: npm run dev', 'info');

    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  const setup = new ProjectSetup();
  setup.run();
}

module.exports = ProjectSetup;
