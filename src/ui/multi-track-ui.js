/**
 * Multi-Track UI Component
 * 
 * Provides UI rendering and interaction handlers for the multi-track system.
 */

import { MultiTrackSequence } from '../models/MultiTrackSequence.js';
import { TrackManager } from '../services/TrackManager.js';
import { PlaybackController } from '../services/PlaybackController.js';

let sequence = null;
let trackManager = null;
let playbackController = null;
let containerElement = null;
let spineViewer = null;

/**
 * Initialize multi-track UI
 * @param {HTMLElement} container - Container element for multi-track UI
 * @param {Object} options - Configuration options
 * @param {Object} options.spineViewer - SpineViewer instance for playback
 */
export function initMultiTrackUI(container, options = {}) {
  if (!container) {
    throw new Error('Container element is required');
  }

  containerElement = container;
  spineViewer = options.spineViewer;
  sequence = new MultiTrackSequence(options);
  trackManager = new TrackManager(sequence);

  // Initialize playback controller if spineViewer provided
  if (spineViewer) {
    playbackController = new PlaybackController(sequence, spineViewer);
    setupPlaybackEventListeners();
  }

  // Create UI structure
  const multiTrackContainer = document.createElement('div');
  multiTrackContainer.className = 'multi-track-container';
  multiTrackContainer.innerHTML = `
    <div class="multi-track-header">
      <h4>多軌動畫序列 (Multi-Track Animation)</h4>
      <div class="playback-controls">
        <button class="playback-btn play-btn" title="播放">▶</button>
        <button class="playback-btn stop-btn" title="停止" disabled>■</button>
        <button class="playback-btn pause-btn" title="暫停" disabled>⏸</button>
        <span class="playback-time">00:00.000</span>
      </div>
      <button class="add-track-btn">+ 新增軌道</button>
    </div>
    <div class="tracks-list"></div>
  `;

  container.appendChild(multiTrackContainer);

  // Setup event listeners
  const addTrackBtn = multiTrackContainer.querySelector('.add-track-btn');
  addTrackBtn.addEventListener('click', handleAddTrack);

  // Setup playback control listeners
  const playBtn = multiTrackContainer.querySelector('.play-btn');
  const stopBtn = multiTrackContainer.querySelector('.stop-btn');
  const pauseBtn = multiTrackContainer.querySelector('.pause-btn');

  playBtn.addEventListener('click', handlePlayClick);
  stopBtn.addEventListener('click', handleStopClick);
  pauseBtn.addEventListener('click', handlePauseClick);

  // Listen for sequence events
  sequence.addEventListener('track-added', handleTrackAdded);
  sequence.addEventListener('track-removed', handleTrackRemoved);

  // Listen for playback position changes for visual indicators
  sequence.tracks.forEach(track => {
    track.addEventListener('playback-position-changed', handlePlaybackPositionChanged);
  });

  return {
    sequence,
    trackManager,
    playbackController
  };
}

/**
 * Handle add track button click
 */
function handleAddTrack() {
  try {
    const trackCount = sequence.tracks.length;
    const trackName = `軌道 ${trackCount + 1}`;
    trackManager.createTrack(trackName);
  } catch (error) {
    console.error('Failed to add track:', error);
    alert(error.message);
  }
}

/**
 * Handle track added event
 * @param {CustomEvent} e - Event with track details
 */
function handleTrackAdded(e) {
  const { track } = e.detail;
  const trackElement = renderTrack(track);
  
  const tracksList = containerElement.querySelector('.tracks-list');
  tracksList.appendChild(trackElement);
  
  // Render initial slots
  renderTrackSlots(trackElement, track);

  // Listen for playback position changes on new track
  track.addEventListener('playback-position-changed', handlePlaybackPositionChanged);
}

/**
 * Handle track-removed event
 * @param {CustomEvent} event
 */
function handleTrackRemoved(event) {
  const trackId = event.detail.trackId;
  const trackElement = containerElement.querySelector(`[data-track-id="${trackId}"]`);
  
  if (trackElement) {
    trackElement.remove();
  }
}

/**
 * Render track element
 * @param {AnimationTrack} track - Track model
 * @returns {HTMLElement}
 */
