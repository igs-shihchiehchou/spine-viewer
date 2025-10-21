/**
 * TrackManager - Service for managing track CRUD operations
 * 
 * Provides business logic layer for track creation, deletion, renaming,
 * and validation with proper error handling.
 */
export class TrackManager {
  static MAX_NAME_LENGTH = 50;

  /**
   * @param {MultiTrackSequence} sequence - The sequence to manage
   */
  constructor(sequence) {
    if (!sequence) {
      throw new Error('Sequence is required');
    }
    this._sequence = sequence;
  }

  get sequence() {
    return this._sequence;
  }

  /**
   * Create and add new track with validation
   * @param {string} name - Track name (optional)
   * @returns {AnimationTrack}
   * @throws {Error} If name is invalid or duplicate
   */
  createTrack(name = null) {
    // Validate name if provided
    if (name !== null) {
      name = name.trim();
      
      if (!this.validateTrackName(name)) {
        if (name === '') {
          throw new Error('Invalid track name: name cannot be empty');
        }
        if (this._isDuplicateName(name)) {
          throw new Error('Track name already exists');
        }
        if (name.length > TrackManager.MAX_NAME_LENGTH) {
          throw new Error(`Invalid track name: exceeds maximum length of ${TrackManager.MAX_NAME_LENGTH}`);
        }
        throw new Error('Invalid track name');
      }
    }

    try {
      return this._sequence.addTrack(name);
    } catch (error) {
      if (error.message === 'Maximum tracks exceeded') {
        throw error; // Re-throw with original message
      }
      throw error;
    }
  }

  /**
   * Validate track name
   * @param {string} name - Name to validate
   * @param {string} excludeId - Track ID to exclude from duplicate check (for rename)
   * @returns {boolean}
   */
  validateTrackName(name, excludeId = null) {
    if (!name || typeof name !== 'string') {
      return false;
    }

    name = name.trim();

    // Empty after trim
    if (name === '') {
      return false;
    }

    // Only special characters
    if (/^[^a-zA-Z0-9]+$/.test(name)) {
      return false;
    }

    // Too long
    if (name.length > TrackManager.MAX_NAME_LENGTH) {
      return false;
    }

    // Check for duplicates
    if (this._isDuplicateName(name, excludeId)) {
      return false;
    }

    return true;
  }

  /**
   * Delete track by ID
   * @param {string} trackId - Track UUID
   * @throws {Error} If track not found or cannot be deleted
   */
  deleteTrack(trackId) {
    this._sequence.removeTrack(trackId);
  }

  /**
   * Rename track with validation
   * @param {string} trackId - Track UUID
   * @param {string} newName - New track name
   * @throws {Error} If name invalid or track not found
   */
  renameTrack(trackId, newName) {
    const track = this._sequence.getTrack(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    newName = newName.trim();

    // Validate new name (excluding current track from duplicate check)
    if (!this.validateTrackName(newName, trackId)) {
      if (newName === '') {
        throw new Error('Invalid track name: name cannot be empty');
      }
      if (this._isDuplicateName(newName, trackId)) {
        throw new Error('Track name already exists');
      }
      throw new Error('Invalid track name');
    }

    track.rename(newName);
  }

  /**
   * Get track by name (case-insensitive)
   * @param {string} name - Track name
   * @returns {AnimationTrack|null}
   */
  getTrackByName(name) {
    if (!name) return null;
    
    const normalizedName = name.trim().toLowerCase();
    const track = this._sequence.tracks.find(
      t => t.name.toLowerCase() === normalizedName
    );
    
    return track || null;
  }

  /**
   * Check if name is duplicate (case-insensitive)
   * @private
   * @param {string} name - Name to check
   * @param {string} excludeId - Track ID to exclude from check
   * @returns {boolean}
   */
  _isDuplicateName(name, excludeId = null) {
    const normalizedName = name.toLowerCase();
    return this._sequence.tracks.some(track => {
      if (excludeId && track.id === excludeId) {
        return false; // Exclude this track from check
      }
      return track.name.toLowerCase() === normalizedName;
    });
  }
}
