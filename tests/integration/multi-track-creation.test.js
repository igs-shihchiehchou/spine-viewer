import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiTrackSequence } from '../../src/models/MultiTrackSequence.js';

describe('Multi-Track Creation Integration', () => {
  let sequence;

  beforeEach(() => {
    sequence = new MultiTrackSequence();
  });

  describe('Creating multiple tracks', () => {
    it('should create multiple tracks with unique IDs', () => {
      const track1 = sequence.addTrack('Track 1');
      const track2 = sequence.addTrack('Track 2');
      const track3 = sequence.addTrack('Track 3');

      expect(sequence.tracks.length).toBe(3);
      expect(track1.id).not.toBe(track2.id);
      expect(track2.id).not.toBe(track3.id);
    });

    it('should preserve track order', () => {
      const track1 = sequence.addTrack('First');
      const track2 = sequence.addTrack('Second');
      const track3 = sequence.addTrack('Third');

      expect(sequence.tracks[0].name).toBe('First');
      expect(sequence.tracks[1].name).toBe('Second');
      expect(sequence.tracks[2].name).toBe('Third');
    });

    it('should emit track-added events for each track', () => {
      const listener = vi.fn();
      sequence.addEventListener('track-added', listener);

      sequence.addTrack('Track 1');
      sequence.addTrack('Track 2');

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should respect maxTracks limit', () => {
      const limitedSequence = new MultiTrackSequence({ maxTracks: 3 });
      
      limitedSequence.addTrack();
      limitedSequence.addTrack();
      limitedSequence.addTrack();

      expect(() => limitedSequence.addTrack()).toThrow('Maximum tracks exceeded');
      expect(limitedSequence.tracks.length).toBe(3);
    });
  });

  describe('Track deletion', () => {
    let track1, track2, track3;

    beforeEach(() => {
      track1 = sequence.addTrack('Track 1');
      track2 = sequence.addTrack('Track 2');
      track3 = sequence.addTrack('Track 3');
    });

    it('should delete track and maintain remaining tracks', () => {
      sequence.removeTrack(track2.id);

      expect(sequence.tracks.length).toBe(2);
      expect(sequence.tracks[0]).toBe(track1);
      expect(sequence.tracks[1]).toBe(track3);
    });

    it('should emit track-removed event', () => {
      const listener = vi.fn();
      sequence.addEventListener('track-removed', listener);

      sequence.removeTrack(track2.id);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail.trackId).toBe(track2.id);
    });

    it('should not allow deleting last track', () => {
      sequence.removeTrack(track1.id);
      sequence.removeTrack(track2.id);

      expect(() => sequence.removeTrack(track3.id)).toThrow('Cannot remove last track');
      expect(sequence.tracks.length).toBe(1);
    });

    it('should handle invalid track ID gracefully', () => {
      expect(() => sequence.removeTrack('invalid-id')).toThrow('Track not found');
      expect(sequence.tracks.length).toBe(3); // No change
    });
  });

  describe('Drag-drop animation to track', () => {
    let track1, track2;

    beforeEach(() => {
      track1 = sequence.addTrack('Track 1');
      track2 = sequence.addTrack('Track 2');
      
      // Add slots to tracks
      track1.addSlot();
      track1.addSlot();
      track2.addSlot();
      track2.addSlot();
    });

    it('should add animation to specific track only', () => {
      track1.setAnimation(0, 'walk');
      
      expect(track1.slots[0].animation).toBe('walk');
      expect(track2.slots[0].animation).toBeNull(); // Other track unaffected
    });

    it('should support multiple animations in same track', () => {
      track1.setAnimation(0, 'walk');
      track1.setAnimation(1, 'run');
      
      expect(track1.slots[0].animation).toBe('walk');
      expect(track1.slots[1].animation).toBe('run');
    });

    it('should emit animation-changed event on track', () => {
      const listener = vi.fn();
      track1.addEventListener('animation-changed', listener);
      
      track1.setAnimation(0, 'jump');
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({
        slotIndex: 0,
        animation: 'jump'
      });
    });

    it('should support clearing animation (drag-drop to empty)', () => {
      track1.setAnimation(0, 'walk');
      track1.setAnimation(0, null);
      
      expect(track1.slots[0].isEmpty).toBe(true);
    });

    it('should maintain track isolation when adding animations', () => {
      track1.setAnimation(0, 'walk');
      track1.setAnimation(1, 'run');
      track2.setAnimation(0, 'jump');
      
      // Track 1
      expect(track1.slots[0].animation).toBe('walk');
      expect(track1.slots[1].animation).toBe('run');
      
      // Track 2
      expect(track2.slots[0].animation).toBe('jump');
      expect(track2.slots[1].animation).toBeNull();
    });

    it('should handle animation replacement in same slot', () => {
      track1.setAnimation(0, 'walk');
      
      const listener = vi.fn();
      track1.addEventListener('animation-changed', listener);
      
      track1.setAnimation(0, 'run'); // Replace
      
      expect(track1.slots[0].animation).toBe('run');
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('Full workflow', () => {
    it('should support complete create-populate-delete cycle', () => {
      // Create tracks
      const track1 = sequence.addTrack('Body');
      const track2 = sequence.addTrack('Face');
      const track3 = sequence.addTrack('Effects');
      
      // Add slots
      track1.addSlot('walk');
      track1.addSlot('run');
      track2.addSlot('smile');
      track2.addSlot('blink');
      track3.addSlot('sparkle');
      
      // Verify structure
      expect(sequence.tracks.length).toBe(3);
      expect(track1.slots.length).toBe(2);
      expect(track2.slots.length).toBe(2);
      expect(track3.slots.length).toBe(1);
      
      // Delete middle track
      sequence.removeTrack(track2.id);
      
      // Verify deletion
      expect(sequence.tracks.length).toBe(2);
      expect(sequence.tracks[0]).toBe(track1);
      expect(sequence.tracks[1]).toBe(track3);
      
      // Original tracks still functional
      track1.setAnimation(0, 'jump');
      expect(track1.slots[0].animation).toBe('jump');
    });
  });
});