export function renderTrack(track) {
  const trackElement = document.createElement('div');
  trackElement.className = 'track';
  trackElement.dataset.trackId = track.id;
  
  trackElement.innerHTML = `
    <div class="track-header">
      <span class="track-name" title="點擊編輯軌道名稱">${track.name}</span>
      <button class="delete-track-btn" title="刪除軌道">×</button>
    </div>
    <div class="track-slots">
      <div class="placeholder">拖曳動畫到此處</div>
    </div>
  `;

  // Setup event listeners
  const deleteBtn = trackElement.querySelector('.delete-track-btn');
  deleteBtn.addEventListener('click', () => handleDeleteTrack(track.id));

  // Setup track name editing
  const trackNameElement = trackElement.querySelector('.track-name');
  trackNameElement.addEventListener('click', () => showTrackRenameInput(track));

  setupTrackDragDrop(trackElement);

  return trackElement;
}

/**
 * Handle delete track
 * @param {string} trackId - Track ID
 */
function handleDeleteTrack(trackId) {
  try {
    trackManager.deleteTrack(trackId);
  } catch (error) {
    console.error('Failed to delete track:', error);
    alert(error.message);
  }
}

// ============================================================
// Track Naming
// ============================================================

/**
 * Show inline input for renaming track
 * @param {AnimationTrack} track - Track to rename
 */
export function showTrackRenameInput(track) {
  const trackElement = containerElement.querySelector(`[data-track-id="${track.id}"]`);
  if (!trackElement) {
    return;
  }

  const trackHeader = trackElement.querySelector('.track-header');
  const trackNameElement = trackElement.querySelector('.track-name');
  
  if (trackHeader.classList.contains('editing')) {
    return; // Already editing
  }

  // Store current name
  const currentName = track.name;

  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'track-name-input';
  input.value = currentName;
  input.placeholder = '輸入軌道名稱';

  // Replace track name with input
  trackNameElement.style.display = 'none';
  trackHeader.classList.add('editing');
  trackHeader.insertBefore(input, trackNameElement);

  // Focus and select text
  input.focus();
  input.select();

  // Handle save
  const saveRename = () => {
    const newName = input.value.trim();
    
    if (newName === '') {
      // Restore original name
      input.remove();
      trackNameElement.style.display = '';
      trackHeader.classList.remove('editing');
      return;
    }

    try {
      handleTrackRename(track.id, newName);
      
      // Update UI
      trackNameElement.textContent = newName;
      input.remove();
      trackNameElement.style.display = '';
      trackHeader.classList.remove('editing');
    } catch (error) {
      // Show error and keep input focused
      alert(error.message);
      input.focus();
      input.select();
    }
  };

  // Handle cancel
  const cancelRename = () => {
    input.remove();
    trackNameElement.style.display = '';
    trackHeader.classList.remove('editing');
  };

  // Event listeners
  input.addEventListener('blur', saveRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  });
}

/**
 * Handle track rename
 * @param {string} trackId - Track ID
 * @param {string} newName - New track name
 */
export function handleTrackRename(trackId, newName) {
  try {
    trackManager.renameTrack(trackId, newName);
  } catch (error) {
    throw error; // Re-throw for UI handling
  }
}

/**
 * Validate track name (client-side pre-validation)
 * @param {string} name - Track name to validate
 * @returns {boolean} True if valid
 */
export function validateTrackName(name) {
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return false;
  }
  
  if (trimmed.length > 50) {
    return false;
  }
  
  return true;
}

// ============================================================
// Drag and Drop
// ============================================================

/**
 * Setup drag-drop handlers for track
 * @param {HTMLElement} trackElement - Track DOM element
 */
export function setupTrackDragDrop(trackElement) {
  const slotsContainer = trackElement.querySelector('.track-slots');
  
  if (!slotsContainer) return;

  slotsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    slotsContainer.classList.add('drag-over');
  });

  slotsContainer.addEventListener('dragleave', (e) => {
    if (!slotsContainer.contains(e.relatedTarget)) {
      slotsContainer.classList.remove('drag-over');
    }
  });

  slotsContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    slotsContainer.classList.remove('drag-over');
    
    const animName = e.dataTransfer.getData('text/plain');
    if (animName) {
      handleAnimationDrop(trackElement, animName);
    }
  });
}

