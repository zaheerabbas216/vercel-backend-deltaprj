/**
 * File Upload Configuration for Delta-2 Backend
 *
 * Centralized file upload configuration using Multer middleware.
 * Handles different file types, storage locations, and validation.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const config = require('./environment');
const logger = require('../src/utils/logger');

/**
 * File Upload Configuration
 */
const uploadConfig = {
  // Storage configuration
  storage: {
    directories: config.upload.directories,
    maxSize: config.upload.maxSize,
    maxFiles: config.upload.maxFiles,
    allowedTypes: config.upload.allowedTypes
  },

  // Image processing configuration
  imageProcessing: {
    enabled: true,
    quality: 85,
    formats: ['jpeg', 'png', 'webp'],
    thumbnails: {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 800, height: 600 }
    }
  },

  // Document processing configuration
  documentProcessing: {
    maxSize: 50 * 1024 * 1024, // 50MB for documents
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  }
};

/**
 * Ensure upload directories exist
 */
const ensureDirectoriesExist = () => {
  Object.values(uploadConfig.storage.directories).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created upload directory: ${dir}`);
    }
  });
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, extension);

  return `${prefix}${prefix ? '_' : ''}${baseName}_${timestamp}_${randomBytes}${extension}`;
};

/**
 * Check if file type is allowed
 * @param {string} mimetype - File mimetype
 * @param {Array} allowedTypes - Array of allowed mimetypes
 * @returns {boolean} True if allowed
 */
const isFileTypeAllowed = (mimetype, allowedTypes = uploadConfig.storage.allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

/**
 * Check if file is an image
 * @param {string} mimetype - File mimetype
 * @returns {boolean} True if image
 */
const isImage = (mimetype) => {
  return mimetype.startsWith('image/');
};

/**
 * Storage engine for different upload types
 */
const createStorage = (uploadType = 'general') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadDir;

      switch (uploadType) {
        case 'profile':
          uploadDir = uploadConfig.storage.directories.profiles;
          break;
        case 'product':
          uploadDir = uploadConfig.storage.directories.products;
          break;
        case 'document':
          uploadDir = uploadConfig.storage.directories.documents;
          break;
        default:
          uploadDir = uploadConfig.storage.directories.temp;
      }

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
      const uniqueName = generateUniqueFilename(file.originalname, uploadType);
      cb(null, uniqueName);
    }
  });
};

/**
 * File filter for uploads
 * @param {Array} allowedTypes - Allowed file types
 * @returns {Function} Multer file filter function
 */
const createFileFilter = (allowedTypes = uploadConfig.storage.allowedTypes) => {
  return (req, file, cb) => {
    // Check file type
    if (!isFileTypeAllowed(file.mimetype, allowedTypes)) {
      const error = new Error(`File type not allowed: ${file.mimetype}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // Additional validation based on field name
    if (file.fieldname === 'profileImage' && !isImage(file.mimetype)) {
      const error = new Error('Profile image must be an image file');
      error.code = 'INVALID_IMAGE_TYPE';
      return cb(error, false);
    }

    cb(null, true);
  };
};

/**
 * Create multer upload middleware
 * @param {Object} options - Upload configuration options
 * @returns {Object} Configured multer instance
 */
const createUploadMiddleware = (options = {}) => {
  const {
    uploadType = 'general',
    maxSize = uploadConfig.storage.maxSize,
    maxFiles = uploadConfig.storage.maxFiles,
    allowedTypes = uploadConfig.storage.allowedTypes
  } = options;

  return multer({
    storage: createStorage(uploadType),
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: maxSize,
      files: maxFiles,
      fieldSize: 1024 * 1024, // 1MB field size limit
      fieldNameSize: 100,
      fields: 20
    }
  });
};

/**
 * Profile image upload middleware
 */
const profileImageUpload = createUploadMiddleware({
  uploadType: 'profile',
  maxSize: 5 * 1024 * 1024, // 5MB for profile images
  maxFiles: 1,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
});

