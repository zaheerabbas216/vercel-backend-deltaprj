/**
 * Vercel Serverless Function Entry Point
 * 
 * This file is the entry point for Vercel serverless deployment.
 * It exports the Express app as a serverless function handler.
 */

const app = require('../app');

// Export the Express app as a serverless function
module.exports = app;
