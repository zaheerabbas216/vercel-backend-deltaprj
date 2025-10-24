# Delta-2 Backend - Complete Folder & File Structure

```
delta-2-backend/
│
├── package.json
├── package-lock.json
├── .env
├── .env.example
├── .gitignore
├── README.md
├── server.js
├── app.js
│
├── config/
│   ├── database.js
│   ├── jwt.js
│   ├── email.js
│   ├── upload.js
│   └── environment.js
│
├── src/
│   ├── controllers/
│   │   ├── auth/
│   │   │   ├── authController.js
│   │   │   ├── passwordController.js
│   │   │   └── sessionController.js
│   │   │
│   │   ├── rbac/
│   │   │   ├── roleController.js
│   │   │   ├── permissionController.js
│   │   │   └── userRoleController.js
│   │   │
│   │   ├── customer/
│   │   │   ├── customerController.js
│   │   │   ├── customerProfileController.js
│   │   │   └── customerSupportController.js
│   │   │
│   │   ├── employee/
│   │   │   ├── employeeController.js
│   │   │   ├── departmentController.js
│   │   │   ├── attendanceController.js
│   │   │   └── performanceController.js
│   │   │
│   │   ├── order/
│   │   │   ├── orderController.js
│   │   │   ├── orderTrackingController.js
│   │   │   ├── orderStatusController.js
│   │   │   └── orderReportController.js
│   │   │
│   │   └── product/
│   │       ├── productController.js
│   │       ├── inventoryController.js
│   │       ├── categoryController.js
│   │       └── supplierController.js
│   │
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   │
│   │   ├── auth/
│   │   │   ├── UserSession.js
│   │   │   └── PasswordReset.js
│   │   │
│   │   ├── rbac/
│   │   │   ├── Role.js
│   │   │   ├── Permission.js
│   │   │   ├── RolePermission.js
│   │   │   └── UserRole.js
│   │   │
│   │   ├── customer/
│   │   │   ├── Customer.js
│   │   │   ├── CustomerProfile.js
│   │   │   ├── CustomerAddress.js
│   │   │   └── CustomerSupport.js
│   │   │
│   │   ├── employee/
│   │   │   ├── Employee.js
│   │   │   ├── Department.js
│   │   │   ├── Position.js
│   │   │   ├── Attendance.js
│   │   │   └── Performance.js
│   │   │
│   │   ├── order/
│   │   │   ├── Order.js
│   │   │   ├── OrderItem.js
│   │   │   ├── OrderStatus.js
│   │   │   ├── OrderTracking.js
│   │   │   └── OrderPayment.js
│   │   │
│   │   └── product/
│   │       ├── Product.js
│   │       ├── Category.js
│   │       ├── Inventory.js
│   │       ├── Supplier.js
│   │       └── ProductImage.js
│   │
│   ├── routes/
│   │   ├── index.js
│   │   │
│   │   ├── auth/
│   │   │   ├── authRoutes.js
│   │   │   ├── passwordRoutes.js
│   │   │   └── sessionRoutes.js
│   │   │
│   │   ├── rbac/
│   │   │   ├── roleRoutes.js
│   │   │   ├── permissionRoutes.js
│   │   │   └── userRoleRoutes.js
│   │   │
│   │   ├── customer/
│   │   │   ├── customerRoutes.js
│   │   │   ├── customerProfileRoutes.js
│   │   │   └── customerSupportRoutes.js
│   │   │
│   │   ├── employee/
│   │   │   ├── employeeRoutes.js
│   │   │   ├── departmentRoutes.js
│   │   │   ├── attendanceRoutes.js
│   │   │   └── performanceRoutes.js
│   │   │
│   │   ├── order/
│   │   │   ├── orderRoutes.js
│   │   │   ├── orderTrackingRoutes.js
│   │   │   ├── orderStatusRoutes.js
│   │   │   └── orderReportRoutes.js
│   │   │
│   │   └── product/
│   │       ├── productRoutes.js
│   │       ├── inventoryRoutes.js
│   │       ├── categoryRoutes.js
│   │       └── supplierRoutes.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rbac.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── upload.js
│   │   ├── cors.js
│   │   └── logger.js
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── authService.js
│   │   │   ├── jwtService.js
│   │   │   └── passwordService.js
│   │   │
│   │   ├── email/
│   │   │   ├── emailService.js
│   │   │   ├── templateService.js
│   │   │   └── notificationService.js
│   │   │
│   │   ├── file/
│   │   │   ├── uploadService.js
│   │   │   ├── imageService.js
│   │   │   └── csvService.js
│   │   │
│   │   ├── external/
│   │   │   ├── paymentService.js
│   │   │   ├── shippingService.js
│   │   │   └── smsService.js
│   │   │
│   │   └── common/
│   │       ├── validationService.js
│   │       ├── encryptionService.js
│   │       └── utilityService.js
│   │
│   ├── validators/
│   │   ├── auth/
│   │   │   ├── loginValidator.js
│   │   │   ├── registerValidator.js
│   │   │   └── passwordValidator.js
│   │   │
│   │   ├── customer/
│   │   │   ├── customerValidator.js
│   │   │   └── customerProfileValidator.js
│   │   │
│   │   ├── employee/
│   │   │   ├── employeeValidator.js
│   │   │   └── attendanceValidator.js
│   │   │
│   │   ├── order/
│   │   │   ├── orderValidator.js
│   │   │   └── orderTrackingValidator.js
│   │   │
│   │   └── product/
│   │       ├── productValidator.js
│   │       └── inventoryValidator.js
│   │
│   └── utils/
│       ├── constants.js
│       ├── helpers.js
│       ├── dateUtils.js
│       ├── stringUtils.js
│       ├── apiResponse.js
│       └── errorCodes.js
│
├── database/
│   ├── migrations/
│   │   ├── 001-create-users.js
│   │   ├── 002-create-roles-permissions.js
│   │   ├── 003-create-customers.js
│   │   ├── 004-create-employees.js
│   │   ├── 005-create-products.js
│   │   ├── 006-create-orders.js
│   │   └── 007-create-relationships.js
│   │
│   ├── seeders/
│   │   ├── 001-admin-user.js
│   │   ├── 002-default-roles.js
│   │   ├── 003-default-permissions.js
│   │   ├── 004-sample-customers.js
│   │   ├── 005-sample-employees.js
│   │   └── 006-sample-products.js
│   │
│   └── backups/
│       └── .gitkeep
│
├── storage/
│   ├── uploads/
│   │   ├── profiles/
│   │   ├── products/
│   │   ├── documents/
│   │   └── temp/
│   │
│   └── logs/
│       ├── access/
│       ├── error/
│       └── application/
│
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   │   ├── authController.test.js
│   │   │   ├── customerController.test.js
│   │   │   ├── employeeController.test.js
│   │   │   ├── orderController.test.js
│   │   │   └── productController.test.js
│   │   │
│   │   ├── services/
│   │   │   ├── authService.test.js
│   │   │   ├── emailService.test.js
│   │   │   └── jwtService.test.js
│   │   │
│   │   └── models/
│   │       ├── User.test.js
│   │       ├── Customer.test.js
│   │       ├── Employee.test.js
│   │       ├── Order.test.js
│   │       └── Product.test.js
│   │
│   ├── integration/
│   │   ├── auth.test.js
│   │   ├── customer.test.js
│   │   ├── employee.test.js
│   │   ├── order.test.js
│   │   └── product.test.js
│   │
│   ├── fixtures/
│   │   ├── users.json
│   │   ├── customers.json
│   │   ├── employees.json
│   │   ├── orders.json
│   │   └── products.json
│   │
│   └── helpers/
│       ├── testDatabase.js
│       ├── testAuth.js
│       └── testUtils.js
│
├── docs/
│   ├── api/
│   │   ├── authentication.md
│   │   ├── customers.md
│   │   ├── employees.md
│   │   ├── orders.md
│   │   └── products.md
│   │
│   ├── database/
│   │   ├── schema.md
│   │   ├── relationships.md
│   │   └── migrations.md
│   │
│   └── deployment/
│       ├── setup.md
│       ├── environment.md
│       └── troubleshooting.md
│
├── scripts/
│   ├── setup.js
│   ├── seed.js
│   ├── backup.js
│   ├── cleanup.js
│   └── deploy.sh
│
└── .docker/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── docker-compose.dev.yml
    └── .dockerignore
```

