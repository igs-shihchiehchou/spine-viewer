/**
 * Browser compatibility detection utility for File API and related features
 * Detects support for File API, FileReader, drag/drop, and other required browser features
 *
 * This module follows the conditional logic patterns established in the codebase,
 * particularly the feature detection approach used in FileProcessor.checkBrowserSupport()
 */

/**
 * Core File API support detection
 * Tests for the fundamental File API components required for local file viewing
 */
const hasFileAPI = !!(
  typeof window !== 'undefined' &&
  window.File &&
  window.FileReader &&
  window.FileList &&
  window.Blob
);

/**
 * Object URL support detection
 * Required for creating temporary URLs from File objects
 */
const hasObjectURL = !!(
  typeof window !== 'undefined' &&
  window.URL &&
  typeof window.URL.createObjectURL === 'function' &&
  typeof window.URL.revokeObjectURL === 'function'
);

/**
 * Drag and Drop API support detection
 * Required for drag-and-drop file functionality
 */
const hasDragDrop = !!(
  typeof window !== 'undefined' &&
  window.DataTransfer &&
  window.DataTransferItem &&
  window.DataTransferItemList &&
  'draggable' in document.createElement('div')
);

/**
 * FileReader progress events support
 * Required for progress tracking during file reading operations
 */
const hasFileReaderProgress = !!(
  typeof window !== 'undefined' &&
  window.FileReader &&
  'onprogress' in new FileReader()
);

/**
 * Async/await support detection
 * Required for modern async file processing patterns
 */
const hasAsyncAwait = (function() {
  try {
    return eval('(async function() {})').constructor === (async function(){}).constructor;
  } catch (error) {
    return false;
  }
})();

/**
 * Promise support detection
 * Fallback for browsers without async/await but with Promise support
 */
const hasPromises = !!(
  typeof window !== 'undefined' &&
  window.Promise &&
  typeof window.Promise.resolve === 'function'
);

/**
 * ArrayBuffer support detection
 * Required for advanced file processing operations
 */
const hasArrayBuffer = !!(
  typeof window !== 'undefined' &&
  window.ArrayBuffer &&
  window.Uint8Array
);

/**
 * ResizeObserver support detection
 * Used in SpineViewer for responsive behavior (with fallback patterns)
 */
const hasResizeObserver = !!(
  typeof window !== 'undefined' &&
  window.ResizeObserver
);

/**
 * Pointer Events support detection
 * Used in SpineViewer for touch/mouse interaction handling
 */
const hasPointerEvents = !!(
  typeof window !== 'undefined' &&
  window.PointerEvent &&
  'onpointerdown' in window
);

/**
 * Web Workers support detection
 * Potential future enhancement for background file processing
 */
const hasWebWorkers = !!(
  typeof window !== 'undefined' &&
  window.Worker
);

/**
 * Performance API support detection
 * Used for timing measurements and performance monitoring
 */
const hasPerformanceAPI = !!(
  typeof window !== 'undefined' &&
  window.performance &&
  typeof window.performance.now === 'function'
);

/**
 * Local Storage support detection
 * Potential future enhancement for settings persistence
 */
const hasLocalStorage = (function() {
  try {
    return typeof window !== 'undefined' &&
           window.localStorage &&
           typeof window.localStorage.getItem === 'function';
  } catch (error) {
    // localStorage may throw in private browsing mode
    return false;
  }
})();

/**
 * Check if the browser has all core features required for basic functionality
 * @returns {boolean} True if all core features are available
 */
export function hasRequiredFeatures() {
  return hasFileAPI && hasObjectURL && hasPromises;
}

/**
 * Check if the browser has all enhanced features for optimal experience
 * @returns {boolean} True if all enhanced features are available
 */
export function hasOptimalFeatures() {
  return hasRequiredFeatures() &&
         hasDragDrop &&
         hasFileReaderProgress &&
         hasAsyncAwait &&
         hasArrayBuffer;
}

/**
 * Detect specific File API method support
 * Some older browsers may have partial File API implementation
 * @returns {Object} Object with detailed File API method availability
 */
export function getFileAPIDetails() {
  const details = {
    File: !!window.File,
    FileReader: !!window.FileReader,
    FileList: !!window.FileList,
    Blob: !!window.Blob,
    methods: {}
  };

  if (window.FileReader) {
    const reader = new FileReader();
    details.methods = {
      readAsText: typeof reader.readAsText === 'function',
      readAsArrayBuffer: typeof reader.readAsArrayBuffer === 'function',
      readAsDataURL: typeof reader.readAsDataURL === 'function',
      readAsBinaryString: typeof reader.readAsBinaryString === 'function'
    };
  }

  return details;
}

/**
 * Generate a comprehensive browser capability report
 * @returns {Object} Detailed capability report for troubleshooting
 */
