/**
 * FileProcessor class for file reading and URL management
 * Handles FileReader-based file operations, object URL creation, and dependency detection
 */

import { validateFile, validateFileExtension } from './fileValidator.js';

export class FileProcessor {
  constructor() {
    // Track created object URLs for cleanup
    this.activeUrls = new Map();
    this.progressCallback = null;
  }

  /**
   * Sets a progress callback for large file operations
   * @param {Function} callback - Progress callback function (percent, fileName)
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Main entry point for processing Spine files
   * @param {File} file - The file to process
   * @returns {Promise<{objectURL: string, type: string, dependencies: Object}>}
   */
  async processSpineFile(file) {
    try {
      // Validate the file first
      const validationResult = validateFile(file);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      // Determine file type
      const fileType = this.getFileType(file.name);

      // Check if we need progress tracking for large files (>10MB)
      const shouldTrackProgress = file.size > 10 * 1024 * 1024;

      // Read file content
      let fileContent;
      if (shouldTrackProgress) {
        fileContent = await this.readFileWithProgress(file);
      } else {
        fileContent = await this.readFile(file);
      }

      // Create object URL
      const objectURL = this.createObjectURL(file);

      // Detect dependencies
      const dependencies = await this.detectDependencies(file, fileContent);

      return {
        objectURL,
        type: fileType,
        dependencies,
        originalFile: file
      };

    } catch (error) {
      console.error('FileProcessor: Failed to process file:', error);
      throw new Error(`Failed to process file ${file.name}: ${error.message}`);
    }
  }

  /**
   * Reads a file using FileReader API
   * @param {File} file - The file to read
   * @returns {Promise<string>} File content as string
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
      };

      // Read as text for JSON and binary files
      reader.readAsText(file);
    });
  }

  /**
   * Reads a file with progress tracking for large files
   * @param {File} file - The file to read
   * @returns {Promise<string>} File content as string
   */
  readFileWithProgress(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      let lastProgressUpdate = 0;

      reader.onloadstart = () => {
        if (this.progressCallback) {
          this.progressCallback(0, file.name);
        }
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable && this.progressCallback) {
          const percent = Math.round((event.loaded / event.total) * 100);
          // Throttle progress updates to avoid excessive UI updates
          if (percent >= lastProgressUpdate + 5 || percent === 100) {
            this.progressCallback(percent, file.name);
            lastProgressUpdate = percent;
          }
        }
      };

