import { AnimationSlot } from './AnimationSlot.js';

/**
 * AnimationTrack - Represents a single horizontal track containing animation slots
 * 
 * Manages an ordered collection of animation slots and provides methods for
 * slot manipulation (add, remove, move, set animation).
 * 
 * @extends EventTarget
 */
export class AnimationTrack extends EventTarget {
  static #trackCounter = 0;

  /**
   * @param {string} name - Display name (defaults to "Track N")
   * @param {Object} options - Configuration options
   * @param {number} options.minSlots - Minimum slots to display (default: 8)
   * @param {number} options.maxSlots - Maximum allowed slots (default: 20)
   */
  constructor(name = null, options = {}) {
    super();
    
    // Auto-generate name if not provided
    if (name === null) {
      AnimationTrack.#trackCounter++;
      name = `Track ${AnimationTrack.#trackCounter}`;
    }
    
    if (name === '') {
      throw new Error('name cannot be empty');
    }
    
    this._id = crypto.randomUUID();
    this._name = name;
    this._slots = [];
    this._currentSlotIndex = 0;
    this._isActive = true;
    this._minSlots = options.minSlots || 8;
    this._maxSlots = options.maxSlots || 20;
  }

  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get slots() { return this._slots; }
  get currentSlotIndex() { return this._currentSlotIndex; }
  get isActive() { return this._isActive; }
  get minSlots() { return this._minSlots; }
  get maxSlots() { return this._maxSlots; }

  /**
   * Add slot at position
   * @param {string|null} animation - Animation name or null for empty slot
   * @param {number} index - Position to insert (default: end)
   * @returns {AnimationSlot} The created slot
   * @fires AnimationTrack#slot-added
   */
  addSlot(animation = null, index = null) {
    if (this._slots.length >= this._maxSlots) {
      throw new Error('Maximum slots exceeded');
    }

    // Default to end of array
    if (index === null) {
      index = this._slots.length;
    }

    // Validate index
    if (index < 0 || index > this._slots.length) {
      throw new Error('Invalid slot index');
    }

    const slot = new AnimationSlot(index, animation);
    this._slots.splice(index, 0, slot);

    // Update indices for all slots after insertion point
    this._updateSlotIndices(index);

    this.dispatchEvent(new CustomEvent('slot-added', {
      detail: { slot, index }
    }));

    return slot;
  }

  /**
   * Remove slot and shift remaining
   * @param {number} index - Slot index to remove
   * @fires AnimationTrack#slot-removed
   */
  removeSlot(index) {
    if (this._slots.length === 1) {
      throw new Error('Cannot remove last slot');
    }

    if (index < 0 || index >= this._slots.length) {
      throw new Error('Invalid slot index');
    }

    this._slots.splice(index, 1);

    // Update indices for remaining slots
    this._updateSlotIndices(index);

    this.dispatchEvent(new CustomEvent('slot-removed', {
      detail: { index }
    }));
  }

  /**
   * Reorder slots
   * @param {number} fromIndex - Source position
   * @param {number} toIndex - Destination position
   * @fires AnimationTrack#slot-moved
   */
  moveSlot(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this._slots.length ||
        toIndex < 0 || toIndex >= this._slots.length) {
      throw new Error('Invalid slot indices');
    }

    if (fromIndex === toIndex) {
      return; // No-op
    }

    const [slot] = this._slots.splice(fromIndex, 1);
    this._slots.splice(toIndex, 0, slot);

    // Update all slot indices
    this._updateSlotIndices(0);

    this.dispatchEvent(new CustomEvent('slot-moved', {
      detail: { fromIndex, toIndex }
    }));
  }

  /**
   * Set/clear animation at slot
   * @param {number} slotIndex - Slot position
   * @param {string|null} animationName - Animation name or null
   * @fires AnimationTrack#animation-changed
   */
  setAnimation(slotIndex, animationName) {
    const slot = this.getSlot(slotIndex);
    if (!slot) {
      throw new Error('Invalid slot index');
    }

    slot.setAnimation(animationName);

    this.dispatchEvent(new CustomEvent('animation-changed', {
      detail: { slotIndex, animation: animationName }
    }));
  }

  /**
   * Get slot by index
   * @param {number} index - Slot position
   * @returns {AnimationSlot|null}
   */
  getSlot(index) {
    if (index < 0 || index >= this._slots.length) {
      return null;
    }
    return this._slots[index];
  }

  /**
   * Update playback position
   * @param {number} index - New current slot index
   * @fires AnimationTrack#playback-position-changed
   */
  setCurrentSlot(index) {
    if (index < 0 || index >= this._slots.length) {
      throw new Error('Invalid slot index');
    }

    if (this._currentSlotIndex === index) {
      return; // No change
    }

    const previousIndex = this._currentSlotIndex;
    this._currentSlotIndex = index;

    this.dispatchEvent(new CustomEvent('playback-position-changed', {
      detail: { previousIndex, currentIndex: index }
    }));
  }

  /**
   * Change track name
   * @param {string} newName - New track name
   * @fires AnimationTrack#track-renamed
   */
  rename(newName) {
    newName = newName.trim();
    
    if (newName === '') {
      throw new Error('name cannot be empty');
    }

    const oldName = this._name;
    this._name = newName;

    this.dispatchEvent(new CustomEvent('track-renamed', {
      detail: { oldName, newName }
    }));
  }

  /**
   * Update slot indices after insertion/removal/move
   * @private
   * @param {number} startIndex - Index to start updating from
   */
  _updateSlotIndices(startIndex = 0) {
    for (let i = startIndex; i < this._slots.length; i++) {
      this._slots[i]._index = i;
    }
  }
}
