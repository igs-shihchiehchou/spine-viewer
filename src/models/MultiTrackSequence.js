import { AnimationTrack } from './AnimationTrack.js';

/**
 * MultiTrackSequence - Root container managing all tracks and global playback state
 * 
 * Coordinates multiple animation tracks and provides unified playback control.
 * 
 * @extends EventTarget
 */
export class MultiTrackSequence extends EventTarget {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.maxTracks - Maximum allowed tracks (default: 10)
   * @param {number} options.slotDuration - Duration per slot in ms (optional)
   */
  constructor(options = {}) {
    super();

    this._tracks = [];
    this._maxTracks = options.maxTracks || 10;
    this._slotDuration = options.slotDuration || null;

    this._playbackState = {
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      currentSlotIndex: 0,
      startTime: 0,
      loopMode: 'continuous',
      playbackSpeed: 1.0
    };
  }

  // Getters
  get tracks() { return this._tracks; }
  get playbackState() { return { ...this._playbackState }; }
  get isPlaying() { return this._playbackState.isPlaying; }
  get currentSlotIndex() { return this._playbackState.currentSlotIndex; }

  get maxTracks() { return this._maxTracks; }
  set maxTracks(value) { this._maxTracks = value; }

  /**
   * Create and add new track
   * @param {string} name - Track name (optional, defaults to "Track N")
   * @returns {AnimationTrack} The created track
   * @fires MultiTrackSequence#track-added
   */
  addTrack(name = null) {
    if (this._tracks.length >= this._maxTracks) {
      throw new Error('Maximum tracks exceeded');
    }

    const track = new AnimationTrack(name);
    this._tracks.push(track);

    this.dispatchEvent(new CustomEvent('track-added', {
      detail: { track }
    }));

    return track;
  }

  /**
   * Remove track by ID
   * @param {string} trackId - Track UUID
   * @fires MultiTrackSequence#track-removed
   */
  removeTrack(trackId) {
    if (this._tracks.length === 1) {
      throw new Error('Cannot remove last track');
    }

    const index = this._tracks.findIndex(t => t.id === trackId);
    if (index === -1) {
      throw new Error('Track not found');
    }

    this._tracks.splice(index, 1);

    // Stop playback when removing tracks
    if (this._playbackState.isPlaying) {
      this._playbackState.isPlaying = false;
    }

    this.dispatchEvent(new CustomEvent('track-removed', {
      detail: { trackId }
    }));
  }

  /**
   * Find track by ID
   * @param {string} trackId - Track UUID
   * @returns {AnimationTrack|null}
   */
  getTrack(trackId) {
    const track = this._tracks.find(t => t.id === trackId);
    return track || null;
  }

  /**
   * Remove all tracks
   * @fires MultiTrackSequence#tracks-cleared
   */
  clear() {
    this._tracks = [];
    this._playbackState.isPlaying = false;
    this._playbackState.isPaused = false;
    this._playbackState.currentTime = 0;
    this._playbackState.currentSlotIndex = 0;
    this._playbackState.startTime = 0;

    this.dispatchEvent(new CustomEvent('tracks-cleared'));
  }

  /**
   * Start unified playback across all tracks
   * Note: Actual playback is controlled by PlaybackController service
   * @fires MultiTrackSequence#play-requested
   */
  play() {
    if (this._tracks.length === 0) {
      throw new Error('Cannot play empty sequence');
    }

    this.dispatchEvent(new CustomEvent('play-requested', {
      detail: { timestamp: performance.now() }
    }));
  }

  /**
   * Stop playback and reset all tracks
   * Note: Actual playback is controlled by PlaybackController service
   * @fires MultiTrackSequence#stop-requested
   */
  stop() {
    this.dispatchEvent(new CustomEvent('stop-requested', {
      detail: { timestamp: performance.now() }
    }));
  }

  /**
   * Pause playback at current position
   * Note: Actual playback is controlled by PlaybackController service
   * @fires MultiTrackSequence#pause-requested
   */
  pause() {
    if (!this._playbackState.isPlaying) {
      throw new Error('Cannot pause when not playing');
    }

    this.dispatchEvent(new CustomEvent('pause-requested', {
      detail: { timestamp: performance.now() }
    }));
  }

  /**
   * Resume playback from paused state
   * Note: Actual playback is controlled by PlaybackController service
   * @fires MultiTrackSequence#resume-requested
   */
  resume() {
    if (!this._playbackState.isPaused) {
      throw new Error('Cannot resume when not paused');
    }

    this.dispatchEvent(new CustomEvent('resume-requested', {
      detail: { timestamp: performance.now() }
    }));
  }

  /**
   * Set playback speed
   * Note: Actual speed control is handled by PlaybackController service
   * @param {number} speed - Playback speed multiplier (e.g., 0.5 = half speed, 2.0 = double speed)
   * @throws {Error} If speed is not a positive number
   * @fires MultiTrackSequence#playback-speed-change-requested
   */
  setPlaybackSpeed(speed) {
    if (typeof speed !== 'number' || speed <= 0) {
      throw new Error('Playback speed must be a positive number');
    }

    this._playbackState.playbackSpeed = speed;

    this.dispatchEvent(new CustomEvent('playback-speed-change-requested', {
      detail: { speed, timestamp: performance.now() }
    }));
  }

  /**
   * Get current playback speed
   * @returns {number} Current playback speed multiplier
   */
  getPlaybackSpeed() {
    return this._playbackState.playbackSpeed;
  }
}
