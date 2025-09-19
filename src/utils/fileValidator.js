/**
 * File validation utility module for local file support
 * Validates file extensions, size, and MIME types for Spine viewer
 */

// File validation constants
const SUPPORTED_EXTENSIONS = ['.skel', '.json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const SPINE_MIME_TYPES = [
  'application/json',
  'application/octet-stream',
  'text/plain'
];

/**
 * Validates if a file has a supported extension
 * @param {string} fileName - The name of the file to validate
 * @returns {boolean} True if extension is supported
 */
export function validateFileExtension(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(extension);
}

/**
 * Validates if a file size is within acceptable limits
 * @param {number} fileSize - The size of the file in bytes
 * @returns {boolean} True if size is within limits
 */
export function validateFileSize(fileSize) {
  if (typeof fileSize !== 'number' || fileSize < 0) {
    return false;
  }

  return fileSize <= MAX_FILE_SIZE;
}

/**
 * Validates if a file MIME type is supported (when available)
 * @param {string} mimeType - The MIME type of the file
 * @returns {boolean} True if MIME type is supported or empty
 */
export function validateMimeType(mimeType) {
  // Allow empty/undefined MIME types as some browsers don't provide them
  if (!mimeType || typeof mimeType !== 'string') {
    return true;
  }

  return SPINE_MIME_TYPES.includes(mimeType);
}

/**
 * Comprehensive file validation for File objects
 * @param {File} file - The File object to validate
 * @returns {Object} Validation result with success flag and error message
 */
export function validateFile(file) {
  try {
    // Check if file object is valid
    if (!file || typeof file !== 'object') {
      return {
        isValid: false,
        error: 'Invalid file object provided'
      };
    }

    // Validate file extension
    if (!validateFileExtension(file.name)) {
      return {
        isValid: false,
        error: `Unsupported file extension. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
      };
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;
      return {
        isValid: false,
        error: `File size (${fileSizeMB}MB) exceeds maximum limit of ${maxSizeMB}MB`
      };
    }

    // Validate MIME type if available
    if (!validateMimeType(file.type)) {
      return {
        isValid: false,
        error: `Unsupported file type: ${file.type}. Expected: ${SPINE_MIME_TYPES.join(', ')}`
      };
    }

    return {
      isValid: true,
      error: null
    };

  } catch (error) {
    console.error('File validation error:', error);
    return {
      isValid: false,
      error: `File validation failed: ${error.message}`
    };
  }
}

/**
 * Validates multiple files at once
 * @param {FileList|Array} files - The files to validate
 * @returns {Object} Validation result with overall success and individual results
 */
export function validateFiles(files) {
  if (!files || files.length === 0) {
    return {
      isValid: false,
      error: 'No files provided for validation',
      results: []
    };
  }

  const results = [];
  let hasErrors = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = validateFile(file);
    results.push({
      fileName: file?.name || `File ${i + 1}`,
      ...result
    });

    if (!result.isValid) {
      hasErrors = true;
    }
  }

  return {
    isValid: !hasErrors,
    error: hasErrors ? 'One or more files failed validation' : null,
    results
  };
}

/**
 * Creates a user-friendly error message for display
 * @param {string} error - The error message
 * @returns {string} Formatted error message for UI display
 */
export function createErrorMessage(error) {
  if (!error || typeof error !== 'string') {
    return 'Unknown validation error occurred';
  }

  return `Error: ${error}`;
}

/**
 * Gets the maximum allowed file size in MB
 * @returns {number} Maximum file size in megabytes
 */
export function getMaxFileSizeMB() {
  return Math.round(MAX_FILE_SIZE / (1024 * 1024));
}

/**
 * Gets the list of supported file extensions
 * @returns {Array<string>} Array of supported extensions
 */
export function getSupportedExtensions() {
  return [...SUPPORTED_EXTENSIONS];
}

/**
 * Gets the list of supported MIME types
 * @returns {Array<string>} Array of supported MIME types
 */
export function getSupportedMimeTypes() {
  return [...SPINE_MIME_TYPES];
}