      reader.onload = (event) => {
        if (this.progressCallback) {
          this.progressCallback(100, file.name);
        }
        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Creates an object URL for the file and tracks it for cleanup
   * @param {File} file - The file to create URL for
   * @returns {string} Object URL
   */
  createObjectURL(file) {
    try {
      const objectURL = URL.createObjectURL(file);

      // Track the URL for cleanup
      this.activeUrls.set(objectURL, {
        fileName: file.name,
        createdAt: Date.now(),
        fileSize: file.size
      });

      console.debug(`FileProcessor: Created object URL for ${file.name}`);
      return objectURL;

    } catch (error) {
      console.error('FileProcessor: Failed to create object URL:', error);
      throw new Error(`Failed to create object URL for ${file.name}: ${error.message}`);
    }
  }

  /**
   * Detects file dependencies based on file type and content
   * @param {File} file - The main file
   * @param {string} content - File content
   * @returns {Promise<Object>} Dependencies object
   */
  async detectDependencies(file, content) {
    const dependencies = {
      atlas: null,
      textures: [],
      missing: []
    };

    try {
      const fileType = this.getFileType(file.name);

      if (fileType === 'skel') {
        // For .skel files, look for corresponding .atlas file
        const expectedAtlasName = this.getAtlasFileName(file.name);
        dependencies.missing.push(expectedAtlasName);

        console.debug(`FileProcessor: .skel file detected, expected atlas: ${expectedAtlasName}`);
      } else if (fileType === 'json') {
        // For .json files, check if content contains atlas references
        const atlasReferences = this.extractAtlasReferences(content);
        if (atlasReferences.length > 0) {
          dependencies.missing.push(...atlasReferences);
          console.debug(`FileProcessor: .json file references atlas files:`, atlasReferences);
        }
      }

      return dependencies;

    } catch (error) {
      console.warn('FileProcessor: Error detecting dependencies:', error);
      return dependencies;
    }
  }

  /**
   * Gets the file type based on extension
   * @param {string} fileName - The file name
   * @returns {string} File type ('skel' or 'json')
   */
  getFileType(fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return extension === '.skel' ? 'skel' : 'json';
  }

  /**
   * Gets the expected atlas file name for a .skel file
   * @param {string} skelFileName - The .skel file name
   * @returns {string} Expected atlas file name
   */
  getAtlasFileName(skelFileName) {
    const baseName = skelFileName.substring(0, skelFileName.lastIndexOf('.'));
    return `${baseName}.atlas`;
  }

  /**
   * Extracts atlas file references from JSON content
   * @param {string} jsonContent - The JSON file content
   * @returns {Array<string>} Array of referenced atlas file names
   */
  extractAtlasReferences(jsonContent) {
    const references = [];

    try {
      // Try to parse as JSON to look for skeleton data
      const data = JSON.parse(jsonContent);

      // Look for common atlas reference patterns in Spine JSON files
      if (data.skeleton && data.skeleton.images) {
        // Some Spine files reference atlas through images path
        const imagesPath = data.skeleton.images;
        if (typeof imagesPath === 'string' && imagesPath.endsWith('.atlas')) {
          references.push(imagesPath);
        }
      }

      // Look for atlas references in animations or attachments
      if (data.skins) {
        for (const skinName in data.skins) {
          const skin = data.skins[skinName];
          if (skin.attachments) {
            // Atlas files often referenced in attachment paths
            for (const slotName in skin.attachments) {
              const attachments = skin.attachments[slotName];
              for (const attachmentName in attachments) {
                const attachment = attachments[attachmentName];
                if (attachment && attachment.path && attachment.path.includes('.atlas')) {
                  const atlasFile = attachment.path;
                  if (!references.includes(atlasFile)) {
                    references.push(atlasFile);
                  }
                }
              }
            }
          }
        }
      }

    } catch (error) {
      // If JSON parsing fails, do simple string search
      console.debug('FileProcessor: JSON parsing failed, using string search for atlas references');

      const atlasPattern = /["']([^"']*\.atlas)["']/g;
      let match;

      while ((match = atlasPattern.exec(jsonContent)) !== null) {
        const atlasFile = match[1];
        if (!references.includes(atlasFile)) {
          references.push(atlasFile);
        }
      }
    }

    return references;
  }

  /**
   * Processes multiple files and attempts to resolve dependencies
   * @param {FileList|Array<File>} files - Array or FileList of files
   * @returns {Promise<Object>} Processing result with main file and dependencies
   */
  async processMultipleFiles(files) {
    const fileArray = Array.from(files);
    const results = {
      mainFile: null,
      dependencies: {
        atlas: null,
        textures: []
      },
      processed: [],
      errors: []
    };

    try {
      // Find the main Spine file (.skel or .json)
      const mainFiles = fileArray.filter(file =>
        validateFileExtension(file.name)
      );

      if (mainFiles.length === 0) {
        throw new Error('No valid Spine files found in selection');
      }

      // Use the first valid file as main
      const mainFile = mainFiles[0];
      const mainResult = await this.processSpineFile(mainFile);
      results.mainFile = mainResult;
      results.processed.push(mainFile.name);

      // Try to find dependency files
      const dependencyFiles = fileArray.filter(file =>
        !validateFileExtension(file.name)
      );

      // Look for .atlas files
      const atlasFiles = dependencyFiles.filter(file =>
        file.name.toLowerCase().endsWith('.atlas')
      );

      if (atlasFiles.length > 0) {
        // Use the first .atlas file found
        results.dependencies.atlas = this.createObjectURL(atlasFiles[0]);
        results.processed.push(atlasFiles[0].name);
      }

      // Look for texture files (common image formats)
      const textureFiles = dependencyFiles.filter(file => {
        const ext = file.name.toLowerCase();
        return ext.endsWith('.png') || ext.endsWith('.jpg') ||
               ext.endsWith('.jpeg') || ext.endsWith('.webp');
      });

      for (const textureFile of textureFiles) {
        const textureURL = this.createObjectURL(textureFile);
        results.dependencies.textures.push({
          name: textureFile.name,
          url: textureURL
        });
        results.processed.push(textureFile.name);
      }

      return results;

    } catch (error) {
      console.error('FileProcessor: Error processing multiple files:', error);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Cleans up a specific object URL
   * @param {string} objectURL - The URL to clean up
   */
  cleanupObjectURL(objectURL) {
    try {
      if (this.activeUrls.has(objectURL)) {
        const urlInfo = this.activeUrls.get(objectURL);
        URL.revokeObjectURL(objectURL);
        this.activeUrls.delete(objectURL);
        console.debug(`FileProcessor: Cleaned up object URL for ${urlInfo.fileName}`);
      }
    } catch (error) {
      console.error('FileProcessor: Error cleaning up object URL:', error);
    }
  }

  /**
   * Cleans up all created object URLs
   */
  cleanupAllUrls() {
    try {
      console.debug(`FileProcessor: Cleaning up ${this.activeUrls.size} object URLs`);

      for (const [objectURL, urlInfo] of this.activeUrls) {
        try {
          URL.revokeObjectURL(objectURL);
          console.debug(`FileProcessor: Cleaned up object URL for ${urlInfo.fileName}`);
        } catch (error) {
          console.error(`FileProcessor: Error revoking URL for ${urlInfo.fileName}:`, error);
        }
      }

      this.activeUrls.clear();
    } catch (error) {
      console.error('FileProcessor: Error during cleanup:', error);
    }
  }

  /**
   * Gets information about currently tracked URLs
   * @returns {Array<Object>} Array of URL information objects
   */
  getActiveUrlInfo() {
    return Array.from(this.activeUrls.entries()).map(([url, info]) => ({
      url,
      ...info
    }));
  }

  /**
   * Checks if browser supports required APIs
   * @returns {boolean} True if all required APIs are supported
   */
  static checkBrowserSupport() {
    return !!(window.File && window.FileReader && window.FileList && window.Blob && window.URL);
  }
}

export default FileProcessor;