import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationTrack } from '../../../src/models/AnimationTrack.js';
import { AnimationSlot } from '../../../src/models/AnimationSlot.js';

describe('AnimationTrack', () => {
  describe('constructor', () => {
    it('should create track with default values', () => {
      const track = new AnimationTrack();
      
      expect(track.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(track.name).toMatch(/^Track \d+$/);
      expect(track.slots).toEqual([]);
      expect(track.currentSlotIndex).toBe(0);
      expect(track.isActive).toBe(true);
    });

    it('should create track with custom name', () => {
      const track = new AnimationTrack('Body Movement');
      expect(track.name).toBe('Body Movement');
    });

    it('should throw error for empty name', () => {
      expect(() => new AnimationTrack('')).toThrow('name cannot be empty');
    });

    it('should be an instance of EventTarget', () => {
      const track = new AnimationTrack();
      expect(track).toBeInstanceOf(EventTarget);
    });

    it('should create track with custom options', () => {
      const track = new AnimationTrack('Test', { minSlots: 10, maxSlots: 30 });
      expect(track.minSlots).toBe(10);
      expect(track.maxSlots).toBe(30);
    });
  });

  describe('addSlot()', () => {
    let track;

    beforeEach(() => {
      track = new AnimationTrack('Test Track');
    });

    it('should add empty slot to end by default', () => {
      const slot = track.addSlot();
      
      expect(track.slots.length).toBe(1);
      expect(slot).toBeInstanceOf(AnimationSlot);
      expect(slot.index).toBe(0);
      expect(slot.isEmpty).toBe(true);
    });

    it('should add slot with animation', () => {
      const slot = track.addSlot('walk');
      
      expect(slot.animation).toBe('walk');
      expect(slot.isEmpty).toBe(false);
    });

    it('should add slot at specific index', () => {
      track.addSlot('walk');
      track.addSlot('run');
      const slot = track.addSlot('jump', 1);
      
      expect(track.slots.length).toBe(3);
      expect(track.slots[1].animation).toBe('jump');
      expect(track.slots[2].animation).toBe('run');
    });

    it('should emit slot-added event', () => {
      const listener = vi.fn();
      track.addEventListener('slot-added', listener);
      
      const slot = track.addSlot('walk');
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail.slot).toBe(slot);
      expect(listener.mock.calls[0][0].detail.index).toBe(0);
    });

    it('should throw error if maxSlots exceeded', () => {
      const track = new AnimationTrack('Test', { maxSlots: 2 });
      track.addSlot();
      track.addSlot();
      
      expect(() => track.addSlot()).toThrow('Maximum slots exceeded');
    });

    it('should update indices for all slots after insertion', () => {
      track.addSlot('a'); // index 0
      track.addSlot('b'); // index 1
      track.addSlot('c', 1); // insert at 1
      
      expect(track.slots[0].index).toBe(0);
      expect(track.slots[1].index).toBe(1);
      expect(track.slots[2].index).toBe(2);
    });
  });

  describe('removeSlot()', () => {
    let track;

    beforeEach(() => {
      track = new AnimationTrack('Test Track');
      track.addSlot('walk');
      track.addSlot('run');
      track.addSlot('jump');
    });

    it('should remove slot at index', () => {
      track.removeSlot(1);
      
      expect(track.slots.length).toBe(2);
      expect(track.slots[0].animation).toBe('walk');
      expect(track.slots[1].animation).toBe('jump');
    });

    it('should emit slot-removed event', () => {
      const listener = vi.fn();
      track.addEventListener('slot-removed', listener);
      
      track.removeSlot(1);
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail.index).toBe(1);
    });

    it('should throw error if removing last slot', () => {
      const track = new AnimationTrack('Test');
      track.addSlot('walk');
      
      expect(() => track.removeSlot(0)).toThrow('Cannot remove last slot');
    });

    it('should throw error for invalid index', () => {
      expect(() => track.removeSlot(10)).toThrow('Invalid slot index');
    });

    it('should update indices after removal', () => {
      track.removeSlot(1); // Remove 'run'
      
      expect(track.slots[0].index).toBe(0);
      expect(track.slots[1].index).toBe(1);
    });
  });

  describe('moveSlot()', () => {
    let track;

    beforeEach(() => {
      track = new AnimationTrack('Test Track');
      track.addSlot('a');
      track.addSlot('b');
      track.addSlot('c');
      track.addSlot('d');
    });

    it('should move slot forward', () => {
      track.moveSlot(1, 3); // Move 'b' to position 3
      
      expect(track.slots.map(s => s.animation)).toEqual(['a', 'c', 'd', 'b']);
    });

    it('should move slot backward', () => {
      track.moveSlot(3, 1); // Move 'd' to position 1
      
      expect(track.slots.map(s => s.animation)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('should emit slot-moved event', () => {
      const listener = vi.fn();
      track.addEventListener('slot-moved', listener);
      
      track.moveSlot(1, 3);
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        fromIndex: 1,
        toIndex: 3
      });
    });

    it('should throw error for invalid indices', () => {
      expect(() => track.moveSlot(-1, 2)).toThrow('Invalid slot indices');
      expect(() => track.moveSlot(0, 10)).toThrow('Invalid slot indices');
    });

    it('should do nothing if indices are the same', () => {
      const originalOrder = track.slots.map(s => s.animation);
      track.moveSlot(2, 2);
      
      expect(track.slots.map(s => s.animation)).toEqual(originalOrder);
    });

    it('should update indices after move', () => {
      track.moveSlot(1, 3);
      
      track.slots.forEach((slot, i) => {
        expect(slot.index).toBe(i);
      });
    });
  });

  describe('setAnimation()', () => {
    let track;

    beforeEach(() => {
      track = new AnimationTrack('Test Track');
      track.addSlot('walk');
      track.addSlot('run');
    });

    it('should set animation at slot index', () => {
      track.setAnimation(0, 'jump');
      
      expect(track.slots[0].animation).toBe('jump');
    });

    it('should clear animation with null', () => {
      track.setAnimation(0, null);
      
      expect(track.slots[0].isEmpty).toBe(true);
    });

    it('should emit animation-changed event', () => {
      const listener = vi.fn();
      track.addEventListener('animation-changed', listener);
      
      track.setAnimation(1, 'fly');
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        slotIndex: 1,
        animation: 'fly'
      });
    });

    it('should throw error for invalid index', () => {
      expect(() => track.setAnimation(10, 'walk')).toThrow('Invalid slot index');
    });
  });

  describe('rename()', () => {
    let track;

    beforeEach(() => {
      track = new AnimationTrack('Original Name');
    });

    it('should update track name', () => {
      track.rename('New Name');
      expect(track.name).toBe('New Name');
    });

    it('should emit track-renamed event', () => {
      const listener = vi.fn();
      track.addEventListener('track-renamed', listener);
      
      track.rename('Updated');
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        oldName: 'Original Name',
        newName: 'Updated'
      });
    });

    it('should throw error for empty name', () => {
      expect(() => track.rename('')).toThrow('name cannot be empty');
    });

    it('should trim whitespace', () => {
      track.rename('  Trimmed  ');
      expect(track.name).toBe('Trimmed');
    });
  });

  describe('getSlot()', () => {
    let track;

    beforeEach(() => {
      track = new AnimationTrack('Test Track');
      track.addSlot('walk');
      track.addSlot('run');
    });

    it('should return slot at index', () => {
      const slot = track.getSlot(1);
      expect(slot.animation).toBe('run');
    });

    it('should return null for invalid index', () => {
      expect(track.getSlot(10)).toBeNull();
      expect(track.getSlot(-1)).toBeNull();
    });
  });

  describe('setCurrentSlot()', () => {
    let track;

    beforeEach(() => {
      track = new AnimationTrack('Test Track');
      track.addSlot('walk');
      track.addSlot('run');
      track.addSlot('jump');
    });

    it('should update current slot index', () => {
      track.setCurrentSlot(2);
      expect(track.currentSlotIndex).toBe(2);
    });

    it('should emit playback-position-changed event', () => {
      const listener = vi.fn();
      track.addEventListener('playback-position-changed', listener);
      
      track.setCurrentSlot(1);
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        previousIndex: 0,
        currentIndex: 1
      });
    });

    it('should throw error for invalid index', () => {
      expect(() => track.setCurrentSlot(10)).toThrow('Invalid slot index');
      expect(() => track.setCurrentSlot(-1)).toThrow('Invalid slot index');
    });

    it('should not emit event if index unchanged', () => {
      const listener = vi.fn();
      track.setCurrentSlot(1);
      track.addEventListener('playback-position-changed', listener);
      
      track.setCurrentSlot(1);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
