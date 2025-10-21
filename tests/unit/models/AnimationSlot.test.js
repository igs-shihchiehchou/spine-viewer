import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationSlot } from '../../../src/models/AnimationSlot.js';

describe('AnimationSlot', () => {
  describe('constructor', () => {
    it('should create an empty slot with default values', () => {
      const slot = new AnimationSlot(0);
      
      expect(slot.index).toBe(0);
      expect(slot.animation).toBeNull();
      expect(slot.isPlaying).toBe(false);
      expect(slot.isEmpty).toBe(true);
    });

    it('should create a slot with an animation', () => {
      const slot = new AnimationSlot(1, 'walk');
      
      expect(slot.index).toBe(1);
      expect(slot.animation).toBe('walk');
      expect(slot.isEmpty).toBe(false);
    });

    it('should throw error for negative index', () => {
      expect(() => new AnimationSlot(-1)).toThrow('index cannot be negative');
    });

    it('should be an instance of EventTarget', () => {
      const slot = new AnimationSlot(0);
      expect(slot).toBeInstanceOf(EventTarget);
    });
  });

  describe('setAnimation()', () => {
    let slot;

    beforeEach(() => {
      slot = new AnimationSlot(0);
    });

    it('should set animation and update isEmpty', () => {
      slot.setAnimation('run');
      
      expect(slot.animation).toBe('run');
      expect(slot.isEmpty).toBe(false);
    });

    it('should clear animation when set to null', () => {
      slot.setAnimation('walk');
      slot.setAnimation(null);
      
      expect(slot.animation).toBeNull();
      expect(slot.isEmpty).toBe(true);
    });

    it('should emit animation-set event when animation assigned', () => {
      const listener = vi.fn();
      slot.addEventListener('animation-set', listener);
      
      slot.setAnimation('jump');
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        animation: 'jump',
        index: 0
      });
    });

    it('should emit animation-cleared event when set to null', () => {
      slot.setAnimation('walk');
      const listener = vi.fn();
      slot.addEventListener('animation-cleared', listener);
      
      slot.setAnimation(null);
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        index: 0
      });
    });

    it('should stop playback when animation changed', () => {
      slot.setAnimation('walk');
      slot.isPlaying = true; // Simulate playing state
      
      slot.setAnimation('run');
      
      expect(slot.isPlaying).toBe(false);
    });
  });

  describe('play()', () => {
    let slot;

    beforeEach(() => {
      slot = new AnimationSlot(0, 'walk');
    });

    it('should set isPlaying to true', () => {
      slot.play();
      expect(slot.isPlaying).toBe(true);
    });

    it('should emit playback-started event', () => {
      const listener = vi.fn();
      slot.addEventListener('playback-started', listener);
      
      slot.play();
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        animation: 'walk',
        index: 0
      });
    });

    it('should throw error if slot is empty', () => {
      const emptySlot = new AnimationSlot(0);
      expect(() => emptySlot.play()).toThrow('Cannot play empty slot');
    });

    it('should not emit event if already playing', () => {
      const listener = vi.fn();
      slot.addEventListener('playback-started', listener);
      
      slot.play();
      slot.play(); // Second call
      
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('stop()', () => {
    let slot;

    beforeEach(() => {
      slot = new AnimationSlot(0, 'walk');
      slot.play();
    });

    it('should set isPlaying to false', () => {
      slot.stop();
      expect(slot.isPlaying).toBe(false);
    });

    it('should emit playback-stopped event', () => {
      const listener = vi.fn();
      slot.addEventListener('playback-stopped', listener);
      
      slot.stop();
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        index: 0
      });
    });

    it('should not emit event if already stopped', () => {
      const listener = vi.fn();
      slot.stop();
      slot.addEventListener('playback-stopped', listener);
      
      slot.stop(); // Second call
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('isEmpty getter', () => {
    it('should return true when animation is null', () => {
      const slot = new AnimationSlot(0);
      expect(slot.isEmpty).toBe(true);
    });

    it('should return false when animation is set', () => {
      const slot = new AnimationSlot(0, 'walk');
      expect(slot.isEmpty).toBe(false);
    });

    it('should update when animation changes', () => {
      const slot = new AnimationSlot(0);
      expect(slot.isEmpty).toBe(true);
      
      slot.setAnimation('run');
      expect(slot.isEmpty).toBe(false);
      
      slot.setAnimation(null);
      expect(slot.isEmpty).toBe(true);
    });
  });
});
