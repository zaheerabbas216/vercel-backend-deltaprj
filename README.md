# Delta-2 Backend

A comprehensive Node.js/Express.js monolithic backend API system with 6 core business modules, built for enterprise-grade applications.

## 🚀 Project Overview

Delta-2 Backend is a robust, scalable API system that provides complete business functionality including authentication, role-based access control, customer management, employee management, order tracking, and product management.

### **Key Features**

- 🔐 **JWT Authentication** with password reset and email verification
- 🛡️ **Role-Based Access Control (RBAC)** with granular permissions
- 👥 **Customer Management** with profiles and support ticketing
- 👨‍💼 **Employee Management** with departments and performance tracking
- 📦 **Order Tracking** with real-time status updates
- 🏪 **Product Management** with inventory and category management
- 📊 **Comprehensive Logging** and monitoring
- 🧪 **Complete Testing Suite** with unit and integration tests
- 📚 **API Documentation** with Swagger/OpenAPI

## 🏗️ Architecture

### **Technology Stack**
- **Runtime**: Node.js (>=16.0.0)
- **Framework**: Express.js
- **Database**: MySQL with direct mysql2 driver
- **Validation**: Yup schema validation
- **Authentication**: JWT + Passport.js
- **Testing**: Jest + Supertest
- **Documentation**: Swagger UI

### **Project Structure**
```
delta-2-backend/
├── config/              # Configuration files (database, JWT, email)
├── src/
│   ├── controllers/     # Request handlers by module
│   ├── models/          # Database models (MySQL schemas)
│   ├── routes/          # API route definitions
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic layer
│   ├── validators/      # Yup validation schemas
│   └── utils/           # Helper functions
├── database/
│   ├── migrations/      # Database schema changes (SQL scripts)
│   ├── seeders/         # Initial and sample data (SQL scripts)
│   └── backups/         # Database backups
├── storage/
│   ├── uploads/         # File uploads
│   └── logs/            # Application logs
├── tests/               # Test files
├── docs/                # Documentation
└── scripts/             # Utility scripts
```

## 📦 Core Modules

### 1. **Authentication Module**
- User registration, login, logout
- JWT token management
- Password reset/change functionality
- Email verification
- Session management

### 2. **Role-Based Access Control (RBAC)**
- Dynamic role creation and management
- Granular permission system
- User-role assignments
- Route-level access control

### 3. **Customer Management**
- Customer profile management
- Customer onboarding workflows
- Customer support ticketing
- Address management

### 4. **Employee Management**
- Employee profiles and hierarchy
- Department management
- Attendance tracking
- Performance management

### 5. **Order Tracking System**
- Order lifecycle management
- Real-time status updates
- Order modifications
- Customer notifications
- Reporting and analytics

### 6. **Product Management**
- Product catalog management
- Inventory tracking
- Category management
- Supplier relationships

## 🛠️ Installation & Setup

### **Prerequisites**
- Node.js (>=16.0.0)
- npm (>=8.0.0)
- MySQL (>=8.0.0)

### **Quick Start**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/delta-2-backend.git
   cd delta-2-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **MySQL Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE delta2_backend;
   CREATE USER 'delta2_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON delta2_backend.* TO 'delta2_user'@'localhost';
   FLUSH PRIVILEGES;
   exit;
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL configuration
   ```

5. **Database Initialization**
   ```bash
   # Run database migrations and seeders
   npm run setup
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔧 Environment Configuration

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=delta2_backend
DB_USER=delta2_user
DB_PASSWORD=your_password

# Database Connection Pool
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000
DB_RECONNECT=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@delta2.com

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=true
```

## 🚀 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm start               # Start production server

# Database
npm run db:create       # Create database tables
npm run db:migrate      # Run SQL migrations
npm run db:seed         # Run SQL seeders
npm run db:reset        # Reset database (migrate + seed)
npm run db:backup       # Backup database

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage

# Code Quality
npm run lint           # Check code style
npm run lint:fix       # Fix code style issues
npm run format         # Format code with Prettier
npm run format:check   # Check if code is formatted

# Utilities
npm run logs:clear     # Clear all log files
npm run setup          # Complete project setup
```

## 🗄️ Database Architecture

### **MySQL Schema Design**
The application uses MySQL with direct `mysql2` driver for optimal performance:

- **Connection Pooling**: Efficient connection management
- **Prepared Statements**: SQL injection prevention
- **Transaction Support**: ACID compliance
- **Foreign Key Constraints**: Data integrity
- **Indexing Strategy**: Optimized query performance

### **Migration System**
```bash
# Create new migration
npm run migration:create -- --name create_users_table

# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run migration:rollback
```

### **Database Models**
Direct MySQL integration with custom model layer:
- Raw SQL queries for complex operations
- Query builder for dynamic queries
- Connection pooling for performance
- Transaction management

## 📊 Validation with Yup

The application uses Yup for robust schema validation:

### **Features**
- **Schema-based validation**: Type-safe validation
- **Async validation**: Database existence checks
- **Transform operations**: Data normalization
- **Conditional validation**: Context-aware rules
- **Custom validation**: Business-specific rules

### **Example Usage**
```javascript
// User registration validation
const registerSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain uppercase letter')
    .required('Password is required'),
  firstName: yup
    .string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required')
});
```

## 📡 API Endpoints

### **Authentication**
```
POST   /api/auth/register        # User registration
POST   /api/auth/login           # User login
POST   /api/auth/logout          # User logout
POST   /api/auth/refresh         # Refresh JWT token
GET    /api/auth/profile         # Get user profile
PUT    /api/auth/profile         # Update user profile
POST   /api/auth/verify-email    # Email verification
```

