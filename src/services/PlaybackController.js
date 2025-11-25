/**
 * PlaybackController Service
 * 
 * Manages synchronized playback across all tracks in a MultiTrackSequence.
 * Uses requestAnimationFrame for 60fps timing and coordinates slot progression.
 * 
 * @module services/PlaybackController
 */

/**
 * Controls unified playback for multi-track animation sequences
 */
export class PlaybackController {
  /**
   * Create a PlaybackController
   * @param {MultiTrackSequence} sequence - The sequence to control
   * @param {Object} spineViewer - The SpineViewer instance for animation playback
   */
  constructor(sequence, spineViewer) {
    if (!sequence) {
      throw new Error('MultiTrackSequence is required');
    }
    if (!spineViewer) {
      throw new Error('SpineViewer is required');
    }

    this.sequence = sequence;
    this.spineViewer = spineViewer;

    // Playback state
    this.isPlaying = false;
    this.isPaused = false;
    this.rafId = null;

    // Timing
    this.startTimestamp = null;
    this.lastTimestamp = null;
    this.elapsedTime = 0;

    // Track-specific state: Map<trackId, { currentSlot, slotStartTime, animationDuration }>
    this.trackStates = new Map();

    // Bind tick method for RAF
    this.tick = this.tick.bind(this);
  }

