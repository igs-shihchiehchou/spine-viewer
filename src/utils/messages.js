/**
 * Internationalization system for error messages and user-facing text
 * Supports English and Chinese (Traditional) languages with automatic detection
 */

// Language constants
const LANGUAGES = {
  EN: 'en',
  ZH: 'zh'
};

// Default language fallback
const DEFAULT_LANGUAGE = LANGUAGES.EN;

// Message catalogs for different languages
const MESSAGE_CATALOGS = {
  [LANGUAGES.EN]: {
    // File validation errors
    'file.invalid_object': 'Invalid file object provided',
    'file.unsupported_extension': 'Unsupported file extension. Supported formats: {extensions}',
    'file.size_exceeded': 'File size ({fileSize}MB) exceeds maximum limit of {maxSize}MB',
    'file.unsupported_type': 'Unsupported file type: {type}. Expected: {mimeTypes}',
    'file.validation_failed': 'File validation failed: {error}',
    'file.no_files': 'No files provided for validation',
    'file.multiple_errors': 'One or more files failed validation',
    'file.unknown_error': 'Unknown validation error occurred',

    // Spine loading errors
    'spine.url_required': 'Please enter Spine file path',
    'spine.invalid_extension': 'Path should point to .skel or .json format Spine file',
    'spine.loading': 'Loading Spine file...',
    'spine.load_success': 'Spine file loaded successfully!',
    'spine.load_failed': 'Loading failed: {error}',
    'spine.load_error': 'Spine loading error: {error}',
    'spine.reset_success': 'Reset to default Spine file',

    // Browser support errors
    'browser.webgl_not_supported': 'WebGL is not supported in this browser',
    'browser.file_api_not_supported': 'File API is not supported in this browser',
    'browser.feature_not_supported': 'Required browser feature not supported: {feature}',

    // Resource management errors
    'resource.load_failed': 'Failed to load resource: {resource}',
    'resource.invalid_format': 'Invalid resource format: {format}',
    'resource.not_found': 'Resource not found: {resource}',
    'resource.access_denied': 'Access denied to resource: {resource}',

    // Animation errors
    'animation.not_found': 'Animation not found: {animation}',
    'animation.load_failed': 'Failed to load animation: {animation}',
    'animation.no_animations': 'No animation data available',
    'animation.invalid_data': 'Invalid animation data format',

    // General UI messages
    'ui.loading': 'Loading...',
    'ui.error': 'Error',
    'ui.success': 'Success',
    'ui.warning': 'Warning',
    'ui.info': 'Information',
    'ui.retry': 'Retry',
    'ui.cancel': 'Cancel',
    'ui.close': 'Close',

    // File processor messages
    'processor.processing': 'Processing file...',
    'processor.complete': 'Processing complete',
    'processor.failed': 'Processing failed: {error}',
    'processor.invalid_data': 'Invalid file data received',

    // Network errors
    'network.connection_failed': 'Network connection failed',
    'network.timeout': 'Request timeout',
    'network.not_found': 'Resource not found (404)',
    'network.server_error': 'Server error (500)',
    'network.unauthorized': 'Unauthorized access (401)',
    'network.forbidden': 'Access forbidden (403)'
  },

  [LANGUAGES.ZH]: {
    // File validation errors
    'file.invalid_object': '提供的檔案物件無效',
    'file.unsupported_extension': '不支援的檔案副檔名。支援格式：{extensions}',
    'file.size_exceeded': '檔案大小 ({fileSize}MB) 超過最大限制 {maxSize}MB',
    'file.unsupported_type': '不支援的檔案類型：{type}。預期：{mimeTypes}',
    'file.validation_failed': '檔案驗證失敗：{error}',
    'file.no_files': '未提供驗證檔案',
    'file.multiple_errors': '一個或多個檔案驗證失敗',
    'file.unknown_error': '發生未知驗證錯誤',

    // Spine loading errors
    'spine.url_required': '請輸入 Spine 檔案路徑',
    'spine.invalid_extension': '路徑應該指向 .skel 或 .json 格式的 Spine 檔案',
    'spine.loading': '正在載入 Spine 檔案...',
    'spine.load_success': 'Spine 檔案載入成功！',
    'spine.load_failed': '載入失敗：{error}',
    'spine.load_error': 'Spine 載入錯誤：{error}',
    'spine.reset_success': '已重設為預設 Spine 檔案',

    // Browser support errors
    'browser.webgl_not_supported': '此瀏覽器不支援 WebGL',
    'browser.file_api_not_supported': '此瀏覽器不支援檔案 API',
    'browser.feature_not_supported': '不支援所需的瀏覽器功能：{feature}',

    // Resource management errors
    'resource.load_failed': '載入資源失敗：{resource}',
    'resource.invalid_format': '無效的資源格式：{format}',
    'resource.not_found': '找不到資源：{resource}',
    'resource.access_denied': '拒絕存取資源：{resource}',

    // Animation errors
    'animation.not_found': '找不到動畫：{animation}',
    'animation.load_failed': '載入動畫失敗：{animation}',
    'animation.no_animations': '暫無動畫資料',
    'animation.invalid_data': '無效的動畫資料格式',

    // General UI messages
    'ui.loading': '載入中...',
    'ui.error': '錯誤',
    'ui.success': '成功',
    'ui.warning': '警告',
    'ui.info': '資訊',
    'ui.retry': '重試',
    'ui.cancel': '取消',
    'ui.close': '關閉',

    // File processor messages
    'processor.processing': '正在處理檔案...',
    'processor.complete': '處理完成',
    'processor.failed': '處理失敗：{error}',
    'processor.invalid_data': '收到無效的檔案資料',

    // Network errors
    'network.connection_failed': '網路連線失敗',
    'network.timeout': '請求逾時',
    'network.not_found': '找不到資源 (404)',
    'network.server_error': '伺服器錯誤 (500)',
    'network.unauthorized': '未授權存取 (401)',
    'network.forbidden': '存取被禁止 (403)'
  }
};