/**
 * Product image upload middleware
 */
const productImageUpload = createUploadMiddleware({
  uploadType: 'product',
  maxSize: 10 * 1024 * 1024, // 10MB for product images
  maxFiles: 10,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
});

/**
 * Document upload middleware
 */
const documentUpload = createUploadMiddleware({
  uploadType: 'document',
  maxSize: uploadConfig.documentProcessing.maxSize,
  maxFiles: 5,
  allowedTypes: uploadConfig.documentProcessing.allowedTypes
});

/**
 * General file upload middleware
 */
const generalUpload = createUploadMiddleware({
  uploadType: 'general',
  maxSize: uploadConfig.storage.maxSize,
  maxFiles: uploadConfig.storage.maxFiles,
  allowedTypes: uploadConfig.storage.allowedTypes
});

/**
 * Process uploaded image (resize, optimize)
 * @param {string} inputPath - Input file path
 * @param {Object} options - Processing options
 * @returns {Promise} Promise resolving to processed image info
 */
const processImage = async (inputPath, options = {}) => {
  if (!uploadConfig.imageProcessing.enabled) {
    return { originalPath: inputPath };
  }

  const {
    quality = uploadConfig.imageProcessing.quality,
    generateThumbnails = true,
    outputFormat = 'jpeg'
  } = options;

  try {
    const inputBuffer = fs.readFileSync(inputPath);
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));

    const results = {
      original: inputPath,
      metadata,
      processed: {}
    };

    // Process original image (optimize)
    const optimizedPath = path.join(outputDir, `${baseName}_optimized.${outputFormat}`);
    await image
      .jpeg({ quality })
      .png({ compressionLevel: 9 })
      .toFile(optimizedPath);

    results.processed.optimized = optimizedPath;

    // Generate thumbnails if requested
    if (generateThumbnails) {
      results.processed.thumbnails = {};

      for (const [sizeName, dimensions] of Object.entries(uploadConfig.imageProcessing.thumbnails)) {
        const thumbnailPath = path.join(outputDir, `${baseName}_${sizeName}.${outputFormat}`);

        await image
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality })
          .png({ compressionLevel: 9 })
          .toFile(thumbnailPath);

        results.processed.thumbnails[sizeName] = thumbnailPath;
      }
    }

    return results;

  } catch (error) {
    logger.error('Image processing failed:', error);
    throw error;
  }
};

/**
 * Clean up temporary files
 * @param {Array} filePaths - Array of file paths to delete
 * @returns {Promise} Promise resolving when cleanup is complete
 */
