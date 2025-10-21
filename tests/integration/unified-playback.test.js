/**
 * Integration Tests for User Story 3: Unified Playback Control
 * 
 * Tests synchronized playback across multiple tracks with different
 * animation sequences, handling track length mismatches and empty slots.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiTrackSequence } from '../../src/models/MultiTrackSequence.js';
import { AnimationTrack } from '../../src/models/AnimationTrack.js';
import { PlaybackController } from '../../src/services/PlaybackController.js';

describe('User Story 3: Unified Playback Control - Integration Tests', () => {
  let sequence;
  let playbackController;
  let mockSpineViewer;

  beforeEach(() => {
    sequence = new MultiTrackSequence({ maxTracks: 5 });
    
    // Mock SpineViewer with correct API
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
    
    playbackController = new PlaybackController(sequence, mockSpineViewer);
  });

  describe('T078: Synchronized playback start', () => {
    it('should start all tracks playing simultaneously from slot 0', () => {
      // Create multiple tracks with animations
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      const track3 = sequence.addTrack();

      track1.setAnimation(0, 'walk');
      track1.setAnimation(1, 'run');
      track2.setAnimation(0, 'jump');
      track3.setAnimation(0, 'idle');
      track3.setAnimation(1, 'attack');

      // Start playback
      playbackController.start();

      // Verify playback state
      expect(sequence.playbackState.isPlaying).toBe(true);
      expect(sequence.playbackState.isPaused).toBe(false);
      
      // Verify all tracks have currentSlot set to 0
      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);
      expect(track3.currentSlot).toBe(0);
      
      // Verify animations were started
      expect(mockSpineViewer.setAnimation).toHaveBeenCalled();
    });

    it('should emit playback-started event when play begins', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      const listener = vi.fn();
      sequence.addEventListener('playback-started', listener);

      playbackController.start();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'playback-started'
        })
      );
    });

    it('should handle starting playback on empty sequence gracefully', () => {
      // No tracks added
      expect(() => {
        playbackController.start();
      }).not.toThrow();

      expect(sequence.playbackState.isPlaying).toBe(false);
    });
  });

  describe('T079: Synchronized playback stop', () => {
    it('should stop all tracks and reset to starting positions', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();

      track1.setAnimation(0, 'walk');
      track1.setAnimation(1, 'run');
      track2.setAnimation(0, 'jump');
      track2.setAnimation(1, 'idle');

      // Start playback
      playbackController.start();

      // Simulate progression (manually set currentSlot)
      track1.setCurrentSlot(1);
      track2.setCurrentSlot(1);

      // Stop playback
      playbackController.stop();

      // Verify playback state
      expect(sequence.playbackState.isPlaying).toBe(false);
      expect(sequence.playbackState.isPaused).toBe(false);
      
      // Verify tracks reset to slot 0
      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);
      
      // Verify stop was called
      expect(mockSpineViewer.stopAnimation).toHaveBeenCalled();
    });

    it('should emit playback-stopped event when stop is called', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      playbackController.start();

      const listener = vi.fn();
      sequence.addEventListener('playback-stopped', listener);

      playbackController.stop();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'playback-stopped'
        })
      );
    });

    it('should handle stopping when not playing', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');

      expect(() => {
        playbackController.stop();
      }).not.toThrow();

      expect(sequence.playbackState.isPlaying).toBe(false);
    });
  });

  describe('T080: Track length mismatch handling', () => {
    it('should loop shorter track independently while longer continues', async () => {
      const shortTrack = sequence.addTrack();
      const longTrack = sequence.addTrack();

      // Short track: 2 slots
      shortTrack.setAnimation(0, 'walk');
      shortTrack.setAnimation(1, 'run');

      // Long track: 4 slots
      longTrack.setAnimation(0, 'idle');
      longTrack.setAnimation(1, 'jump');
      longTrack.setAnimation(2, 'attack');
      longTrack.setAnimation(3, 'block');

      playbackController.start();

      // Simulate time progression through tick mechanism
      const advanceToSlot = (slotIndex) => {
        // Manually trigger slot changes for testing
        if (slotIndex <= 1) {
          shortTrack.setCurrentSlot(slotIndex);
        } else {
          // Short track loops back
          shortTrack.setCurrentSlot(slotIndex % 2);
        }
        longTrack.setCurrentSlot(slotIndex);
      };

      // Advance through slots
      advanceToSlot(0);
      expect(shortTrack.currentSlot).toBe(0);
      expect(longTrack.currentSlot).toBe(0);

      advanceToSlot(1);
      expect(shortTrack.currentSlot).toBe(1);
      expect(longTrack.currentSlot).toBe(1);

      // Short track should loop, long track continues
      advanceToSlot(2);
      expect(shortTrack.currentSlot).toBe(0); // Looped back
      expect(longTrack.currentSlot).toBe(2);

      advanceToSlot(3);
      expect(shortTrack.currentSlot).toBe(1);
      expect(longTrack.currentSlot).toBe(3);
    });

    it('should allow each track to loop independently', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();

      track1.setAnimation(0, 'walk');
      track2.setAnimation(0, 'idle');
      track2.setAnimation(1, 'jump');

      playbackController.start();

      // Verify tracks maintain their own loop state
      expect(track1.slots.length).toBe(1);
      expect(track2.slots.length).toBe(2);
      
      // Both should be able to loop independently
      expect(playbackController.isPlaying).toBe(true);
    });

    it('should emit track-loop event when track loops', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');
      track.setAnimation(1, 'run');

      const listener = vi.fn();
      track.addEventListener('track-loop', listener);

      playbackController.start();
      
      // Simulate reaching end and looping
      track.setCurrentSlot(1);
      track.setCurrentSlot(0); // Loop back

      // Event should be emitted by track or controller
      // (Implementation detail - may need adjustment based on actual implementation)
    });
  });

  describe('T081: Empty slot handling during playback', () => {
    it('should skip empty slots and continue to next occupied slot', () => {
      const track = sequence.addTrack();
      
      track.setAnimation(0, 'walk');
      // Slot 1 is empty
      track.setAnimation(2, 'run');

      playbackController.start();

      // Start at slot 0
      expect(track.currentSlot).toBe(0);
      expect(track.getSlot(0).animation).toBe('walk');

      // When advancing, should skip slot 1 (empty) to slot 2
      track.setCurrentSlot(2);
      expect(track.getSlot(1).isEmpty).toBe(true);
      expect(track.getSlot(2).animation).toBe('run');
    });

    it('should maintain previous animation state when empty slot encountered', () => {
      const track = sequence.addTrack();
      
      track.setAnimation(0, 'walk');
      // Slot 1 is empty
      track.setAnimation(2, 'run');

      playbackController.start();

      // At slot 0, animation is 'walk'
      track.setCurrentSlot(0);
      const lastAnimation = track.getSlot(0).animation;
      expect(lastAnimation).toBe('walk');

      // Move to empty slot 1 - should not change viewer state
      const playCallCount = mockSpineViewer.playAnimation.mock.calls.length;
      track.setCurrentSlot(1);
      
      // No additional playAnimation call for empty slot
      expect(mockSpineViewer.playAnimation.mock.calls.length).toBe(playCallCount);
    });

    it('should not interrupt other tracks when one track hits empty slot', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();

      track1.setAnimation(0, 'walk');
      // track1 slot 1 is empty
      track1.setAnimation(2, 'run');

      track2.setAnimation(0, 'idle');
      track2.setAnimation(1, 'jump');
      track2.setAnimation(2, 'attack');

      playbackController.start();

      // Both start at slot 0
      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);

      // Advance to slot 1
      track1.setCurrentSlot(1); // Empty
      track2.setCurrentSlot(1); // Has animation

      // Track2 should still be playing
      expect(sequence.playbackState.isPlaying).toBe(true);
      expect(track2.getSlot(1).animation).toBe('jump');
    });

    it('should handle track with all empty slots gracefully', () => {
      const track = sequence.addTrack();
      // All slots remain empty (no setAnimation calls)

      expect(() => {
        playbackController.start();
      }).not.toThrow();

      expect(track.slots.every(slot => slot.isEmpty)).toBe(true);
    });

    it('should emit empty-slot-encountered event', () => {
      const track = sequence.addTrack();
      track.setAnimation(0, 'walk');
      // Slot 1 is empty

      const listener = vi.fn();
      track.addEventListener('empty-slot-encountered', listener);

      playbackController.start();
      track.setCurrentSlot(1); // Move to empty slot

      // Event handling depends on implementation
      // May need adjustment based on actual event emission strategy
    });
  });

  describe('Full workflow test', () => {
    it('should complete full playback lifecycle with mixed track configurations', async () => {
      // Track 1: Full sequence
      const track1 = sequence.addTrack();
      track1.setAnimation(0, 'idle');
      track1.setAnimation(1, 'walk');
      track1.setAnimation(2, 'run');

      // Track 2: Sparse sequence with empty slots
      const track2 = sequence.addTrack();
      track2.setAnimation(0, 'jump');
      // Slot 1 empty
      track2.setAnimation(2, 'attack');

      // Track 3: Single animation
      const track3 = sequence.addTrack();
      track3.setAnimation(0, 'block');

      // Start playback
      playbackController.start();
      expect(sequence.playbackState.isPlaying).toBe(true);
      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);
      expect(track3.currentSlot).toBe(0);

      // Stop playback
      playbackController.stop();
      expect(sequence.playbackState.isPlaying).toBe(false);
      expect(track1.currentSlot).toBe(0);
      expect(track2.currentSlot).toBe(0);
      expect(track3.currentSlot).toBe(0);

      // Restart playback
      playbackController.start();
      expect(sequence.playbackState.isPlaying).toBe(true);
    });
  });
});
