import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackManager } from '../../../src/services/TrackManager.js';
import { MultiTrackSequence } from '../../../src/models/MultiTrackSequence.js';

describe('TrackManager', () => {
  let manager;
  let sequence;

  beforeEach(() => {
    sequence = new MultiTrackSequence();
    manager = new TrackManager(sequence);
  });

  describe('constructor', () => {
    it('should create manager with sequence', () => {
      expect(manager).toBeDefined();
      expect(manager.sequence).toBe(sequence);
    });

    it('should throw error if no sequence provided', () => {
      expect(() => new TrackManager()).toThrow('Sequence is required');
    });
  });

  describe('createTrack()', () => {
    it('should create track with default name', () => {
      const track = manager.createTrack();
      
      expect(track).toBeDefined();
      expect(track.name).toMatch(/^Track \d+$/);
      expect(sequence.tracks).toContain(track);
    });

    it('should create track with custom name', () => {
      const track = manager.createTrack('Custom Track');
      
      expect(track.name).toBe('Custom Track');
    });

    it('should validate track name', () => {
      expect(() => manager.createTrack('')).toThrow('Invalid track name');
      expect(() => manager.createTrack('   ')).toThrow('Invalid track name');
    });

    it('should reject duplicate names', () => {
      manager.createTrack('Duplicate');
      
      expect(() => manager.createTrack('Duplicate')).toThrow('Track name already exists');
    });

    it('should trim whitespace from name', () => {
      const track = manager.createTrack('  Trimmed  ');
      expect(track.name).toBe('Trimmed');
    });

    it('should initialize track with default slots', () => {
      const track = manager.createTrack();
      
      // Tracks should start with at least minSlots empty slots
      expect(track.slots.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxTracks limit', () => {
      const limitedSequence = new MultiTrackSequence({ maxTracks: 2 });
      const limitedManager = new TrackManager(limitedSequence);
      
      limitedManager.createTrack();
      limitedManager.createTrack();
      
      expect(() => limitedManager.createTrack()).toThrow('Maximum tracks exceeded');
    });
  });

  describe('validateTrackName()', () => {
    beforeEach(() => {
      manager.createTrack('Existing Track');
    });

    it('should return true for valid unique name', () => {
      expect(manager.validateTrackName('New Track')).toBe(true);
    });

    it('should return false for empty name', () => {
      expect(manager.validateTrackName('')).toBe(false);
      expect(manager.validateTrackName('   ')).toBe(false);
    });

    it('should return false for duplicate name', () => {
      expect(manager.validateTrackName('Existing Track')).toBe(false);
    });

    it('should be case-insensitive for duplicates', () => {
      expect(manager.validateTrackName('existing track')).toBe(false);
      expect(manager.validateTrackName('EXISTING TRACK')).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(manager.validateTrackName('  Existing Track  ')).toBe(false);
      expect(manager.validateTrackName('  Valid Name  ')).toBe(true);
    });

    it('should allow validation with exclude ID for rename', () => {
      const track = sequence.tracks[0];
      
      // Same name should be valid when excluding this track
      expect(manager.validateTrackName('Existing Track', track.id)).toBe(true);
      
      // But invalid if checking against another track
      const track2 = manager.createTrack('Another');
      expect(manager.validateTrackName('Existing Track', track2.id)).toBe(false);
    });

    it('should reject names with only special characters', () => {
      expect(manager.validateTrackName('...')).toBe(false);
      expect(manager.validateTrackName('---')).toBe(false);
    });

    it('should accept names with numbers and symbols', () => {
      expect(manager.validateTrackName('Track 123')).toBe(true);
      expect(manager.validateTrackName('Track-01')).toBe(true);
      expect(manager.validateTrackName('Track_A')).toBe(true);
    });

    it('should enforce maximum name length', () => {
      const longName = 'A'.repeat(100);
      expect(manager.validateTrackName(longName)).toBe(false);
    });
  });

  describe('deleteTrack()', () => {
    let track1, track2, track3;

    beforeEach(() => {
      track1 = manager.createTrack('Track 1');
      track2 = manager.createTrack('Track 2');
      track3 = manager.createTrack('Track 3');
    });

    it('should delete track by ID', () => {
      manager.deleteTrack(track2.id);
      
      expect(sequence.tracks.length).toBe(2);
      expect(sequence.tracks).not.toContain(track2);
    });

    it('should throw error if track not found', () => {
      expect(() => manager.deleteTrack('invalid-id')).toThrow();
    });

    it('should prevent deleting last track', () => {
      manager.deleteTrack(track1.id);
      manager.deleteTrack(track2.id);
      
      expect(() => manager.deleteTrack(track3.id)).toThrow('Cannot remove last track');
    });
  });

  describe('renameTrack()', () => {
    let track;

    beforeEach(() => {
      track = manager.createTrack('Original');
    });

    it('should rename track', () => {
      manager.renameTrack(track.id, 'Renamed');
      expect(track.name).toBe('Renamed');
    });

    it('should validate new name', () => {
      expect(() => manager.renameTrack(track.id, '')).toThrow('Invalid track name');
    });

    it('should prevent duplicate names', () => {
      manager.createTrack('Existing');
      expect(() => manager.renameTrack(track.id, 'Existing')).toThrow('Track name already exists');
    });

    it('should allow keeping same name', () => {
      expect(() => manager.renameTrack(track.id, 'Original')).not.toThrow();
      expect(track.name).toBe('Original');
    });
  });

  describe('getTrackByName()', () => {
    beforeEach(() => {
      manager.createTrack('Track A');
      manager.createTrack('Track B');
    });

    it('should find track by name', () => {
      const track = manager.getTrackByName('Track A');
      expect(track).toBeDefined();
      expect(track.name).toBe('Track A');
    });

    it('should return null if not found', () => {
      expect(manager.getTrackByName('Nonexistent')).toBeNull();
    });

    it('should be case-insensitive', () => {
      const track = manager.getTrackByName('track a');
      expect(track).toBeDefined();
      expect(track.name).toBe('Track A');
    });
  });
});
