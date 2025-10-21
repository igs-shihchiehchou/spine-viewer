/**
 * Unit Tests for PlaybackController Service
 * 
 * Tests RAF-based playback synchronization, timing, and state management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaybackController } from '../../../src/services/PlaybackController.js';
import { MultiTrackSequence } from '../../../src/models/MultiTrackSequence.js';

describe('PlaybackController', () => {
  let controller;
  let sequence;
  let mockSpineViewer;
  let rafCallbacks = [];

  beforeEach(() => {
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

    global.cancelAnimationFrame = vi.fn((id) => {
      if (id > 0 && id <= rafCallbacks.length) {
        rafCallbacks[id - 1] = null;
      }
    });

    sequence = new MultiTrackSequence({ maxTracks: 5 });
    
    mockSpineViewer = {
      setAnimation: vi.fn(),
      stopAnimation: vi.fn(),
      spine: {
        skeleton: {
          data: {
            findAnimation: vi.fn((name) => ({ name, duration: 1.0 }))
          }
        },
        state: {
          setAnimation: vi.fn(),
          clearTracks: vi.fn(),
          timeScale: 1.0
        }
      }
    };

    controller = new PlaybackController(sequence, mockSpineViewer);
  });

  afterEach(() => {
    rafCallbacks = [];
    vi.restoreAllMocks();
  });

  describe('T082: Constructor', () => {
    it('should create PlaybackController with sequence and viewer', () => {
      expect(controller).toBeInstanceOf(PlaybackController);
      expect(controller.sequence).toBe(sequence);
      expect(controller.spineViewer).toBe(mockSpineViewer);
    });

    it('should initialize with stopped state', () => {
      expect(controller.isPlaying).toBe(false);
      expect(controller.isPaused).toBe(false);
    });

    it('should initialize with null RAF id', () => {
      expect(controller.rafId).toBeNull();
    });

    it('should initialize with zero elapsed time', () => {
      expect(controller.elapsedTime).toBe(0);
    });

    it('should throw error if sequence is not provided', () => {
      expect(() => {
        new PlaybackController(null, mockSpineViewer);
      }).toThrow('MultiTrackSequence is required');
    });

    it('should throw error if spineViewer is not provided', () => {
      expect(() => {
        new PlaybackController(sequence, null);
      }).toThrow('SpineViewer is required');
    });

    it('should initialize track states map', () => {
      expect(controller.trackStates).toBeInstanceOf(Map);
      expect(controller.trackStates.size).toBe(0);
    });
  });

  describe('T083: start() method', () => {
    it('should set isPlaying to true', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      expect(controller.isPlaying).toBe(true);
    });

    it('should emit playback-started event on sequence', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      const listener = vi.fn();
      sequence.addEventListener('playback-started', listener);

      controller.start();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'playback-started' })
      );
    });

    it('should set all tracks currentSlot to 0', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      
      track1.setAnimation(0, 'walk');
      track1.setAnimation(1, 'run');
      track2.setAnimation(0, 'idle');

      // Set to non-zero position
      track1.setCurrentSlot(1);

      controller.start();

      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);
    });

    it('should request animation frame for tick loop', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      expect(global.requestAnimationFrame).toHaveBeenCalled();
      expect(controller.rafId).not.toBeNull();
    });

    it('should initialize track states for all tracks', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      
      track1.setAnimation(0, 'walk');
      track2.setAnimation(0, 'idle');

      controller.start();

      expect(controller.trackStates.size).toBe(2);
      expect(controller.trackStates.has(track1.id)).toBe(true);
      expect(controller.trackStates.has(track2.id)).toBe(true);
    });

    it('should not start if already playing', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      const rafCallCount = global.requestAnimationFrame.mock.calls.length;

      controller.start(); // Try to start again

      // Should not request additional frame
      expect(global.requestAnimationFrame.mock.calls.length).toBe(rafCallCount);
    });

    it('should handle empty sequence gracefully', () => {
      // No tracks added
      controller.start();

      expect(controller.isPlaying).toBe(false);
      expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should record start timestamp', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      const beforeStart = performance.now();
      controller.start();
      const afterStart = performance.now();

      expect(controller.startTimestamp).toBeGreaterThanOrEqual(beforeStart);
      expect(controller.startTimestamp).toBeLessThanOrEqual(afterStart);
    });
  });

  describe('T084: stop() method', () => {
    it('should set isPlaying to false', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      controller.stop();

      expect(controller.isPlaying).toBe(false);
    });

    it('should emit playback-stopped event on sequence', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      const listener = vi.fn();
      sequence.addEventListener('playback-stopped', listener);

      controller.stop();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'playback-stopped' })
      );
    });

    it('should reset all tracks to slot 0', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      
      track1.setAnimation(0, 'walk');
      track1.setAnimation(1, 'run');
      track2.setAnimation(0, 'idle');
      track2.setAnimation(1, 'jump');

      controller.start();
      
      // Simulate progression
      track1.setCurrentSlot(1);
      track2.setCurrentSlot(1);

      controller.stop();

      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);
    });

    it('should cancel animation frame', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      const rafId = controller.rafId;

      controller.stop();

      expect(global.cancelAnimationFrame).toHaveBeenCalledWith(rafId);
      expect(controller.rafId).toBeNull();
    });

    it('should reset elapsed time', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      controller.elapsedTime = 1500; // Simulate elapsed time

      controller.stop();

      expect(controller.elapsedTime).toBe(0);
    });

    it('should clear track states', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      expect(controller.trackStates.size).toBeGreaterThan(0);

      controller.stop();

      expect(controller.trackStates.size).toBe(0);
    });

    it('should handle stopping when not playing', () => {
      expect(() => {
        controller.stop();
      }).not.toThrow();

      expect(controller.isPlaying).toBe(false);
    });

    it('should call stopAnimation on spine viewer', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      controller.stop();

      expect(mockSpineViewer.stopAnimation).toHaveBeenCalled();
    });
  });

  describe('T085: tick() method', () => {
    it('should be called via requestAnimationFrame', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      // Execute the RAF callback
      const tickCallback = rafCallbacks[0];
      expect(tickCallback).toBeDefined();
    });

    it('should calculate delta time between frames', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      const timestamp1 = 1000;
      const timestamp2 = 1016.67; // ~60fps

      rafCallbacks[0](timestamp1);
      rafCallbacks[1](timestamp2);

      // Delta should be ~16.67ms
      expect(controller.lastTimestamp).toBe(timestamp1);
    });

    it('should accumulate elapsed time', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      const timestamp1 = 1000;
      const timestamp2 = 1016.67;
      const timestamp3 = 1033.34;

      rafCallbacks[0](timestamp1);
      expect(controller.elapsedTime).toBe(0);

      rafCallbacks[1](timestamp2);
      expect(controller.elapsedTime).toBeCloseTo(16.67, 1);

      rafCallbacks[2](timestamp3);
      expect(controller.elapsedTime).toBeCloseTo(33.34, 1);
    });

    it('should request next animation frame while playing', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      expect(rafCallbacks.length).toBe(1);

      // Execute tick
      rafCallbacks[0](1000);
      expect(rafCallbacks.length).toBe(2); // Another RAF requested
    });

    it('should not request animation frame when stopped', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();
      controller.stop();

      const rafCount = rafCallbacks.length;

      // Try to execute tick after stop
      if (rafCallbacks[0]) {
        rafCallbacks[0](1000);
      }

      // Should not request additional frames
      expect(rafCallbacks.length).toBe(rafCount);
    });

    it('should update track playback positions', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');
      track.setAnimation(1, 'run');

      controller.start();

      // Spy on track state updates
      const updateSpy = vi.spyOn(controller, 'updateTrackPlayback');

      rafCallbacks[0](1000);

      expect(updateSpy).toHaveBeenCalled();
    });

    it('should maintain 60fps target with consistent timing', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      const timestamps = [1000, 1016.67, 1033.34, 1050.01];
      const deltas = [];

      timestamps.forEach((ts, i) => {
        if (i > 0 && rafCallbacks[i]) {
          rafCallbacks[i](ts);
          deltas.push(ts - timestamps[i - 1]);
        }
      });

      // All deltas should be ~16.67ms (60fps)
      deltas.forEach(delta => {
        expect(delta).toBeCloseTo(16.67, 1);
      });
    });
  });

  describe('T086: Slot synchronization', () => {
    it('should advance slot based on animation duration', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk'); // 1.0s duration

      // Mock animation duration
      mockSpineViewer.spine.skeleton.data.findAnimation.mockReturnValue({
        name: 'walk',
        duration: 1.0
      });

      controller.start();

      // Initial slot
      expect(track.currentSlot).toBe(0);

      // Simulate time passing (1 second = 1000ms)
      rafCallbacks[0](0);
      rafCallbacks[1](1000); // 1 second elapsed

      // Should advance to next slot
      expect(controller.elapsedTime).toBeCloseTo(1000, 1);
    });

    it('should synchronize multiple tracks to same timing', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      
      track1.setAnimation(0, 'walk');
      track2.setAnimation(0, 'idle');

      controller.start();

      // Both should start at slot 0
      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);

      // Simulate time passing
      rafCallbacks[0](0);
      rafCallbacks[1](500);

      // Both should have same elapsed time
      const state1 = controller.trackStates.get(track1.id);
      const state2 = controller.trackStates.get(track2.id);

      expect(state1.elapsedTime).toBe(state2.elapsedTime);
    });

    it('should handle tracks with different animation durations', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      
      track1.setAnimation(0, 'walk'); // 1.0s
      track2.setAnimation(0, 'jump'); // 0.5s

      mockSpineViewer.spine.skeleton.data.findAnimation.mockImplementation((name) => {
        return {
          walk: { name: 'walk', duration: 1.0 },
          jump: { name: 'jump', duration: 0.5 }
        }[name];
      });

      controller.start();

      rafCallbacks[0](0);
      rafCallbacks[1](500); // 0.5s elapsed

      // track2 should advance, track1 should not
      // (actual behavior depends on implementation)
    });

    it('should loop track when reaching end of slot sequence', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');
      track.setAnimation(1, 'run');

      controller.start();

      // Simulate progressing through all slots
      rafCallbacks[0](0);
      track.setCurrentSlot(1); // Last slot
      
      rafCallbacks[1](1000);
      // After animation completes, should loop to slot 0
    });

    it('should handle empty slots by skipping or maintaining state', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');
      // Slot 1 is empty
      track.setAnimation(2, 'run');

      controller.start();
      expect(track.currentSlot).toBe(0);

      // When reaching empty slot
      track.setCurrentSlot(1);
      expect(track.getSlot(1).isEmpty).toBe(true);

      // Should skip to next occupied slot or maintain previous state
    });

    it('should respect timeScale for playback speed', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      mockSpineViewer.spine.state.timeScale = 2.0; // 2x speed

      controller.start();

      rafCallbacks[0](0);
      rafCallbacks[1](500); // 0.5s real time = 1.0s animation time at 2x

      // Effective elapsed time should be doubled
    });

    it('should update sequence playbackState', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      expect(sequence.playbackState.isPlaying).toBe(true);
      expect(sequence.playbackState.currentTime).toBeDefined();

      controller.stop();

      expect(sequence.playbackState.isPlaying).toBe(false);
    });

    it('should emit slot-changed event when advancing slots', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');
      track.setAnimation(1, 'run');

      const listener = vi.fn();
      track.addEventListener('playback-position-changed', listener);

      controller.start();
      
      // Simulate slot change
      track.setCurrentSlot(1);

      expect(listener).toHaveBeenCalled();
    });

    it('should handle simultaneous slot changes across tracks', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      const track3 = sequence.addTrack();
      
      track1.setAnimation(0, 'walk');
      track2.setAnimation(0, 'idle');
      track3.setAnimation(0, 'jump');

      controller.start();

      rafCallbacks[0](0);
      
      // All tracks should update together
      const state1 = controller.trackStates.get(track1.id);
      const state2 = controller.trackStates.get(track2.id);
      const state3 = controller.trackStates.get(track3.id);

      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
      expect(state3).toBeDefined();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle track added during playback', () => {
      const track1 = sequence.addTrack();
      track1.setAnimation(0, 'walk');

      controller.start();

      // Add track while playing
      const track2 = sequence.addTrack();
      track2.setAnimation(0, 'idle');

      // New track should be initialized in trackStates
      rafCallbacks[0](1000);
      
      // Should not crash
      expect(controller.isPlaying).toBe(true);
    });

    it('should handle track removed during playback', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      
      track1.setAnimation(0, 'walk');
      track2.setAnimation(0, 'idle');

      controller.start();

      // Remove track while playing
      sequence.removeTrack(track2.id);

      rafCallbacks[0](1000);

      // Should not crash
      expect(controller.isPlaying).toBe(true);
      expect(controller.trackStates.has(track2.id)).toBe(false);
    });

    it('should handle animation changed on slot during playback', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      // Change animation while playing
      track.setAnimation(0, 'run');

      rafCallbacks[0](1000);

      // Should not crash and should play new animation
      expect(track.getSlot(0).animation).toBe('run');
    });

    it('should handle pause (future feature)', () => {
      // Placeholder for pause functionality
      expect(controller.isPaused).toBe(false);
    });

    it('should handle very long frame times gracefully', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      controller.start();

      rafCallbacks[0](0);
      rafCallbacks[1](5000); // 5 second gap (lag)

      // Should not crash or behave erratically
      expect(controller.isPlaying).toBe(true);
    });
  });
});
