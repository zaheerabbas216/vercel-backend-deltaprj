/**
 * Email Configuration for Delta-2 Backend
 *
 * Centralized email service configuration for SMTP, templates, and notifications.
 * Supports both real email sending and mock email service for development.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const config = require('./environment');
const logger = require('../src/utils/logger');

/**
 * Email Configuration Object
 */
const emailConfig = {
  // SMTP Configuration
  smtp: {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // true for 465, false for other ports
    auth: {
      user: config.email.username,
      pass: config.email.password
    },
    tls: {
      rejectUnauthorized: false // For self-signed certificates
    }
  },

  // Default sender information
  defaults: {
    from: `"${config.email.fromName}" <${config.email.from}>`,
    replyTo: config.email.from
  },

  // Email template configuration
  templates: {
    directory: path.join(__dirname, '..', config.email.templateDir),
    cache: process.env.NODE_ENV === 'production', // Cache templates in production
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr'] // Add more languages as needed
  },

  // Email sending options
  options: {
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // 1 second
    rateLimit: 5, // 5 emails per second
    pool: true // Use pooled connections
  },

  // Development and testing options
  development: {
    mockEnabled: config.features.mockEmailEnabled,
    logEmails: true,
    saveToFile: true,
    outputDirectory: path.join(__dirname, '..', 'storage', 'logs', 'emails')
  }
};

/**
 * Create email transporter based on environment
 * @returns {Object} Nodemailer transporter
 */
const createTransporter = () => {
  if (emailConfig.development.mockEnabled) {
    // Mock transporter for development
    return nodemailer.createTransporter({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  // Real SMTP transporter
  return nodemailer.createTransporter({
    ...emailConfig.smtp,
    ...emailConfig.options
  });
};

/**
 * Email Templates Configuration
 */
const emailTemplates = {
  // Authentication emails
  welcome: {
    subject: 'Welcome to Delta-2!',
    template: 'auth/welcome.html',
    textTemplate: 'auth/welcome.txt'
  },

  emailVerification: {
    subject: 'Verify Your Email Address',
    template: 'auth/email-verification.html',
    textTemplate: 'auth/email-verification.txt'
  },

  passwordReset: {
    subject: 'Reset Your Password',
    template: 'auth/password-reset.html',
    textTemplate: 'auth/password-reset.txt'
  },

  passwordChanged: {
    subject: 'Password Changed Successfully',
    template: 'auth/password-changed.html',
    textTemplate: 'auth/password-changed.txt'
  },

  loginAlert: {
    subject: 'New Login Detected',
    template: 'auth/login-alert.html',
    textTemplate: 'auth/login-alert.txt'
  },

  // Customer emails
  customerWelcome: {
    subject: 'Welcome to Our Customer Portal',
    template: 'customer/welcome.html',
    textTemplate: 'customer/welcome.txt'
  },

  orderConfirmation: {
    subject: 'Order Confirmation - {{orderNumber}}',
    template: 'order/confirmation.html',
    textTemplate: 'order/confirmation.txt'
  },

  orderShipped: {
    subject: 'Your Order Has Been Shipped - {{orderNumber}}',
    template: 'order/shipped.html',
    textTemplate: 'order/shipped.txt'
  },

  orderDelivered: {
    subject: 'Your Order Has Been Delivered - {{orderNumber}}',
    template: 'order/delivered.html',
    textTemplate: 'order/delivered.txt'
  },

  // Employee emails
  employeeWelcome: {
    subject: 'Welcome to the Team!',
    template: 'employee/welcome.html',
    textTemplate: 'employee/welcome.txt'
  },

  performanceReview: {
    subject: 'Performance Review Scheduled',
    template: 'employee/performance-review.html',
    textTemplate: 'employee/performance-review.txt'
  },

  // System emails
  systemAlert: {
    subject: 'System Alert - {{alertType}}',
    template: 'system/alert.html',
    textTemplate: 'system/alert.txt'
  },

  maintenanceNotice: {
    subject: 'Scheduled Maintenance Notice',
    template: 'system/maintenance.html',
    textTemplate: 'system/maintenance.txt'
  }
};

/**
 * Email Priority Levels
 */
const EMAIL_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

/**
 * Email Categories
 */
const EMAIL_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  NOTIFICATION: 'notification',
  MARKETING: 'marketing',
  TRANSACTIONAL: 'transactional',
  SYSTEM: 'system'
};

/**
 * Load email template from file
 * @param {string} templatePath - Path to template file
 * @param {Object} variables - Variables to replace in template
 * @returns {string} Processed template content
 */
const loadTemplate = async (templatePath, variables = {}) => {
  try {
    const fullPath = path.join(emailConfig.templates.directory, templatePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Email template not found: ${fullPath}`);
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Simple template variable replacement
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, variables[key]);
    });

    return content;
  } catch (error) {
    logger.error('Error loading email template:', error);
    throw error;
  }
};

/**
 * Create email message object
 * @param {Object} options - Email options
 * @returns {Object} Email message object
 */
const createEmailMessage = async (options) => {
  const {
    to,
    subject,
    template,
    textTemplate,
    variables = {},
    attachments = [],
    priority = EMAIL_PRIORITIES.NORMAL,
    category = EMAIL_CATEGORIES.NOTIFICATION
  } = options;

  const message = {
    from: emailConfig.defaults.from,
    to,
    subject,
    priority,
    headers: {
      'X-Category': category,
      'X-Priority': priority
    }
  };

  // Load HTML template if provided
  if (template) {
    try {
      message.html = await loadTemplate(template, variables);
    } catch (error) {
      logger.warn(`Failed to load HTML template: ${template}`, error);
    }
  }

  // Load text template if provided
  if (textTemplate) {
    try {
      message.text = await loadTemplate(textTemplate, variables);
    } catch (error) {
      logger.warn(`Failed to load text template: ${textTemplate}`, error);
    }
  }

  // Add attachments if provided
  if (attachments.length > 0) {
    message.attachments = attachments;
  }

  return message;
};

/**
 * Send email using configured transporter
 * @param {Object} message - Email message object
 * @returns {Promise} Promise resolving to send result
 */
const sendEmail = async (message) => {
  const transporter = createTransporter();

  try {
    if (emailConfig.development.mockEnabled) {
      // Mock email sending for development
      return await handleMockEmail(message);
    }

    const result = await transporter.sendMail(message);
    logger.info(`Email sent successfully to: ${message.to}`);
    return result;

  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
};

/**
 * Handle mock email sending for development
 * @param {Object} message - Email message object
 * @returns {Promise} Promise resolving to mock result
 */
const handleMockEmail = async (message) => {
  const mockResult = {
    messageId: `mock-${Date.now()}`,
    accepted: [message.to],
    rejected: [],
    pending: [],
    response: 'Mock email sent successfully'
  };

  // Log email details
  if (emailConfig.development.logEmails) {
    logger.info('📧 Mock Email Sent:', {
      to: message.to,
      subject: message.subject,
      category: message.headers?.['X-Category'],
      priority: message.headers?.['X-Priority']
    });
  }

  // Save email to file for inspection
  if (emailConfig.development.saveToFile) {
    await saveMockEmailToFile(message);
  }

  return mockResult;
};

/**
 * Save mock email to file for inspection
 * @param {Object} message - Email message object
 */
const saveMockEmailToFile = async (message) => {
  try {
    const outputDir = emailConfig.development.outputDirectory;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `email-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    const emailData = {
      timestamp: new Date().toISOString(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.content?.length || 0
      }))
    };

    fs.writeFileSync(filepath, JSON.stringify(emailData, null, 2));

  } catch (error) {
    logger.error('Failed to save mock email to file:', error);
  }
};

/**
 * Send template-based email
 * @param {string} templateName - Name of email template
 * @param {string} recipient - Email recipient
 * @param {Object} variables - Template variables
 * @param {Object} options - Additional email options
 * @returns {Promise} Promise resolving to send result
 */
const sendTemplateEmail = async (templateName, recipient, variables = {}, options = {}) => {
  const template = emailTemplates[templateName];

  if (!template) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  // Process subject with variables
  let subject = template.subject;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, variables[key]);
  });

  const emailOptions = {
    to: recipient,
    subject,
    template: template.template,
    textTemplate: template.textTemplate,
    variables,
    ...options
  };

  const message = await createEmailMessage(emailOptions);
  return await sendEmail(message);
};

