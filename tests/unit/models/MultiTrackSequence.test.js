import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiTrackSequence } from '../../../src/models/MultiTrackSequence.js';
import { AnimationTrack } from '../../../src/models/AnimationTrack.js';

describe('MultiTrackSequence', () => {
  describe('constructor', () => {
    it('should create sequence with default values', () => {
      const sequence = new MultiTrackSequence();
      
      expect(sequence.tracks).toEqual([]);
      expect(sequence.isPlaying).toBe(false);
      expect(sequence.currentSlotIndex).toBe(0);
      expect(sequence.maxTracks).toBe(10);
    });

    it('should create sequence with custom options', () => {
      const sequence = new MultiTrackSequence({ maxTracks: 5 });
      expect(sequence.maxTracks).toBe(5);
    });

    it('should be an instance of EventTarget', () => {
      const sequence = new MultiTrackSequence();
      expect(sequence).toBeInstanceOf(EventTarget);
    });

    it('should initialize playback state', () => {
      const sequence = new MultiTrackSequence();
      const state = sequence.playbackState;
      
      expect(state.isPlaying).toBe(false);
      expect(state.currentSlotIndex).toBe(0);
      expect(state.startTime).toBe(0);
      expect(state.loopMode).toBe('continuous');
    });
  });

  describe('addTrack()', () => {
    let sequence;

    beforeEach(() => {
      sequence = new MultiTrackSequence();
    });

    it('should add track with default name', () => {
      const track = sequence.addTrack();
      
      expect(sequence.tracks.length).toBe(1);
      expect(track).toBeInstanceOf(AnimationTrack);
      expect(track.name).toMatch(/^Track \d+$/);
    });

    it('should add track with custom name', () => {
      const track = sequence.addTrack('Body Movement');
      
      expect(track.name).toBe('Body Movement');
    });

    it('should emit track-added event', () => {
      const listener = vi.fn();
      sequence.addEventListener('track-added', listener);
      
      const track = sequence.addTrack('Test');
      
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail.track).toBe(track);
    });

    it('should throw error if maxTracks exceeded', () => {
      const sequence = new MultiTrackSequence({ maxTracks: 2 });
      sequence.addTrack();
      sequence.addTrack();
      
      expect(() => sequence.addTrack()).toThrow('Maximum tracks exceeded');
    });

    it('should add multiple tracks with unique IDs', () => {
      const track1 = sequence.addTrack();
      const track2 = sequence.addTrack();
      
      expect(track1.id).not.toBe(track2.id);
    });
  });

  describe('removeTrack()', () => {
    let sequence;
    let track1, track2, track3;

    beforeEach(() => {
      sequence = new MultiTrackSequence();
      track1 = sequence.addTrack('Track 1');
      track2 = sequence.addTrack('Track 2');
      track3 = sequence.addTrack('Track 3');
    });

    it('should remove track by ID', () => {
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

    it('should throw error if track not found', () => {
      expect(() => sequence.removeTrack('invalid-id')).toThrow('Track not found');
    });

    it('should throw error if removing last track', () => {
      const sequence = new MultiTrackSequence();
      const track = sequence.addTrack();
      
      expect(() => sequence.removeTrack(track.id)).toThrow('Cannot remove last track');
    });

    it('should stop playback when removing track', () => {
      sequence._playbackState.isPlaying = true; // Simulate playing
      sequence.removeTrack(track2.id);
      
      expect(sequence.isPlaying).toBe(false);
    });
  });

  describe('getTrack()', () => {
    let sequence;
    let track1, track2;

    beforeEach(() => {
      sequence = new MultiTrackSequence();
      track1 = sequence.addTrack('Track 1');
      track2 = sequence.addTrack('Track 2');
    });

    it('should return track by ID', () => {
      const found = sequence.getTrack(track2.id);
      expect(found).toBe(track2);
    });

    it('should return null for invalid ID', () => {
      expect(sequence.getTrack('invalid-id')).toBeNull();
    });
  });

  describe('clear()', () => {
    let sequence;

    beforeEach(() => {
      sequence = new MultiTrackSequence();
      sequence.addTrack('Track 1');
      sequence.addTrack('Track 2');
      sequence.addTrack('Track 3');
    });

    it('should remove all tracks', () => {
      sequence.clear();
      expect(sequence.tracks.length).toBe(0);
    });

    it('should stop playback', () => {
      sequence._playbackState.isPlaying = true; // Simulate playing
      sequence.clear();
      
      expect(sequence.isPlaying).toBe(false);
    });

    it('should reset playback state', () => {
      sequence._playbackState.currentSlotIndex = 5;
      sequence._playbackState.startTime = 12345;
      
      sequence.clear();
      
      expect(sequence.currentSlotIndex).toBe(0);
      expect(sequence.playbackState.startTime).toBe(0);
    });

    it('should emit tracks-cleared event', () => {
      const listener = vi.fn();
      sequence.addEventListener('tracks-cleared', listener);
      
      sequence.clear();
      
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('playbackState', () => {
    it('should return readonly playback state', () => {
      const sequence = new MultiTrackSequence();
      const state = sequence.playbackState;
      
      expect(state).toHaveProperty('isPlaying');
      expect(state).toHaveProperty('currentSlotIndex');
      expect(state).toHaveProperty('startTime');
      expect(state).toHaveProperty('loopMode');
    });

    it('should reflect current playing status', () => {
      const sequence = new MultiTrackSequence();
      expect(sequence.playbackState.isPlaying).toBe(false);
      
      sequence._playbackState.isPlaying = true;
      expect(sequence.playbackState.isPlaying).toBe(true);
    });
  });

  describe('isPlaying getter', () => {
    it('should return playback status', () => {
      const sequence = new MultiTrackSequence();
      expect(sequence.isPlaying).toBe(false);
      
      sequence._playbackState.isPlaying = true;
      expect(sequence.isPlaying).toBe(true);
    });
  });

  describe('currentSlotIndex getter', () => {
    it('should return current slot position', () => {
      const sequence = new MultiTrackSequence();
      expect(sequence.currentSlotIndex).toBe(0);
      
      sequence._playbackState.currentSlotIndex = 5;
      expect(sequence.currentSlotIndex).toBe(5);
    });
  });

  describe('maxTracks property', () => {
    it('should be configurable', () => {
      const sequence = new MultiTrackSequence({ maxTracks: 15 });
      expect(sequence.maxTracks).toBe(15);
      
      sequence.maxTracks = 20;
      expect(sequence.maxTracks).toBe(20);
    });
  });

  describe('T093-T095: Playback control methods', () => {
    describe('T093: play() method', () => {
      it('should emit play-requested event', () => {
        const sequence = new MultiTrackSequence();
        const track = sequence.addTrack();
        
        const listener = vi.fn();
        sequence.addEventListener('play-requested', listener);

        sequence.play();

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'play-requested',
            detail: expect.objectContaining({
              timestamp: expect.any(Number)
            })
          })
        );
      });

      it('should throw error if sequence is empty', () => {
        const sequence = new MultiTrackSequence();
        
        expect(() => {
          sequence.play();
        }).toThrow('Cannot play empty sequence');
      });

      it('should be callable multiple times', () => {
        const sequence = new MultiTrackSequence();
        const track = sequence.addTrack();
        
        expect(() => {
          sequence.play();
          sequence.play();
        }).not.toThrow();
      });
    });

    describe('T094: stop() method', () => {
      it('should emit stop-requested event', () => {
        const sequence = new MultiTrackSequence();
        
        const listener = vi.fn();
        sequence.addEventListener('stop-requested', listener);

        sequence.stop();

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'stop-requested',
            detail: expect.objectContaining({
              timestamp: expect.any(Number)
            })
          })
        );
      });

      it('should be callable when not playing', () => {
        const sequence = new MultiTrackSequence();
        
        expect(() => {
          sequence.stop();
        }).not.toThrow();
      });
    });

    describe('pause() method', () => {
      it('should emit pause-requested event', () => {
        const sequence = new MultiTrackSequence();
        const track = sequence.addTrack();
        sequence._playbackState.isPlaying = true;
        
        const listener = vi.fn();
        sequence.addEventListener('pause-requested', listener);

        sequence.pause();

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'pause-requested'
          })
        );
      });

      it('should throw error if not playing', () => {
        const sequence = new MultiTrackSequence();
        
        expect(() => {
          sequence.pause();
        }).toThrow('Cannot pause when not playing');
      });
    });

    describe('resume() method', () => {
      it('should emit resume-requested event', () => {
        const sequence = new MultiTrackSequence();
        sequence._playbackState.isPaused = true;
        
        const listener = vi.fn();
        sequence.addEventListener('resume-requested', listener);

        sequence.resume();

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'resume-requested'
          })
        );
      });

      it('should throw error if not paused', () => {
        const sequence = new MultiTrackSequence();
        
        expect(() => {
          sequence.resume();
        }).toThrow('Cannot resume when not paused');
      });
    });
  });
});