export function getBrowserCapabilities() {
  return {
    // Core features (required)
    core: {
      fileAPI: hasFileAPI,
      objectURL: hasObjectURL,
      promises: hasPromises
    },

    // Enhanced features (recommended)
    enhanced: {
      dragDrop: hasDragDrop,
      fileReaderProgress: hasFileReaderProgress,
      asyncAwait: hasAsyncAwait,
      arrayBuffer: hasArrayBuffer
    },

    // UI/UX features
    userInterface: {
      resizeObserver: hasResizeObserver,
      pointerEvents: hasPointerEvents
    },

    // Advanced features (future enhancements)
    advanced: {
      webWorkers: hasWebWorkers,
      performanceAPI: hasPerformanceAPI,
      localStorage: hasLocalStorage
    },

    // Detailed API information
    details: {
      fileAPI: getFileAPIDetails(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    },

    // Summary flags
    summary: {
      hasMinimumSupport: hasRequiredFeatures(),
      hasOptimalSupport: hasOptimalFeatures()
    }
  };
}

/**
 * Generate user-friendly messages about browser compatibility
 * @returns {Object} User-facing messages and recommendations
 */
export function getCompatibilityMessages() {
  const capabilities = getBrowserCapabilities();
  const messages = {
    status: 'unknown',
    primary: '',
    secondary: '',
    recommendations: []
  };

  if (capabilities.summary.hasOptimalSupport) {
    messages.status = 'optimal';
    messages.primary = 'Your browser fully supports all spine-viewer features.';
    messages.secondary = 'You can use drag-and-drop, progress tracking, and all advanced features.';
  } else if (capabilities.summary.hasMinimumSupport) {
    messages.status = 'compatible';
    messages.primary = 'Your browser supports spine-viewer with some limitations.';
    messages.secondary = 'Basic file loading works, but some enhanced features may not be available.';

    if (!capabilities.enhanced.dragDrop) {
      messages.recommendations.push('Consider updating your browser for drag-and-drop file support.');
    }
    if (!capabilities.enhanced.asyncAwait) {
      messages.recommendations.push('Consider updating your browser for improved performance.');
    }
  } else {
    messages.status = 'incompatible';
    messages.primary = 'Your browser does not support the required features for spine-viewer.';
    messages.secondary = 'Please update to a modern browser that supports the File API.';

    if (!capabilities.core.fileAPI) {
      messages.recommendations.push('Update to a browser with File API support (Chrome 13+, Firefox 7+, Safari 6+, Edge 12+).');
    }
    if (!capabilities.core.objectURL) {
      messages.recommendations.push('Update to a browser with Object URL support for file handling.');
    }
    if (!capabilities.core.promises) {
      messages.recommendations.push('Update to a browser with Promise support for modern JavaScript features.');
    }
  }

  return messages;
}

/**
 * Check for common browser-specific issues and provide workarounds
 * @returns {Object} Browser-specific compatibility information
 */
export function getBrowserSpecificInfo() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const info = {
    browser: 'unknown',
    version: 'unknown',
    issues: [],
    workarounds: []
  };

  // Detect browser type and version
  if (ua.includes('Chrome/')) {
    info.browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    info.version = match ? match[1] : 'unknown';

    if (parseInt(info.version) < 13) {
      info.issues.push('File API support limited in Chrome versions before 13');
      info.workarounds.push('Update to Chrome 13 or later for full File API support');
    }
  } else if (ua.includes('Firefox/')) {
    info.browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    info.version = match ? match[1] : 'unknown';

    if (parseInt(info.version) < 7) {
      info.issues.push('File API support limited in Firefox versions before 7');
      info.workarounds.push('Update to Firefox 7 or later for full File API support');
    }
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    info.browser = 'Safari';
    // Safari version detection is more complex
    if (ua.includes('Version/')) {
      const match = ua.match(/Version\/(\d+)/);
      info.version = match ? match[1] : 'unknown';

      if (parseInt(info.version) < 6) {
        info.issues.push('File API support limited in Safari versions before 6');
        info.workarounds.push('Update to Safari 6 or later for full File API support');
      }
    }
  } else if (ua.includes('Edge/')) {
    info.browser = 'Edge Legacy';
    const match = ua.match(/Edge\/(\d+)/);
    info.version = match ? match[1] : 'unknown';

    if (parseInt(info.version) < 12) {
      info.issues.push('File API support limited in Edge versions before 12');
      info.workarounds.push('Update to Edge 12 or later for full File API support');
    }
  } else if (ua.includes('Edg/')) {
    info.browser = 'Edge Chromium';
    const match = ua.match(/Edg\/(\d+)/);
    info.version = match ? match[1] : 'unknown';
  } else if (ua.includes('Trident/') || ua.includes('MSIE')) {
    info.browser = 'Internet Explorer';
    info.issues.push('Internet Explorer is not supported');
    info.workarounds.push('Please use a modern browser like Chrome, Firefox, Safari, or Edge');
  }

  return info;
}

// Export individual feature flags for easy access
export {
  hasFileAPI,
  hasObjectURL,
  hasDragDrop,
  hasFileReaderProgress,
  hasAsyncAwait,
  hasPromises,
  hasArrayBuffer,
  hasResizeObserver,
  hasPointerEvents,
  hasWebWorkers,
  hasPerformanceAPI,
  hasLocalStorage
};

// Export a simple compatibility check function that matches FileProcessor pattern
export const checkBrowserSupport = hasRequiredFeatures;

// Default export with all functionality
export default {
  // Feature flags
  hasFileAPI,
  hasObjectURL,
  hasDragDrop,
  hasFileReaderProgress,
  hasAsyncAwait,
  hasPromises,
  hasArrayBuffer,
  hasResizeObserver,
  hasPointerEvents,
  hasWebWorkers,
  hasPerformanceAPI,
  hasLocalStorage,

  // Compatibility functions
  hasRequiredFeatures,
  hasOptimalFeatures,
  checkBrowserSupport,

  // Detailed reporting functions
  getFileAPIDetails,
  getBrowserCapabilities,
  getCompatibilityMessages,
  getBrowserSpecificInfo
};