const cleanupFiles = async (filePaths) => {
  const cleanupPromises = filePaths.map(async (filePath)  => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup file ${filePath}:`, error);
    }
  });

  await Promise.all(cleanupPromises);
};

/**
 * Get file information
 * @param {string} filePath - Path to file
 * @returns {Object} File information
 */
const getFileInfo = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    return {
      path: filePath,
      name: basename,
      extension,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isImage: ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension),
      isDocument: ['.pdf', '.doc', '.docx', '.csv', '.xlsx'].includes(extension)
    };
  } catch (error) {
    logger.error('Failed to get file info:', error);
    return null;
  }
};

/**
 * Move file from temporary to permanent location
 * @param {string} tempPath - Temporary file path
 * @param {string} permanentPath - Permanent file path
 * @returns {Promise} Promise resolving when move is complete
 */
const moveFile = async (tempPath, permanentPath) => {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(permanentPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Move file
    fs.renameSync(tempPath, permanentPath);
    logger.info(`Moved file from ${tempPath} to ${permanentPath}`);

    return permanentPath;
  } catch (error) {
    logger.error('Failed to move file:', error);
    throw error;
  }
};

/**
 * Validate uploaded file
 * @param {Object} file - Multer file object
 * @param {Object} validationRules - Validation rules
 * @returns {Object} Validation result
 */
const validateFile = (file, validationRules = {}) => {
  const {
    maxSize = uploadConfig.storage.maxSize,
    allowedTypes = uploadConfig.storage.allowedTypes,
    requiredDimensions = null // For images: { minWidth, minHeight, maxWidth, maxHeight }
  } = validationRules;

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size (${file.size}) exceeds maximum allowed size (${maxSize})`);
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type (${file.mimetype}) is not allowed`);
  }

  // Check image dimensions if specified
  if (requiredDimensions && isImage(file.mimetype)) {
    // This would require reading the image metadata
    // Implementation can be added based on specific requirements
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Handle file upload error
 * @param {Error} error - Upload error
 * @returns {Object} Standardized error response
 */
const handleUploadError = (error) => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds the maximum limit of ${uploadConfig.storage.maxSize} bytes`,
        maxSize: uploadConfig.storage.maxSize
      };

    case 'LIMIT_FILE_COUNT':
      return {
        code: 'TOO_MANY_FILES',
        message: `Maximum ${uploadConfig.storage.maxFiles} files allowed`,
        maxFiles: uploadConfig.storage.maxFiles
      };

    case 'LIMIT_UNEXPECTED_FILE':
      return {
        code: 'UNEXPECTED_FIELD',
        message: 'Unexpected file field in upload',
        field: error.field
      };

    case 'INVALID_FILE_TYPE':
      return {
        code: 'INVALID_FILE_TYPE',
        message: 'File type not allowed',
        allowedTypes: uploadConfig.storage.allowedTypes
      };

    case 'INVALID_IMAGE_TYPE':
      return {
        code: 'INVALID_IMAGE_TYPE',
        message: 'Only image files are allowed for this field'
      };

    default:
      return {
        code: 'UPLOAD_ERROR',
        message: error.message || 'File upload failed'
      };
  }
};

/**
 * Get upload configuration summary
 * @returns {Object} Configuration summary
 */
const getConfigSummary = () => {
  return {
    storage: {
      maxSize: uploadConfig.storage.maxSize,
      maxFiles: uploadConfig.storage.maxFiles,
      allowedTypes: uploadConfig.storage.allowedTypes,
      directories: uploadConfig.storage.directories
    },
    imageProcessing: {
      enabled: uploadConfig.imageProcessing.enabled,
      quality: uploadConfig.imageProcessing.quality,
      thumbnailSizes: Object.keys(uploadConfig.imageProcessing.thumbnails)
    },
    documentProcessing: {
      maxSize: uploadConfig.documentProcessing.maxSize,
      allowedTypes: uploadConfig.documentProcessing.allowedTypes
    }
  };
};

/**
 * Clean up old temporary files
 * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
 * @returns {Promise} Promise resolving when cleanup is complete
 */
const cleanupTempFiles = async (maxAge = 24 * 60 * 60 * 1000) => {
  const tempDir = uploadConfig.storage.directories.temp;

  if (!fs.existsSync(tempDir)) {
    return;
  }

  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old temp file: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Failed to cleanup temp files:', error);
  }
};

// Initialize upload directories on module load
ensureDirectoriesExist();

// Schedule temp file cleanup (every hour)
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    cleanupTempFiles();
  }, 60 * 60 * 1000); // 1 hour
}

module.exports = {
  // Configuration
  config: uploadConfig,

  // Middleware
  profileImageUpload,
  productImageUpload,
  documentUpload,
  generalUpload,
  createUploadMiddleware,

  // Processing Functions
  processImage,

  // File Management
  moveFile,
  cleanupFiles,
  cleanupTempFiles,
  getFileInfo,

  // Validation
  validateFile,
  isFileTypeAllowed,
  isImage,

  // Utilities
  generateUniqueFilename,
  handleUploadError,
  getConfigSummary,
  ensureDirectoriesExist
};
