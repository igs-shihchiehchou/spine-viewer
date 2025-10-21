/**
 * AnimationSlot - Individual container for a single animation reference or empty state
 * 
 * Represents a single slot in an animation track. Can be empty (null animation)
 * or contain a reference to an animation name from loaded Spine data.
 * 
 * @extends EventTarget
 */
export class AnimationSlot extends EventTarget {
  /**
   * @param {number} index - Position in track (0-based)
   * @param {string|null} animation - Animation name reference (null = empty)
   */
  constructor(index, animation = null) {
    super();
    
    if (index < 0) {
      throw new Error('index cannot be negative');
    }
    
    this._index = index;
    this._animation = animation;
    this._isPlaying = false;
  }

  /**
   * Get slot index in track
   * @returns {number}
   */
  get index() {
    return this._index;
  }

  /**
   * Get current animation name
   * @returns {string|null}
   */
  get animation() {
    return this._animation;
  }

  /**
   * Check if slot is currently playing
   * @returns {boolean}
   */
  get isPlaying() {
    return this._isPlaying;
  }

  /**
   * Internal setter for isPlaying (used by play/stop methods)
   * @param {boolean} value
   */
  set isPlaying(value) {
    this._isPlaying = value;
  }

  /**
   * Check if slot is empty (no animation assigned)
   * @returns {boolean}
   */
  get isEmpty() {
    return this._animation === null;
  }

  /**
   * Assign or clear animation
   * @param {string|null} name - Animation name or null to clear
   * @fires AnimationSlot#animation-set
   * @fires AnimationSlot#animation-cleared
   */
  setAnimation(name) {
    // Stop playback if currently playing
    if (this._isPlaying) {
      this.stop();
    }

    const previousAnimation = this._animation;
    this._animation = name;

    if (name === null) {
      this.dispatchEvent(new CustomEvent('animation-cleared', {
        detail: { index: this._index }
      }));
    } else {
      this.dispatchEvent(new CustomEvent('animation-set', {
        detail: { animation: name, index: this._index }
      }));
    }
  }

  /**
   * Start playback
   * @throws {Error} If slot is empty
   * @fires AnimationSlot#playback-started
   */
  play() {
    if (this.isEmpty) {
      throw new Error('Cannot play empty slot');
    }

    if (this._isPlaying) {
      return; // Already playing, don't emit event again
    }

    this._isPlaying = true;
    this.dispatchEvent(new CustomEvent('playback-started', {
      detail: { animation: this._animation, index: this._index }
    }));
  }

  /**
   * Stop playback
   * @fires AnimationSlot#playback-stopped
   */
  stop() {
    if (!this._isPlaying) {
      return; // Already stopped, don't emit event again
    }

    this._isPlaying = false;
    this.dispatchEvent(new CustomEvent('playback-stopped', {
      detail: { index: this._index }
    }));
  }
}
