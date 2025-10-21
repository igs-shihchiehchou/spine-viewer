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

    // Initialize all tracks to slot 0
    this.sequence.tracks.forEach(track => {
      track.setCurrentSlot(0);
      
      // Initialize track state
      const slot = track.getSlot(0);
      
      // Skip tracks with no slots
      if (!slot) {
        console.warn(`Track ${track.id} has no slot at index 0, skipping initialization`);
        return;
      }
      
      const animationDuration = this._getAnimationDuration(slot.animation);
      
      this.trackStates.set(track.id, {
        currentSlot: 0,
        slotStartTime: 0,
        animationDuration: animationDuration,
        isLooping: false
      });

      // Play animation if slot is not empty
      if (!slot.isEmpty) {
        this._playSlotAnimation(track, slot);
      }
    });

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

    // Update sequence state
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
   * RAF tick callback - updates all track positions
   * @param {DOMHighResTimeStamp} timestamp - Current timestamp from RAF
   */
  tick(timestamp) {
    // Calculate delta time
    const deltaTime = this.lastTimestamp ? timestamp - this.lastTimestamp : 0;
    this.lastTimestamp = timestamp;

    // Accumulate elapsed time (apply timeScale if available)
    const timeScale = this.spineViewer.state?.timeScale || 1.0;
    this.elapsedTime += deltaTime * timeScale;

    // Update sequence playback state
    this.sequence.playbackState.currentTime = this.elapsedTime;

    // Update each track's playback position
    this.sequence.tracks.forEach(track => {
      this.updateTrackPlayback(track, this.elapsedTime);
    });

    // Request next frame if still playing
    if (this.isPlaying) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  /**
   * Update a single track's playback position
   * @param {AnimationTrack} track - Track to update
   * @param {number} globalTime - Global elapsed time in ms
   */
  updateTrackPlayback(track, globalTime) {
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
        isLooping: false
      });
      
      if (!slot.isEmpty) {
        this._playSlotAnimation(track, slot);
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

    // Calculate time in current slot
    const timeInSlot = globalTime - trackState.slotStartTime;

    // Check if animation duration has elapsed
    if (timeInSlot >= trackState.animationDuration) {
      // Advance to next slot
      const nextSlotIndex = (trackState.currentSlot + 1) % track.slots.length;
      
      // Check if we're looping back to start
      if (nextSlotIndex === 0) {
        trackState.isLooping = true;
        track.dispatchEvent(new CustomEvent('track-loop', {
          detail: { trackId: track.id, timestamp: globalTime }
        }));
      }

      this._advanceToSlot(track, trackState, nextSlotIndex, globalTime);
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
   * @param {AnimationSlot} slot 
   * @private
   */
  _playSlotAnimation(track, slot) {
    if (!slot || !slot.animation) {
      return;
    }

    try {
      // Use SpineViewer's setAnimation method (not playAnimation)
      if (typeof this.spineViewer.setAnimation === 'function') {
        this.spineViewer.setAnimation(slot.animation, false); // false = don't loop individual slots
      } else if (this.spineViewer.spine && this.spineViewer.spine.state) {
        // Direct access to spine state as fallback
        this.spineViewer.spine.state.setAnimation(0, slot.animation, false);
      } else {
        console.warn(`Cannot play animation "${slot.animation}": SpineViewer not ready`);
      }
    } catch (error) {
      console.error(`Error playing animation "${slot.animation}":`, error);
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