/**
 * Handle animation drop on track
 * @param {HTMLElement} trackElement - Track element
 * @param {string} animationName - Animation name
 */
function handleAnimationDrop(trackElement, animationName) {
  const trackId = trackElement.dataset.trackId;
  const track = sequence.getTrack(trackId);
  
  if (!track) {
    console.error('Track not found:', trackId);
    return;
  }

  // Add slot with animation
  track.addSlot(animationName);
  
  // Re-render track slots
  renderTrackSlots(trackElement, track);
}

/**
 * Render track slots
 * @param {HTMLElement} trackElement - Track element
 * @param {AnimationTrack} track - Track model
 */
function renderTrackSlots(trackElement, track) {
  const slotsContainer = trackElement.querySelector('.track-slots');
  
  if (!slotsContainer) return;

  if (track.slots.length === 0) {
    slotsContainer.innerHTML = '<div class="placeholder">拖曳動畫到此處</div>';
    return;
  }

  slotsContainer.innerHTML = track.slots.map((slot, index) => {
    const emptyClass = slot.isEmpty ? 'empty' : 'occupied';
    const slotContent = slot.isEmpty ? '空位' : slot.animation;
    
    return `
      <div class="slot ${emptyClass}" 
           data-slot-index="${index}" 
           data-track-id="${track.id}"
           draggable="true">
        <span class="slot-content">${slotContent}</span>
        ${!slot.isEmpty ? '<button class="slot-remove-btn" onclick="event.stopPropagation()">×</button>' : ''}
      </div>
    `;
  }).join('');
  
  // Setup slot drag-drop handlers
  setupSlotDragDrop(slotsContainer, track);
}

/**
 * Render empty slot
 * @param {number} index - Slot index
 * @returns {string} HTML string
 */
export function renderEmptySlot(index) {
  return `
    <div class="slot empty" data-slot-index="${index}">
      <span class="slot-content">空位</span>
    </div>
  `;
}

/**
 * Render occupied slot
 * @param {AnimationSlot} slot - Slot model
 * @returns {string} HTML string
 */
export function renderSlot(slot) {
  return `
    <div class="slot occupied" 
         data-slot-index="${slot.index}" 
         draggable="true">
      <span class="slot-content">${slot.animation}</span>
      <button class="slot-remove-btn">×</button>
    </div>
  `;
}

/**
 * Setup drag-drop handlers for slots
 * @param {HTMLElement} slotsContainer - Slots container element
 * @param {AnimationTrack} track - Track model
 */
function setupSlotDragDrop(slotsContainer, track) {
  const slots = slotsContainer.querySelectorAll('.slot');
  
  slots.forEach(slotElement => {
    slotElement.addEventListener('dragstart', handleSlotDragStart);
    slotElement.addEventListener('dragover', handleSlotDragOver);
    slotElement.addEventListener('drop', (e) => handleSlotDrop(e, track));
    slotElement.addEventListener('dragenter', handleSlotDragEnter);
    slotElement.addEventListener('dragleave', handleSlotDragLeave);
    slotElement.addEventListener('dragend', handleSlotDragEnd);
    
    // Remove button handler
    const removeBtn = slotElement.querySelector('.slot-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const slotIndex = parseInt(slotElement.dataset.slotIndex);
        track.removeSlot(slotIndex);
        
        // Re-render slots
        const trackElement = containerElement.querySelector(`[data-track-id="${track.id}"]`);
        if (trackElement) {
          renderTrackSlots(trackElement, track);
        }
      });
    }
  });
}

let draggedSlot = null;

/**
 * Handle slot drag start
 * @param {DragEvent} e
 */
