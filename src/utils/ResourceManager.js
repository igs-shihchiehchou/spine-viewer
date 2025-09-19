/**
 * ResourceManager - Manages object URL lifecycle to prevent memory leaks
 *
 * This class follows the cleanup patterns established in the SpineViewer component's
 * disconnectedCallback method, providing centralized resource management for object URLs.
 */
class ResourceManager {
  constructor() {
    // Track all created object URLs
    this._objectUrls = new Set();
    // Track URLs by identifier for targeted cleanup
    this._urlsByKey = new Map();
    // Track cleanup callbacks for component lifecycle integration
    this._cleanupCallbacks = new Set();
    // Debug mode for development
    this._debug = false;
  }

  /**
   * Create and register an object URL from a file or blob
   * @param {File|Blob} source - The file or blob to create URL from
   * @param {string} [key] - Optional identifier for targeted cleanup
   * @returns {string} The created object URL
   */
  createObjectURL(source, key = null) {
    if (!source || (typeof source !== 'object' && !(source instanceof Blob) && !(source instanceof File))) {
      throw new Error('ResourceManager: createObjectURL requires a File or Blob object');
    }

    const url = URL.createObjectURL(source);

    // Register URL for tracking
    this._objectUrls.add(url);

    // Register by key if provided
    if (key) {
      // Clean up any existing URL with this key first
      this.revokeByKey(key);
      this._urlsByKey.set(key, url);
    }

    if (this._debug) {
      console.debug('[ResourceManager] Created object URL:', url, key ? `(key: ${key})` : '');
    }

    return url;
  }

  /**
   * Revoke a specific object URL
   * @param {string} url - The object URL to revoke
   * @returns {boolean} True if URL was found and revoked
   */
  revokeObjectURL(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    if (this._objectUrls.has(url)) {
      URL.revokeObjectURL(url);
      this._objectUrls.delete(url);

      // Remove from key mapping if present
      for (const [key, mappedUrl] of this._urlsByKey.entries()) {
        if (mappedUrl === url) {
          this._urlsByKey.delete(key);
          break;
        }
      }

      if (this._debug) {
        console.debug('[ResourceManager] Revoked object URL:', url);
      }

      return true;
    }

    return false;
  }

  /**
   * Revoke object URL by key identifier
   * @param {string} key - The key identifier
   * @returns {boolean} True if URL was found and revoked
   */
  revokeByKey(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const url = this._urlsByKey.get(key);
    if (url) {
      this.revokeObjectURL(url);
      return true;
    }

    return false;
  }

  /**
   * Revoke all tracked object URLs
   * Following the pattern from SpineViewer's disconnectedCallback for comprehensive cleanup
   */
  revokeAll() {
    if (this._debug && this._objectUrls.size > 0) {
      console.debug(`[ResourceManager] Revoking ${this._objectUrls.size} object URLs`);
    }

    // Revoke all URLs
    for (const url of this._objectUrls) {
      URL.revokeObjectURL(url);
    }

    // Clear all tracking
    this._objectUrls.clear();
    this._urlsByKey.clear();

    // Execute cleanup callbacks
    for (const callback of this._cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('[ResourceManager] Error in cleanup callback:', error);
      }
    }
    this._cleanupCallbacks.clear();
  }

  /**
   * Register a cleanup callback to be executed during revokeAll()
   * This integrates with component lifecycle patterns
   * @param {Function} callback - Cleanup function to execute
   * @returns {Function} Function to unregister the callback
   */
  registerCleanupCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('ResourceManager: cleanup callback must be a function');
    }

    this._cleanupCallbacks.add(callback);

    // Return unregister function
    return () => {
      this._cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Handle rapid file changes by cleaning up previous resources for a key
   * This prevents memory leaks when users quickly change files
   * @param {File|Blob} newSource - The new file/blob
   * @param {string} key - Identifier for the resource
   * @returns {string} The new object URL
   */
  replaceResource(newSource, key) {
    if (!key || typeof key !== 'string') {
      throw new Error('ResourceManager: replaceResource requires a key identifier');
    }

    // Clean up previous resource with this key
    this.revokeByKey(key);

    // Create new resource
    return this.createObjectURL(newSource, key);
  }

  /**
   * Get statistics about tracked resources
   * @returns {Object} Resource statistics
   */
  getStats() {
    return {
      totalUrls: this._objectUrls.size,
      keyedUrls: this._urlsByKey.size,
      cleanupCallbacks: this._cleanupCallbacks.size
    };
  }

  /**
   * Check if a URL is being tracked
   * @param {string} url - The object URL to check
   * @returns {boolean} True if URL is tracked
   */
  isTracked(url) {
    return this._objectUrls.has(url);
  }

  /**
   * Get URL by key identifier
   * @param {string} key - The key identifier
   * @returns {string|null} The object URL or null if not found
   */
  getUrlByKey(key) {
    return this._urlsByKey.get(key) || null;
  }

  /**
   * Get all tracked URLs as an array
   * @returns {string[]} Array of tracked object URLs
   */
  getAllUrls() {
    return Array.from(this._objectUrls);
  }

  /**
   * Get all keyed URLs as an object
   * @returns {Object} Object mapping keys to URLs
   */
  getKeyedUrls() {
    return Object.fromEntries(this._urlsByKey);
  }

  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this._debug = !!enabled;
  }

  /**
   * Create a scoped resource manager for component lifecycle integration
   * This follows the pattern of SpineViewer's cleanup in disconnectedCallback
   * @returns {Object} Scoped manager with automatic cleanup
   */
  createScope() {
    const scopedUrls = new Set();
    const scopedKeys = new Map();

    return {
      createObjectURL: (source, key = null) => {
        const url = this.createObjectURL(source, key);
        scopedUrls.add(url);
        if (key) {
          scopedKeys.set(key, url);
        }
        return url;
      },

      revokeObjectURL: (url) => {
        scopedUrls.delete(url);
        return this.revokeObjectURL(url);
      },

      revokeByKey: (key) => {
        const url = scopedKeys.get(key);
        if (url) {
          scopedUrls.delete(url);
          scopedKeys.delete(key);
        }
        return this.revokeByKey(key);
      },

      cleanup: () => {
        for (const url of scopedUrls) {
          this.revokeObjectURL(url);
        }
        scopedUrls.clear();
        scopedKeys.clear();
      },

      getStats: () => ({
        scopedUrls: scopedUrls.size,
        scopedKeys: scopedKeys.size
      })
    };
  }
}

// Create and export a singleton instance
const resourceManager = new ResourceManager();

export default resourceManager;
export { ResourceManager };