  /**
   * Start synchronized playback across all tracks
   */
  start() {
    // Prevent starting if already playing
    if (this.isPlaying) {
      return;
    }

    // Don't start if sequence has no tracks
    if (this.sequence.tracks.length === 0) {
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;

    // Reset timing
    this.startTimestamp = performance.now();
    this.lastTimestamp = null;
    this.elapsedTime = 0;
    this.cycleStartTime = 0; // Track when the current cycle started

    // Find longest animation duration across all tracks
    let longestDuration = 0;

    // Initialize all tracks to slot 0
    this.sequence.tracks.forEach((track, index) => {
      track.setCurrentSlot(0);

      // Initialize track state
      const slot = track.getSlot(0);

      // Skip tracks with no slots
      if (!slot) {
        console.warn(`Track ${track.id} has no slot at index 0, skipping initialization`);
        return;
      }

      const animationDuration = this._getAnimationDuration(slot.animation);
      longestDuration = Math.max(longestDuration, animationDuration);

      this.trackStates.set(track.id, {
        currentSlot: 0,
        slotStartTime: 0,
        animationDuration: animationDuration,
        isLooping: false,
        isFrozen: false
      });

      // Play animation if slot is not empty
      if (!slot.isEmpty) {
        this._playSlotAnimation(track, index, slot);
      }
    });

    // Store the longest duration for the current cycle
    this.longestAnimationDuration = longestDuration;

    // Update sequence state
    this.sequence.playbackState.isPlaying = true;
    this.sequence.playbackState.isPaused = false;
    this.sequence.playbackState.currentTime = 0;

    // Emit playback-started event
    this.sequence.dispatchEvent(new CustomEvent('playback-started', {
      detail: { timestamp: this.startTimestamp }
    }));

    // Start RAF loop
    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Stop playback and reset all tracks to starting position
   */
  stop() {
    if (!this.isPlaying && !this.isPaused) {
      return;
    }

    this.isPlaying = false;
    this.isPaused = false;

    // Cancel RAF loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Reset all tracks to slot 0
    this.sequence.tracks.forEach(track => {
      track.setCurrentSlot(0);
    });

    // Clear track states
    this.trackStates.clear();

    // Reset timing
    this.elapsedTime = 0;
    this.lastTimestamp = null;

    // Update sequence state
    this.sequence.playbackState.isPlaying = false;
    this.sequence.playbackState.isPaused = false;
    this.sequence.playbackState.currentTime = 0;

    // Stop spine animation
    if (this.spineViewer) {
      if (typeof this.spineViewer.stopAnimation === 'function') {
        this.spineViewer.stopAnimation();
      } else if (this.spineViewer.spine && this.spineViewer.spine.state) {
        this.spineViewer.spine.state.clearTracks();
      }
    }

    // Emit playback-stopped event
    this.sequence.dispatchEvent(new CustomEvent('playback-stopped', {
      detail: { timestamp: performance.now() }
    }));
  }

  /**
   * Pause playback (maintains current position)
   */
  pause() {
    console.log('PlaybackController.pause() called');
    console.log('  this.isPlaying:', this.isPlaying);
    console.log('  this.isPaused:', this.isPaused);

    if (!this.isPlaying || this.isPaused) {
      console.log('  Early return: not playing or already paused');
      return;
    }

    this.isPlaying = false;
    this.isPaused = true;

    // Cancel RAF loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Pause Spine animations by setting timeScale to 0
    if (this.spineViewer && this.spineViewer.spine && this.spineViewer.spine.state) {
      this._savedTimeScale = this.spineViewer.spine.state.timeScale;
      this.spineViewer.spine.state.timeScale = 0;
    }

    // Update sequence state
    this.sequence.playbackState.isPlaying = false;
    this.sequence.playbackState.isPaused = true;

    console.log('  Paused successfully. New state:', {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      sequenceIsPlaying: this.sequence.playbackState.isPlaying,
      sequenceIsPaused: this.sequence.playbackState.isPaused
    });

    // Emit playback-paused event
    this.sequence.dispatchEvent(new CustomEvent('playback-paused', {
      detail: { timestamp: performance.now(), elapsedTime: this.elapsedTime }
    }));
  }

  /**
   * Resume playback from paused state
   */
  resume() {
    console.log('PlaybackController.resume() called');
    console.log('  this.isPaused:', this.isPaused);

    if (!this.isPaused) {
      console.log('  Early return: not paused');
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;

    // Reset last timestamp to prevent large delta
    this.lastTimestamp = null;

    // Restore Spine animations timeScale
    if (this.spineViewer && this.spineViewer.spine && this.spineViewer.spine.state) {
      this.spineViewer.spine.state.timeScale = this._savedTimeScale || 1.0;
    }

    // Update sequence state
    this.sequence.playbackState.isPlaying = true;
    this.sequence.playbackState.isPaused = false;

    console.log('  Resumed successfully. New state:', {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      sequenceIsPlaying: this.sequence.playbackState.isPlaying,
      sequenceIsPaused: this.sequence.playbackState.isPaused
    });

    // Emit playback-resumed event
    this.sequence.dispatchEvent(new CustomEvent('playback-resumed', {
      detail: { timestamp: performance.now() }
    }));

    // Resume RAF loop
    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Advance playback by one frame and pause
   * Used for frame-by-frame stepping through animations
   */
  nextFrame() {
    // Restore timeScale for all non-frozen tracks before advancing
    if (this.spineViewer && this.spineViewer.spine && this.spineViewer.spine.state) {
      // Restore state timeScale to 1
      this.spineViewer.spine.state.timeScale = 1.0;

      // Restore timeScale for each non-frozen track
      this.sequence.tracks.forEach((track, index) => {
        const trackState = this.trackStates.get(track.id);
        if (trackState && !trackState.isFrozen) {
          const trackEntry = this.spineViewer.spine.state.tracks[index];
          if (trackEntry) {
            trackEntry.timeScale = 1.0;
          }
        }
      });
    }

    // If not playing, start playback first
    if (!this.isPlaying && !this.isPaused) {
      this.start();
    } else if (this.isPaused) {
      // Resume from paused state
      this.resume();
    }

    // Set flag to pause after next frame
    this._pauseAfterNextFrame = true;
  }

  /**
   * RAF tick callback - updates all track positions
   * @param {DOMHighResTimeStamp} timestamp - Current timestamp from RAF
   */
  tick(timestamp) {
    // Calculate delta time
    const deltaTime = this.lastTimestamp ? timestamp - this.lastTimestamp : 0;
    this.lastTimestamp = timestamp;

    // Accumulate elapsed time (apply timeScale if available)
    const timeScale = this.spineViewer.spine?.state?.timeScale || 1.0;
    this.elapsedTime += deltaTime * timeScale;

    // Update sequence playback state
    this.sequence.playbackState.currentTime = this.elapsedTime;

    // Calculate time in current cycle
    const cycleTime = this.elapsedTime - this.cycleStartTime;

    // Check if the longest animation has completed
    if (cycleTime >= this.longestAnimationDuration) {
      // Restart all tracks for the next cycle
      this._restartAllTracks(this.elapsedTime);
      this.cycleStartTime = this.elapsedTime;
    }

    // Update each track's playback position
    this.sequence.tracks.forEach((track, index) => {
      this.updateTrackPlayback(track, index, this.elapsedTime, cycleTime);
    });

    // Check if we should pause after this frame (for nextFrame functionality)
    if (this._pauseAfterNextFrame) {
      this._pauseAfterNextFrame = false;
      this.pause();
      return;
    }

    // Request next frame if still playing
    if (this.isPlaying) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  /**
   * Update a single track's playback position
   * @param {AnimationTrack} track - Track to update
   * @param {number} index - Track index
   * @param {number} globalTime - Global elapsed time in ms
   * @param {number} cycleTime - Time elapsed in current cycle
   */
  updateTrackPlayback(track, index, globalTime, cycleTime) {
    const trackState = this.trackStates.get(track.id);

    // Initialize state if track was added during playback
    if (!trackState) {
      const slot = track.getSlot(0);

      // Handle track with no slots or null slot
      if (!slot) {
        console.warn(`Track ${track.id} has no slot at index 0`);
        return;
      }

      const animationDuration = this._getAnimationDuration(slot.animation);

      this.trackStates.set(track.id, {
        currentSlot: 0,
        slotStartTime: globalTime,
        animationDuration: animationDuration,
        isLooping: false,
        isFrozen: false
      });

      if (!slot.isEmpty) {
        this._playSlotAnimation(track, index, slot);
      }

      return;
    }

    const currentSlot = track.getSlot(trackState.currentSlot);

    // Handle null slot (shouldn't happen but defensive check)
    if (!currentSlot) {
      console.warn(`Track ${track.id} has no slot at index ${trackState.currentSlot}`);
      return;
    }

    // Handle empty slots - skip to next or maintain state
    if (currentSlot.isEmpty) {
      // Try to advance to next non-empty slot
      const nextSlotIndex = this._findNextNonEmptySlot(track, trackState.currentSlot);

      if (nextSlotIndex !== -1) {
        this._advanceToSlot(track, trackState, nextSlotIndex, globalTime);
      }
      // If no non-empty slots found, maintain current state
      return;
    }

    // Calculate time in current slot relative to when it started
    const timeInSlot = globalTime - trackState.slotStartTime;

    // Update progress bar based on actual time in slot (capped at animation duration)
    const progressTime = Math.min(timeInSlot, trackState.animationDuration);
    this._updateTrackProgress(track.id, progressTime, trackState.animationDuration);

    // Check if this individual track's animation has completed
    if (timeInSlot >= trackState.animationDuration && !trackState.isFrozen) {
      // This track finished before the longest animation
      // Freeze it at the last frame by setting timeScale to 0 for this track
      trackState.isFrozen = true;

      // Pause the Spine animation on this track by setting timeScale to 0
      if (this.spineViewer && this.spineViewer.spine && this.spineViewer.spine.state) {
        const trackEntry = this.spineViewer.spine.state.tracks[index];
        if (trackEntry) {
          trackEntry.timeScale = 0;
          // Set to last frame
          trackEntry.trackTime = trackEntry.animationEnd;
        }
      }

      // Note: The global cycle restart happens in tick() when cycleTime >= longestAnimationDuration
    }
  }

  /**
   * Advance track to a specific slot
   * @param {AnimationTrack} track 
   * @param {Object} trackState 
   * @param {number} slotIndex 
   * @param {number} currentTime 
   * @private
   */
  _advanceToSlot(track, trackState, slotIndex, currentTime) {
    const previousSlot = trackState.currentSlot;

    trackState.currentSlot = slotIndex;
    trackState.slotStartTime = currentTime;

    track.setCurrentSlot(slotIndex);

    const slot = track.getSlot(slotIndex);

    // Handle null slot
    if (!slot) {
      console.warn(`Cannot advance to null slot at index ${slotIndex} for track ${track.id}`);
      return;
    }

    // Emit playback position changed event
    track.dispatchEvent(new CustomEvent('playback-position-changed', {
      detail: {
        trackId: track.id,
        previousSlot: previousSlot,
        currentSlot: slotIndex,
        timestamp: currentTime
      }
    }));

    if (!slot.isEmpty) {
      trackState.animationDuration = this._getAnimationDuration(slot.animation);
      this._playSlotAnimation(track, slot);
    } else {
      // Empty slot - emit event
      track.dispatchEvent(new CustomEvent('empty-slot-encountered', {
        detail: { trackId: track.id, slotIndex: slotIndex }
      }));
    }
  }

  /**
   * Find the next non-empty slot in a track
   * @param {AnimationTrack} track 
   * @param {number} startIndex 
   * @returns {number} Index of next non-empty slot, or -1 if none found
   * @private
   */
  _findNextNonEmptySlot(track, startIndex) {
    const numSlots = track.slots.length;

    for (let i = 1; i < numSlots; i++) {
      const checkIndex = (startIndex + i) % numSlots;
      const slot = track.getSlot(checkIndex);

      if (!slot.isEmpty) {
        return checkIndex;
      }
    }

    return -1; // All slots are empty
  }

  /**
   * Get animation duration from spine data
   * @param {string} animationName 
   * @returns {number} Duration in milliseconds
   * @private
   */
  _getAnimationDuration(animationName) {
    if (!animationName) {
      return 0;
    }

    try {
      // Try to access skeleton from different possible paths
      let skeleton = null;

      if (this.spineViewer.skeleton) {
        skeleton = this.spineViewer.skeleton;
      } else if (this.spineViewer.spine && this.spineViewer.spine.skeleton) {
        skeleton = this.spineViewer.spine.skeleton;
      } else if (this.spineViewer._spine && this.spineViewer._spine.skeleton) {
        skeleton = this.spineViewer._spine.skeleton;
      }

      if (!skeleton || !skeleton.data) {
        console.warn(`Skeleton not available for animation duration lookup: "${animationName}"`);
        return 1000; // Default 1 second
      }

      const animation = skeleton.data.findAnimation(animationName);
      return animation ? animation.duration * 1000 : 1000; // Convert to ms, default 1s
    } catch (error) {
      console.warn(`Could not find animation duration for "${animationName}":`, error);
      return 1000; // Default 1 second
    }
  }

  /**
   * Play animation for a slot
   * @param {AnimationTrack} track
   * @param {number} index - Track index
   * @param {AnimationSlot} slot
   * @private
   */
  _playSlotAnimation(track, index, slot) {
    if (!slot || !slot.animation) {
      return;
    }

    try {
      // For single-slot tracks, enable looping. For multi-slot, disable to allow sequence advancement
      const shouldLoop = track.slots.length === 1;

      // Use SpineViewer's setAnimation method (not playAnimation)
      if (typeof this.spineViewer.setAnimation === 'function') {
        this.spineViewer.setAnimation(slot.animation, shouldLoop, index);
      } else if (this.spineViewer.spine && this.spineViewer.spine.state) {
        // Direct access to spine state as fallback
        console.log(`play animation ${slot.animation} for track ${track.id}, loop: ${shouldLoop}`);
        this.spineViewer.spine.state.setAnimation(index, slot.animation, shouldLoop);
      } else {
        console.warn(`Cannot play animation "${slot.animation}": SpineViewer not ready`);
      }
    } catch (error) {
      console.error(`Error playing animation "${slot.animation}":`, error);
    }
  }

  /**
   * Set playback speed for the animation
   * @param {number} speed - Playback speed multiplier (e.g., 0.5 = half speed, 2.0 = double speed)
   * @throws {Error} If speed is not a positive number
   */
  setPlaybackSpeed(speed) {
    if (typeof speed !== 'number' || speed <= 0) {
      throw new Error('Playback speed must be a positive number');
    }

    // Update spine viewer timeScale
    if (this.spineViewer && this.spineViewer.spine && this.spineViewer.spine.state) {
      this.spineViewer.spine.state.timeScale = speed;
    }

    // Emit playback-speed-changed event
    this.sequence.dispatchEvent(new CustomEvent('playback-speed-changed', {
      detail: { speed, timestamp: performance.now() }
    }));
  }

  /**
   * Get current playback speed
   * @returns {number} Current playback speed multiplier
   */
  getPlaybackSpeed() {
    if (this.spineViewer && this.spineViewer.spine && this.spineViewer.spine.state) {
      return this.spineViewer.spine.state.timeScale || 1.0;
    }
    return 1.0;
  }

  /**
   * Restart all tracks from the beginning
   * Called when the longest animation completes to sync all animations
   * @param {number} currentTime - Current global time
   * @private
   */
  _restartAllTracks(currentTime) {
    console.log('[Multi-Track] Restarting all tracks at time:', currentTime);

    // Recalculate longest duration for the new cycle
    let longestDuration = 0;

    this.sequence.tracks.forEach((track, index) => {
      const trackState = this.trackStates.get(track.id);

      if (!trackState) return;

      // Reset to slot 0
      trackState.currentSlot = 0;
      trackState.slotStartTime = currentTime;
      trackState.isLooping = true;
      trackState.isFrozen = false; // Unfreeze for new cycle

      // Update track model
      track.setCurrentSlot(0);

      const slot = track.getSlot(0);
      if (slot && !slot.isEmpty) {
        // Update animation duration (in case animations changed)
        trackState.animationDuration = this._getAnimationDuration(slot.animation);
        longestDuration = Math.max(longestDuration, trackState.animationDuration);

        // Unfreeze the Spine animation track by restoring timeScale
        if (this.spineViewer && this.spineViewer.spine && this.spineViewer.spine.state) {
          const trackEntry = this.spineViewer.spine.state.tracks[index];
          if (trackEntry) {
            trackEntry.timeScale = 1.0; // Restore normal playback speed
          }
        }

        // Restart the animation
        this._playSlotAnimation(track, index, slot);

        // Reset progress bar
        this._updateTrackProgress(track.id, 0, trackState.animationDuration);
      }

      // Emit position changed event
      track.dispatchEvent(new CustomEvent('playback-position-changed', {
        detail: {
          trackId: track.id,
          previousSlot: trackState.currentSlot,
          currentSlot: 0,
          timestamp: currentTime
        }
      }));
    });

    // Update longest duration for the new cycle
    this.longestAnimationDuration = longestDuration;

    // Emit a global restart event
    this.sequence.dispatchEvent(new CustomEvent('all-tracks-restarted', {
      detail: { timestamp: currentTime }
    }));
  }

  /**
   * Update track progress bar in the UI
   * @param {string} trackId - Track ID
   * @param {number} currentTime - Current time in slot (ms)
   * @param {number} duration - Total duration of animation (ms)
   * @private
   */
  _updateTrackProgress(trackId, currentTime, duration) {
    const progressFill = document.querySelector(`.track-progress-fill[data-track-id="${trackId}"]`);

    if (progressFill && duration > 0) {
      const progress = Math.min((currentTime / duration) * 100, 100);
      progressFill.style.width = `${progress}%`;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    this.trackStates.clear();
    this.sequence = null;
    this.spineViewer = null;
  }
}