/**
 * Detects the user's preferred language based on browser settings
 * @returns {string} Language code (en or zh)
 */
export function detectLanguage() {
  try {
    // Get browser language preference
    const browserLang = navigator.language || navigator.userLanguage || DEFAULT_LANGUAGE;

    // Check if it's a Chinese variant (zh, zh-CN, zh-TW, zh-HK, etc.)
    if (browserLang.toLowerCase().startsWith('zh')) {
      return LANGUAGES.ZH;
    }

    // Default to English for all other languages
    return LANGUAGES.EN;
  } catch (error) {
    console.warn('Language detection failed, using default:', error);
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Current active language (auto-detected on module load)
 */
let currentLanguage = detectLanguage();

/**
 * Sets the current language for message retrieval
 * @param {string} language - Language code (en or zh)
 */
export function setLanguage(language) {
  if (Object.values(LANGUAGES).includes(language)) {
    currentLanguage = language;
  } else {
    console.warn(`Unsupported language: ${language}, using default: ${DEFAULT_LANGUAGE}`);
    currentLanguage = DEFAULT_LANGUAGE;
  }
}

/**
 * Gets the current active language
 * @returns {string} Current language code
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Gets all available language codes
 * @returns {Array<string>} Array of available language codes
 */
export function getAvailableLanguages() {
  return Object.values(LANGUAGES);
}

/**
 * Replaces placeholders in a message template with actual values
 * @param {string} template - Message template with {placeholder} syntax
 * @param {Object} variables - Object containing placeholder values
 * @returns {string} Message with placeholders replaced
 */
function replacePlaceholders(template, variables = {}) {
  if (!template || typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables.hasOwnProperty(key) ? String(variables[key]) : match;
  });
}

/**
 * Retrieves a localized message by key with optional variable substitution
 * @param {string} key - Message key in dot notation (e.g., 'file.invalid_object')
 * @param {Object} variables - Optional variables for placeholder substitution
 * @param {string} fallbackLanguage - Optional fallback language if key not found
 * @returns {string} Localized message with variables substituted
 */
export function getMessage(key, variables = {}, fallbackLanguage = null) {
  try {
    // Try to get message in current language
    const currentCatalog = MESSAGE_CATALOGS[currentLanguage];
    if (currentCatalog && currentCatalog[key]) {
      return replacePlaceholders(currentCatalog[key], variables);
    }

    // Try fallback language if specified
    if (fallbackLanguage && MESSAGE_CATALOGS[fallbackLanguage] && MESSAGE_CATALOGS[fallbackLanguage][key]) {
      return replacePlaceholders(MESSAGE_CATALOGS[fallbackLanguage][key], variables);
    }

    // Try default language if different from current
    if (currentLanguage !== DEFAULT_LANGUAGE) {
      const defaultCatalog = MESSAGE_CATALOGS[DEFAULT_LANGUAGE];
      if (defaultCatalog && defaultCatalog[key]) {
        return replacePlaceholders(defaultCatalog[key], variables);
      }
    }

    // Return the key itself if no message found (for debugging)
    console.warn(`Message key not found: ${key}`);
    return key;

  } catch (error) {
    console.error('Error retrieving message:', error);
    return key;
  }
}

/**
 * Creates an error message object compatible with existing error display patterns
 * @param {string} messageKey - Message key for localization
 * @param {Object} variables - Optional variables for message substitution
 * @param {string} type - Error type ('error', 'warning', 'info', 'success')
 * @returns {Object} Error object with message and type information
 */
export function createErrorMessage(messageKey, variables = {}, type = 'error') {
  const message = getMessage(messageKey, variables);

  return {
    message,
    type,
    key: messageKey,
    variables,
    language: currentLanguage,
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats an error message for display in UI components
 * @param {string} messageKey - Message key for localization
 * @param {Object} variables - Optional variables for message substitution
 * @returns {string} Formatted error message ready for display
 */
export function formatErrorMessage(messageKey, variables = {}) {
  const message = getMessage(messageKey, variables);
  return `${getMessage('ui.error')}: ${message}`;
}

/**
 * Creates a success message for UI display
 * @param {string} messageKey - Message key for localization
 * @param {Object} variables - Optional variables for message substitution
 * @returns {Object} Success message object
 */
export function createSuccessMessage(messageKey, variables = {}) {
  return createErrorMessage(messageKey, variables, 'success');
}

/**
 * Creates a warning message for UI display
 * @param {string} messageKey - Message key for localization
 * @param {Object} variables - Optional variables for message substitution
 * @returns {Object} Warning message object
 */
export function createWarningMessage(messageKey, variables = {}) {
  return createErrorMessage(messageKey, variables, 'warning');
}

/**
 * Creates an info message for UI display
 * @param {string} messageKey - Message key for localization
 * @param {Object} variables - Optional variables for message substitution
 * @returns {Object} Info message object
 */
export function createInfoMessage(messageKey, variables = {}) {
  return createErrorMessage(messageKey, variables, 'info');
}

/**
 * Gets CSS class name based on message type (compatible with existing styles)
 * @param {string} type - Message type ('error', 'warning', 'info', 'success')
 * @returns {string} CSS class name for styling
 */
export function getMessageCssClass(type) {
  const classMap = {
    error: 'status-error',
    warning: 'status-warning',
    info: 'status-info',
    success: 'status-success'
  };

  return classMap[type] || classMap.error;
}

/**
 * Checks if a message key exists in any language catalog
 * @param {string} key - Message key to check
 * @returns {boolean} True if key exists in at least one language
 */
export function hasMessage(key) {
  return Object.values(MESSAGE_CATALOGS).some(catalog =>
    catalog && catalog.hasOwnProperty(key)
  );
}

/**
 * Gets all message keys available in the current language
 * @returns {Array<string>} Array of available message keys
 */
export function getAvailableMessageKeys() {
  const catalog = MESSAGE_CATALOGS[currentLanguage] || MESSAGE_CATALOGS[DEFAULT_LANGUAGE];
  return catalog ? Object.keys(catalog) : [];
}

/**
 * Utility function to get commonly used file validation messages
 * Compatible with existing fileValidator.js patterns
 */
export const FileMessages = {
  /**
   * Get unsupported extension error message
   * @param {Array<string>} extensions - Supported extensions array
   * @returns {string} Localized error message
   */
  unsupportedExtension: (extensions) => getMessage('file.unsupported_extension', { extensions: extensions.join(', ') }),

  /**
   * Get file size exceeded error message
   * @param {number} fileSize - File size in MB
   * @param {number} maxSize - Maximum allowed size in MB
   * @returns {string} Localized error message
   */
  sizeExceeded: (fileSize, maxSize) => getMessage('file.size_exceeded', { fileSize, maxSize }),

  /**
   * Get unsupported file type error message
   * @param {string} type - File MIME type
   * @param {Array<string>} mimeTypes - Supported MIME types
   * @returns {string} Localized error message
   */
  unsupportedType: (type, mimeTypes) => getMessage('file.unsupported_type', { type, mimeTypes: mimeTypes.join(', ') }),

  /**
   * Get validation failed error message
   * @param {string} error - Error details
   * @returns {string} Localized error message
   */
  validationFailed: (error) => getMessage('file.validation_failed', { error })
};

/**
 * Utility function to get commonly used Spine loading messages
 * Compatible with existing examples/index.html patterns
 */
export const SpineMessages = {
  /**
   * Get URL required error message
   * @returns {string} Localized error message
   */
  urlRequired: () => getMessage('spine.url_required'),

  /**
   * Get invalid extension error message
   * @returns {string} Localized error message
   */
  invalidExtension: () => getMessage('spine.invalid_extension'),

  /**
   * Get loading status message
   * @returns {string} Localized loading message
   */
  loading: () => getMessage('spine.loading'),

  /**
   * Get load success message
   * @returns {string} Localized success message
   */
  loadSuccess: () => getMessage('spine.load_success'),

  /**
   * Get load failed error message
   * @param {string} error - Error details
   * @returns {string} Localized error message
   */
  loadFailed: (error) => getMessage('spine.load_failed', { error }),

  /**
   * Get reset success message
   * @returns {string} Localized success message
   */
  resetSuccess: () => getMessage('spine.reset_success')
};

// Export language constants for external use
export { LANGUAGES };