function handleSlotDragStart(e) {
  draggedSlot = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

/**
 * Handle slot drag over
 * @param {DragEvent} e
 */
function handleSlotDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

/**
 * Handle slot drag enter
 * @param {DragEvent} e
 */
function handleSlotDragEnter(e) {
  if (this !== draggedSlot) {
    this.classList.add('drag-over');
  }
}

/**
 * Handle slot drag leave
 * @param {DragEvent} e
 */
function handleSlotDragLeave(e) {
  this.classList.remove('drag-over');
}

/**
 * Handle slot drop
 * @param {DragEvent} e
 * @param {AnimationTrack} track
 */
function handleSlotDrop(e, track) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();
  
  this.classList.remove('drag-over');
  
  if (draggedSlot && draggedSlot !== this) {
    const fromIndex = parseInt(draggedSlot.dataset.slotIndex);
    const toIndex = parseInt(this.dataset.slotIndex);
    const fromTrackId = draggedSlot.dataset.trackId;
    const toTrackId = this.dataset.trackId;
    
    if (fromTrackId === toTrackId) {
      // Same track - reorder
      track.moveSlot(fromIndex, toIndex);
      
      // Re-render slots
      const trackElement = containerElement.querySelector(`[data-track-id="${track.id}"]`);
      if (trackElement) {
        renderTrackSlots(trackElement, track);
      }
    } else {
      // Cross-track move (swap animations)
      const fromTrack = sequence.getTrack(fromTrackId);
      const toTrack = sequence.getTrack(toTrackId);
      
      if (fromTrack && toTrack) {
        const fromAnimation = fromTrack.slots[fromIndex].animation;
        const toAnimation = toTrack.slots[toIndex].animation;
        
        // Swap
        toTrack.setAnimation(toIndex, fromAnimation);
        fromTrack.setAnimation(fromIndex, toAnimation);
        
        // Re-render both tracks
        const fromTrackElement = containerElement.querySelector(`[data-track-id="${fromTrackId}"]`);
        const toTrackElement = containerElement.querySelector(`[data-track-id="${toTrackId}"]`);
        
        if (fromTrackElement) {
          renderTrackSlots(fromTrackElement, fromTrack);
        }
        if (toTrackElement) {
          renderTrackSlots(toTrackElement, toTrack);
        }
      }
    }
  }
  
  return false;
}

/**
 * Handle slot drag end
 * @param {DragEvent} e
 */
function handleSlotDragEnd(e) {
  this.classList.remove('dragging');
  
  // Clean up drag-over classes
  document.querySelectorAll('.slot').forEach(slot => {
    slot.classList.remove('drag-over');
  });
  
  draggedSlot = null;
}

/**
 * Get current sequence
 * @returns {MultiTrackSequence}
 */
export function getSequence() {
  return sequence;
}

/**
 * Get track manager
 * @returns {TrackManager}
 */
export function getTrackManager() {
  return trackManager;
}

/**
 * Get playback controller
 * @returns {PlaybackController}
 */
export function getPlaybackController() {
  return playbackController;
}

// ============================================================
// Visual Progress Indicators
// ============================================================

/**
 * Handle playback position changed event
 * @param {CustomEvent} event 
 */
function handlePlaybackPositionChanged(event) {
  const { trackId, previousSlot, currentSlot } = event.detail;
  
  // Clear highlight from previous slot
  if (previousSlot !== undefined && previousSlot !== null) {
    const prevSlotElement = containerElement.querySelector(
      `[data-track-id="${trackId}"][data-slot-index="${previousSlot}"]`
    );
    if (prevSlotElement) {
      prevSlotElement.classList.remove('playing');
    }
  }
  
  // Highlight current slot
  highlightActiveSlot(trackId, currentSlot);
}

/**
 * Highlight the active slot in a track
 * @param {string} trackId - Track ID
 * @param {number} slotIndex - Slot index to highlight
 */
export function highlightActiveSlot(trackId, slotIndex) {
  const slotElement = containerElement.querySelector(
    `[data-track-id="${trackId}"][data-slot-index="${slotIndex}"]`
  );
  
  if (slotElement) {
    // Only highlight non-empty slots
    if (!slotElement.classList.contains('empty')) {
      slotElement.classList.add('playing');
    }
  }
}

/**
 * Clear all slot highlights
 */
export function clearAllHighlights() {
  const playingSlots = containerElement.querySelectorAll('.slot.playing');
  playingSlots.forEach(slot => {
    slot.classList.remove('playing');
  });
}

/**
 * Update slot visual state (for testing/manual control)
 * @param {string} trackId 
 * @param {number} slotIndex 
 * @param {string} state - 'playing', 'idle', etc.
 */