/**
 * Validate email configuration
 * @throws {Error} If configuration is invalid
 */
const validateEmailConfig = () => {
  if (!emailConfig.development.mockEnabled) {
    if (!emailConfig.smtp.host) {
      throw new Error('Email SMTP host is required');
    }

    if (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass) {
      throw new Error('Email SMTP authentication credentials are required');
    }
  }

  if (!emailConfig.defaults.from) {
    throw new Error('Default email sender is required');
  }
};

/**
 * Test email configuration
 * @returns {Promise} Promise resolving to test result
 */
const testEmailConfig = async () => {
  if (emailConfig.development.mockEnabled) {
    return { success: true, message: 'Mock email service is configured' };
  }

  const transporter = createTransporter();

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP configuration is valid' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Get email configuration summary
 * @returns {Object} Configuration summary
 */
const getConfigSummary = () => {
  return {
    smtp: {
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      authConfigured: !!(emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass)
    },
    templates: {
      directory: emailConfig.templates.directory,
      availableTemplates: Object.keys(emailTemplates)
    },
    development: {
      mockEnabled: emailConfig.development.mockEnabled,
      logEmails: emailConfig.development.logEmails,
      saveToFile: emailConfig.development.saveToFile
    }
  };
};

// Validate configuration on module load
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEmailConfig();
  } catch (error) {
    console.error('❌ Email Configuration Error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = {
  // Configuration
  config: emailConfig,
  templates: emailTemplates,
  EMAIL_PRIORITIES,
  EMAIL_CATEGORIES,

  // Core Functions
  createTransporter,
  createEmailMessage,
  sendEmail,
  sendTemplateEmail,

  // Template Functions
  loadTemplate,

  // Utilities
  validateEmailConfig,
  testEmailConfig,
  getConfigSummary
};