### **Password Management**
```
POST   /api/auth/password/forgot    # Request password reset
POST   /api/auth/password/reset     # Reset password with token
PUT    /api/auth/password/change    # Change password (authenticated)
```

### **Role-Based Access Control**
```
GET    /api/roles                   # Get all roles
POST   /api/roles                   # Create new role
GET    /api/roles/:id               # Get specific role
PUT    /api/roles/:id               # Update role
DELETE /api/roles/:id               # Delete role

GET    /api/permissions             # Get all permissions
POST   /api/permissions             # Create permission
GET    /api/permissions/:id         # Get specific permission
PUT    /api/permissions/:id         # Update permission
DELETE /api/permissions/:id         # Delete permission

POST   /api/user-roles             # Assign role to user
DELETE /api/user-roles             # Remove role from user
```

### **Customer Management (Coming Soon)**
```
GET    /api/customers              # Get all customers
POST   /api/customers              # Create new customer
GET    /api/customers/:id          # Get specific customer
PUT    /api/customers/:id          # Update customer
DELETE /api/customers/:id          # Delete customer
```

*More endpoints will be documented as modules are implemented.*

## 🧪 Testing

The project includes comprehensive testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/controllers/authController.test.js

# Run tests in watch mode
npm run test:watch
```

### **Test Structure**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Full workflow testing with MySQL
- **API Tests**: Endpoint testing with Supertest
- **Validation Tests**: Yup schema testing
- **Database Tests**: MySQL query testing

## 📊 Logging

The application uses Winston for comprehensive logging:

- **Access Logs**: HTTP request logging
- **Error Logs**: Application errors and exceptions
- **Database Logs**: MySQL query logging
- **Application Logs**: General application events
- **Daily Rotation**: Automatic log file rotation

Logs are stored in `storage/logs/` directory.

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: API endpoint protection
- **Yup Validation**: Comprehensive input validation
- **MySQL Prepared Statements**: SQL injection prevention
- **XSS Protection**: Cross-site scripting prevention
- **JWT Security**: Secure token implementation
- **Password Hashing**: bcryptjs encryption
- **Connection Pooling**: Secure database connections

## 📈 Performance Features

- **MySQL Connection Pooling**: Database connection optimization
- **Compression**: Response compression middleware
- **Query Optimization**: Efficient MySQL queries
- **Indexing Strategy**: Database performance optimization
- **Pagination**: Large dataset handling
- **Caching**: Strategic caching implementation
- **File Processing**: Optimized image and file handling

## 🗃️ Database Performance

### **MySQL Optimizations**
- **Indexing**: Strategic index placement
- **Connection Pooling**: 10 concurrent connections
- **Query Caching**: MySQL query cache enabled
- **Prepared Statements**: Query plan reuse
- **Transaction Management**: ACID compliance

### **Monitoring**
```bash
# Database performance monitoring
npm run db:status          # Show connection status
npm run db:slow-queries     # Show slow query log
npm run db:analyze         # Analyze table performance
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**

- Follow ESLint and Prettier configurations
- Write tests for new features
- Use Yup for input validation
- Write efficient MySQL queries
- Update documentation for API changes
- Follow conventional commit messages
- Ensure all tests pass before submitting

## 📝 API Documentation

API documentation is available at:
- **Development**: http://localhost:3000/api-docs
- **Production**: https://your-domain.com/api-docs

Documentation is automatically generated from JSDoc comments and Swagger specifications.

## 🐛 Error Handling

The application includes comprehensive error handling:

- **Global Error Middleware**: Centralized error processing
- **Custom Error Classes**: Specific error types
- **MySQL Error Handling**: Database-specific error management
- **Validation Errors**: Yup validation error formatting
- **Error Logging**: Detailed error tracking
- **Client-Friendly Responses**: User-appropriate error messages
- **Development vs Production**: Environment-specific error details

## 📦 Deployment

### **Production Setup**

1. **MySQL Configuration**
   ```sql
   -- Production database setup
   CREATE DATABASE delta2_backend_prod;
   CREATE USER 'delta2_prod'@'%' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON delta2_backend_prod.* TO 'delta2_prod'@'%';
   FLUSH PRIVILEGES;
   ```

2. **Environment Variables**
   ```env
   NODE_ENV=production
   DB_HOST=your-mysql-host
   DB_USER=delta2_prod
   DB_PASSWORD=secure_password
   DB_NAME=delta2_backend_prod
   ```

3. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

### **Docker Deployment**
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: delta2_backend
      MYSQL_USER: delta2_user
      MYSQL_PASSWORD: password
      MYSQL_ROOT_PASSWORD: rootpassword
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Development Team**: Delta-2 Backend Developers
- **Project Maintainer**: [Your Name]
- **Contributors**: See [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 📞 Support

For support and questions:

- **Issues**: [GitHub Issues](https://github.com/your-username/delta-2-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/delta-2-backend/discussions)
- **Email**: support@delta2.com

---

## 🎯 Roadmap

- [x] Project setup and basic structure
- [x] MySQL integration with mysql2 driver
- [x] Yup validation system
- [x] Authentication and RBAC modules
- [ ] Customer Management module
- [ ] Employee Management module
- [ ] Order Tracking module
- [ ] Product Management module
- [ ] Advanced reporting features
- [ ] Real-time notifications
- [ ] Mobile API optimization
- [ ] Database replication setup
- [ ] Advanced caching layer

---

**Built with ❤️ by the Delta-2 Development Team**