export function updateSlotVisualState(trackId, slotIndex, state) {
  const slotElement = containerElement.querySelector(
    `[data-track-id="${trackId}"][data-slot-index="${slotIndex}"]`
  );
  
  if (slotElement) {
    // Remove all state classes
    slotElement.classList.remove('playing', 'idle', 'completed');
    
    // Add new state class
    if (state) {
      slotElement.classList.add(state);
    }
  }
}

// ============================================================
// Playback Controls
// ============================================================

/**
 * Setup playback event listeners
 */
function setupPlaybackEventListeners() {
  // Listen for playback state changes
  sequence.addEventListener('playback-started', handlePlaybackStarted);
  sequence.addEventListener('playback-stopped', handlePlaybackStopped);
  sequence.addEventListener('playback-paused', handlePlaybackPaused);
  sequence.addEventListener('playback-resumed', handlePlaybackResumed);
}

/**
 * Handle play button click
 */
function handlePlayClick() {
  if (!playbackController || sequence.tracks.length === 0) {
    console.warn('Cannot play: no tracks or playback controller not initialized');
    return;
  }

  if (sequence.playbackState.isPaused) {
    playbackController.resume();
  } else {
    playbackController.start();
  }
}

/**
 * Handle stop button click
 */
function handleStopClick() {
  if (!playbackController) {
    return;
  }

  playbackController.stop();
}

/**
 * Handle pause button click
 */
function handlePauseClick() {
  console.log('Pause button clicked');
  console.log('playbackController:', playbackController);
  console.log('sequence.playbackState:', sequence.playbackState);
  
  if (!playbackController) {
    console.log('No playbackController, returning');
    return;
  }

  // Toggle between pause and resume
  if (sequence.playbackState.isPaused) {
    console.log('Calling resume()');
    playbackController.resume();
  } else if (sequence.playbackState.isPlaying) {
    console.log('Calling pause()');
    playbackController.pause();
  } else {
    console.log('Not playing or paused, doing nothing');
  }
}

/**
 * Handle playback started event
 */
function handlePlaybackStarted() {
  updatePlaybackButtons(true, false);
  
  // Highlight initial slots (slot 0) for all tracks
  sequence.tracks.forEach(track => {
    highlightActiveSlot(track.id, 0);
  });
}

/**
 * Handle playback stopped event
 */
function handlePlaybackStopped() {
  updatePlaybackButtons(false, false);
  updatePlaybackTime(0);
  
  // Clear all highlights when stopped
  clearAllHighlights();
}

/**
 * Handle playback paused event
 */
function handlePlaybackPaused() {
  updatePlaybackButtons(false, true);
}

/**
 * Handle playback resumed event
 */
function handlePlaybackResumed() {
  updatePlaybackButtons(true, false);
}

/**
 * Update playback button states
 * @param {boolean} isPlaying 
 * @param {boolean} isPaused 
 */
function updatePlaybackButtons(isPlaying, isPaused) {
  const playBtn = containerElement.querySelector('.play-btn');
  const stopBtn = containerElement.querySelector('.stop-btn');
  const pauseBtn = containerElement.querySelector('.pause-btn');

  if (playBtn && stopBtn && pauseBtn) {
    playBtn.disabled = isPlaying;
    stopBtn.disabled = !isPlaying && !isPaused;
    pauseBtn.disabled = !isPlaying && !isPaused;

    // Update pause button text based on pause state
    pauseBtn.textContent = isPaused ? '▶' : '⏸';
    pauseBtn.title = isPaused ? '繼續' : '暫停';
    
    // Update play button text
    playBtn.textContent = '▶';
    playBtn.title = '播放';
  }
}

/**
 * Update playback time display
 * @param {number} milliseconds 
 */
function updatePlaybackTime(milliseconds) {
  const timeDisplay = containerElement.querySelector('.playback-time');
  if (timeDisplay) {
    const seconds = Math.floor(milliseconds / 1000);
    const ms = milliseconds % 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
}

// Update time display during playback
if (typeof requestAnimationFrame !== 'undefined') {
  function updateTimeDisplay() {
    if (sequence && sequence.playbackState.isPlaying) {
      updatePlaybackTime(sequence.playbackState.currentTime || 0);
    }
    requestAnimationFrame(updateTimeDisplay);
  }
  requestAnimationFrame(updateTimeDisplay);
}
