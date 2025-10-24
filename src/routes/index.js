const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth/authRoutes');
const passwordRoutes = require('./auth/passwordRoutes');
// Add other route imports here as needed

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth/password', passwordRoutes);
// Add other router.use calls here as needed

module.exports = router;