## Key File Descriptions:

### **Root Level Files:**
- **server.js**: Entry point, starts the server
- **app.js**: Express app configuration and middleware setup
- **.env**: Environment variables (database, JWT secrets, etc.)
- **.env.example**: Template for environment variables

### **Config Directory:**
- **database.js**: Database connection configuration
- **jwt.js**: JWT token configuration
- **email.js**: Email service configuration
- **upload.js**: File upload configuration

### **Source Directory (src/):**
- **controllers/**: Handle HTTP requests and responses
- **models/**: Database models and relationships
- **routes/**: API route definitions
- **middleware/**: Custom middleware functions
- **services/**: Business logic and external integrations
- **validators/**: Input validation schemas
- **utils/**: Utility functions and helpers

### **Database Directory:**
- **migrations/**: Database schema changes
- **seeders/**: Initial data for development
- **backups/**: Database backup files

### **Storage Directory:**
- **uploads/**: User-uploaded files (images, documents)
- **logs/**: Application, access, and error logs

### **Tests Directory:**
- **unit/**: Individual component tests
- **integration/**: Full workflow tests
- **fixtures/**: Test data
- **helpers/**: Test utilities

### **Documentation:**
- **api/**: API endpoint documentation
- **database/**: Database schema and relationship docs
- **deployment/**: Setup and deployment guides

This structure provides:
- ✅ **Clear separation of concerns**
- ✅ **Scalable organization**
- ✅ **Easy navigation**
- ✅ **Comprehensive testing structure**
- ✅ **Complete documentation**
- ✅ **Production-ready setup**