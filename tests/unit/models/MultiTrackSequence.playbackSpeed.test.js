/**
 * Unit Tests for MultiTrackSequence Playback Speed Control
 * 
 * Tests playback speed control functionality in MultiTrackSequence model.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiTrackSequence } from '../../../src/models/MultiTrackSequence.js';

describe('MultiTrackSequence - Playback Speed Control', () => {
    let sequence;

    beforeEach(() => {
        sequence = new MultiTrackSequence({ maxTracks: 5 });
    });

    describe('setPlaybackSpeed()', () => {
        it('should set playback speed in playback state', () => {
            sequence.setPlaybackSpeed(2.0);
            expect(sequence.getPlaybackSpeed()).toBe(2.0);
        });

        it('should update playback state', () => {
            sequence.setPlaybackSpeed(0.5);
            const state = sequence.playbackState;
            expect(state.playbackSpeed).toBe(0.5);
        });

        it('should emit playback-speed-change-requested event', () => {
            const listener = vi.fn();
            sequence.addEventListener('playback-speed-change-requested', listener);

            sequence.setPlaybackSpeed(1.5);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'playback-speed-change-requested',
                    detail: expect.objectContaining({ speed: 1.5 })
                })
            );
        });

        it('should throw error for negative speed', () => {
            expect(() => {
                sequence.setPlaybackSpeed(-1.0);
            }).toThrow('Playback speed must be a positive number');
        });

        it('should throw error for zero speed', () => {
            expect(() => {
                sequence.setPlaybackSpeed(0);
            }).toThrow('Playback speed must be a positive number');
        });

        it('should throw error for non-number speed', () => {
            expect(() => {
                sequence.setPlaybackSpeed('fast');
            }).toThrow('Playback speed must be a positive number');
        });

        it('should throw error for null speed', () => {
            expect(() => {
                sequence.setPlaybackSpeed(null);
            }).toThrow('Playback speed must be a positive number');
        });

        it('should throw error for undefined speed', () => {
            expect(() => {
                sequence.setPlaybackSpeed(undefined);
            }).toThrow('Playback speed must be a positive number');
        });

        it('should accept fractional speeds', () => {
            sequence.setPlaybackSpeed(0.25);
            expect(sequence.getPlaybackSpeed()).toBe(0.25);

            sequence.setPlaybackSpeed(0.75);
            expect(sequence.getPlaybackSpeed()).toBe(0.75);
        });

        it('should accept speeds greater than 1', () => {
            sequence.setPlaybackSpeed(3.0);
            expect(sequence.getPlaybackSpeed()).toBe(3.0);

            sequence.setPlaybackSpeed(10.0);
            expect(sequence.getPlaybackSpeed()).toBe(10.0);
        });

        it('should include timestamp in event detail', () => {
            const listener = vi.fn();
            sequence.addEventListener('playback-speed-change-requested', listener);

            const beforeTime = performance.now();
            sequence.setPlaybackSpeed(2.0);
            const afterTime = performance.now();

            expect(listener).toHaveBeenCalled();
            const eventDetail = listener.mock.calls[0][0].detail;
            expect(eventDetail.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(eventDetail.timestamp).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('getPlaybackSpeed()', () => {
        it('should return default speed of 1.0', () => {
            expect(sequence.getPlaybackSpeed()).toBe(1.0);
        });

        it('should return current playback speed', () => {
            sequence.setPlaybackSpeed(2.5);
            expect(sequence.getPlaybackSpeed()).toBe(2.5);
        });

        it('should reflect latest speed change', () => {
            sequence.setPlaybackSpeed(0.5);
            expect(sequence.getPlaybackSpeed()).toBe(0.5);

            sequence.setPlaybackSpeed(2.0);
            expect(sequence.getPlaybackSpeed()).toBe(2.0);

            sequence.setPlaybackSpeed(1.0);
            expect(sequence.getPlaybackSpeed()).toBe(1.0);
        });
    });

    describe('Integration with playback state', () => {
        it('should initialize with default playback speed', () => {
            const state = sequence.playbackState;
            expect(state.playbackSpeed).toBe(1.0);
        });

        it('should maintain playback speed in state', () => {
            sequence.setPlaybackSpeed(1.5);
            const state = sequence.playbackState;
            expect(state.playbackSpeed).toBe(1.5);
        });

        it('should not affect other playback state properties', () => {
            const initialState = sequence.playbackState;

            sequence.setPlaybackSpeed(2.0);

            const newState = sequence.playbackState;
            expect(newState.isPlaying).toBe(initialState.isPlaying);
            expect(newState.isPaused).toBe(initialState.isPaused);
            expect(newState.currentTime).toBe(initialState.currentTime);
            expect(newState.loopMode).toBe(initialState.loopMode);
        });
    });

    describe('Event emission', () => {
        it('should emit event for each speed change', () => {
            const listener = vi.fn();
            sequence.addEventListener('playback-speed-change-requested', listener);

            sequence.setPlaybackSpeed(0.5);
            sequence.setPlaybackSpeed(1.0);
            sequence.setPlaybackSpeed(2.0);

            expect(listener).toHaveBeenCalledTimes(3);
        });

        it('should emit event even when setting same speed', () => {
            const listener = vi.fn();
            sequence.addEventListener('playback-speed-change-requested', listener);

            sequence.setPlaybackSpeed(1.5);
            sequence.setPlaybackSpeed(1.5);

            expect(listener).toHaveBeenCalledTimes(2);
        });

        it('should allow multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            sequence.addEventListener('playback-speed-change-requested', listener1);
            sequence.addEventListener('playback-speed-change-requested', listener2);

            sequence.setPlaybackSpeed(2.0);

            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });
    });
});
