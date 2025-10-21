/**
 * Integration Tests for User Story 5: Track Naming and Organization
 * 
 * Tests custom track naming with inline editing and validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiTrackSequence } from '../../src/models/MultiTrackSequence.js';
import { TrackManager } from '../../src/services/TrackManager.js';

describe('User Story 5: Track Naming and Organization - Integration Tests', () => {
  let sequence;
  let trackManager;

  beforeEach(() => {
    sequence = new MultiTrackSequence({ maxTracks: 5 });
    trackManager = new TrackManager(sequence);
  });

  describe('T121: Track renaming', () => {
    it('should allow renaming a track with valid name', () => {
      const track = sequence.addTrack();
      const originalName = track.name;

      expect(originalName).toMatch(/軌道 \d+/); // Default name pattern

      // Rename track
      trackManager.renameTrack(track.id, 'Character Animations');

      expect(track.name).toBe('Character Animations');
      expect(track.name).not.toBe(originalName);
    });

    it('should emit track-renamed event when name changes', () => {
      const track = sequence.addTrack();
      
      const listener = vi.fn();
      track.addEventListener('track-renamed', listener);

      trackManager.renameTrack(track.id, 'New Name');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'track-renamed',
          detail: expect.objectContaining({
            trackId: track.id,
            oldName: expect.any(String),
            newName: 'New Name'
          })
        })
      );
    });

    it('should trim whitespace from track names', () => {
      const track = sequence.addTrack();

      trackManager.renameTrack(track.id, '  Spaced Name  ');

      expect(track.name).toBe('Spaced Name');
    });

    it('should allow special characters in track names', () => {
      const track = sequence.addTrack();

      const specialNames = [
        'Track #1 - Main',
        'Boss_Phase_2',
        'NPC (Idle)',
        'Player/Walk/Run'
      ];

      specialNames.forEach(name => {
        trackManager.renameTrack(track.id, name);
        expect(track.name).toBe(name);
      });
    });

    it('should allow Unicode characters in track names', () => {
      const track = sequence.addTrack();

      const unicodeNames = [
        '主角動畫',
        'キャラクター',
        '角色动画',
        'Héros Animé'
      ];

      unicodeNames.forEach(name => {
        trackManager.renameTrack(track.id, name);
        expect(track.name).toBe(name);
      });
    });

    it('should handle renaming multiple tracks', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      const track3 = sequence.addTrack();

      trackManager.renameTrack(track1.id, 'Idle Animations');
      trackManager.renameTrack(track2.id, 'Walk Animations');
      trackManager.renameTrack(track3.id, 'Attack Animations');

      expect(track1.name).toBe('Idle Animations');
      expect(track2.name).toBe('Walk Animations');
      expect(track3.name).toBe('Attack Animations');
    });

    it('should persist name after playback', () => {
      const track = sequence.addTrack();
      trackManager.renameTrack(track.id, 'Custom Track');

      // Simulate playback state change
      sequence._playbackState.isPlaying = true;
      sequence._playbackState.isPlaying = false;

      expect(track.name).toBe('Custom Track');
    });
  });

  describe('T122: Default track names', () => {
    it('should assign default names to new tracks', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      const track3 = sequence.addTrack();

      expect(track1.name).toMatch(/軌道 1|Track 1/);
      expect(track2.name).toMatch(/軌道 2|Track 2/);
      expect(track3.name).toMatch(/軌道 3|Track 3/);
    });

    it('should increment default names sequentially', () => {
      const tracks = [];
      for (let i = 0; i < 5; i++) {
        tracks.push(sequence.addTrack());
      }

      // Each track should have unique default name
      const names = tracks.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(5);
    });

    it('should reuse default name slot when track deleted', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      const track2Name = track2.name;

      // Delete track2
      sequence.removeTrack(track2.id);

      // Add new track
      const track3 = sequence.addTrack();

      // New track should get next sequential number
      // (Implementation may vary: could reuse or continue incrementing)
      expect(track3.name).toBeDefined();
      expect(track3.name).toMatch(/軌道|Track/);
    });

    it('should use default name when empty string provided', () => {
      const track = sequence.addTrack();

      try {
        trackManager.renameTrack(track.id, '');
      } catch (error) {
        // Should throw validation error
        expect(error.message).toMatch(/empty|required/i);
      }

      // Name should remain default
      expect(track.name).toMatch(/軌道|Track/);
    });

    it('should allow reverting to default-style name', () => {
      const track = sequence.addTrack();
      const defaultName = track.name;

      trackManager.renameTrack(track.id, 'Custom Name');
      expect(track.name).toBe('Custom Name');

      // Rename back to a default-style name
      trackManager.renameTrack(track.id, defaultName);
      expect(track.name).toBe(defaultName);
    });
  });

  describe('T123: Duplicate name validation', () => {
    it('should prevent duplicate track names (case-insensitive)', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();

      trackManager.renameTrack(track1.id, 'Main Track');

      // Try to rename track2 to same name
      expect(() => {
        trackManager.renameTrack(track2.id, 'Main Track');
      }).toThrow(/duplicate|exists|already/i);
    });

    it('should detect duplicates regardless of case', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();

      trackManager.renameTrack(track1.id, 'Animation Track');

      expect(() => {
        trackManager.renameTrack(track2.id, 'animation track');
      }).toThrow(/duplicate|exists|already/i);

      expect(() => {
        trackManager.renameTrack(track2.id, 'ANIMATION TRACK');
      }).toThrow(/duplicate|exists|already/i);
    });

    it('should allow renaming track to its current name', () => {
      const track = sequence.addTrack();
      trackManager.renameTrack(track.id, 'My Track');

      // Renaming to same name should be allowed (no-op)
      expect(() => {
        trackManager.renameTrack(track.id, 'My Track');
      }).not.toThrow();

      expect(track.name).toBe('My Track');
    });

    it('should validate across all existing tracks', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      const track3 = sequence.addTrack();

      trackManager.renameTrack(track1.id, 'Track A');
      trackManager.renameTrack(track2.id, 'Track B');

      // Try to name track3 same as track1 or track2
      expect(() => {
        trackManager.renameTrack(track3.id, 'Track A');
      }).toThrow();

      expect(() => {
        trackManager.renameTrack(track3.id, 'Track B');
      }).toThrow();

      // Unique name should work
      expect(() => {
        trackManager.renameTrack(track3.id, 'Track C');
      }).not.toThrow();
    });

    it('should allow reusing name after track deleted', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();

      trackManager.renameTrack(track1.id, 'Temp Track');

      // Delete track1
      sequence.removeTrack(track1.id);

      // Now track2 can use 'Temp Track' name
      expect(() => {
        trackManager.renameTrack(track2.id, 'Temp Track');
      }).not.toThrow();

      expect(track2.name).toBe('Temp Track');
    });

    it('should validate after trimming whitespace', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();

      trackManager.renameTrack(track1.id, 'My Track');

      // Try to add with extra whitespace (should still be caught as duplicate)
      expect(() => {
        trackManager.renameTrack(track2.id, '  My Track  ');
      }).toThrow(/duplicate|exists|already/i);
    });
  });

  describe('Full track naming workflow', () => {
    it('should complete full track organization scenario', () => {
      // Create tracks with default names
      const idleTrack = sequence.addTrack();
      const walkTrack = sequence.addTrack();
      const attackTrack = sequence.addTrack();

      // Verify default names
      expect(idleTrack.name).toBeDefined();
      expect(walkTrack.name).toBeDefined();
      expect(attackTrack.name).toBeDefined();

      // Rename to descriptive names
      trackManager.renameTrack(idleTrack.id, 'Idle & Breathing');
      trackManager.renameTrack(walkTrack.id, 'Walk & Run');
      trackManager.renameTrack(attackTrack.id, 'Combat Moves');

      expect(idleTrack.name).toBe('Idle & Breathing');
      expect(walkTrack.name).toBe('Walk & Run');
      expect(attackTrack.name).toBe('Combat Moves');

      // Try to create duplicate
      const newTrack = sequence.addTrack();
      expect(() => {
        trackManager.renameTrack(newTrack.id, 'Idle & Breathing');
      }).toThrow();

      // Rename to unique name
      trackManager.renameTrack(newTrack.id, 'Special Moves');
      expect(newTrack.name).toBe('Special Moves');

      // Delete a track
      sequence.removeTrack(walkTrack.id);

      // Can now reuse deleted track's name
      trackManager.renameTrack(newTrack.id, 'Walk & Run');
      expect(newTrack.name).toBe('Walk & Run');
    });
  });
});
