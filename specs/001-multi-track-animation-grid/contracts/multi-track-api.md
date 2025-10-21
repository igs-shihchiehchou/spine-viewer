# API Contracts: Multi-Track Animation Grid System

**Feature**: 001-multi-track-animation-grid  
**Date**: October 17, 2025  
**Version**: 1.0

## Overview

This document defines the public API contracts for the multi-track animation system. All interfaces are JavaScript/TypeScript compatible.

## SpineViewer Extension API

### New Public Methods

The `SpineViewer` custom element gains the following methods:

#### `enableMultiTrack(options?: MultiTrackOptions): MultiTrackSequence`

Enables multi-track mode and returns the sequence controller.

**Parameters**:
```typescript
interface MultiTrackOptions {
  maxTracks?: number;      // Default: 10
  minSlots?: number;       // Default: 8
  maxSlots?: number;       // Default: 20
  autoLoop?: boolean;      // Default: true
}
```

**Returns**: `MultiTrackSequence` instance

**Example**:
```javascript
const viewer = document.getElementById('spineViewer');
const sequence = viewer.enableMultiTrack({ maxTracks: 5 });
```

---

#### `disableMultiTrack(): void`

Disables multi-track mode and reverts to single-track sequence.

**Example**:
```javascript
viewer.disableMultiTrack();
```

---

#### `getMultiTrackSequence(): MultiTrackSequence | null`

Returns current multi-track sequence or null if disabled.

**Returns**: `MultiTrackSequence | null`

**Example**:
```javascript
const sequence = viewer.getMultiTrackSequence();
if (sequence) {
  console.log('Tracks:', sequence.tracks.length);
}
```

---

#### `isMultiTrackEnabled(): boolean`

Check if multi-track mode is active.

**Returns**: `boolean`

---

## MultiTrackSequence API

### Constructor

```javascript
new MultiTrackSequence(options?: {
  maxTracks?: number;
  slotDuration?: number;
})
```

### Properties

| Property | Type | Readonly | Description |
|----------|------|----------|-------------|
| `tracks` | `AnimationTrack[]` | Yes | Array of all tracks |
| `playbackState` | `PlaybackState` | Yes | Current playback state |
| `isPlaying` | `boolean` | Yes | Playback status |
| `currentSlotIndex` | `number` | Yes | Global slot position |
| `maxTracks` | `number` | No | Maximum allowed tracks |

### Methods

#### `addTrack(name?: string): AnimationTrack`

Creates and adds a new track.

**Parameters**:
- `name` (optional): Track name, defaults to "Track N"

**Returns**: New `AnimationTrack` instance

**Throws**: `Error` if maxTracks exceeded

**Events**: Emits `track-added`

**Example**:
```javascript
const track = sequence.addTrack("Character Body");
```

---

#### `removeTrack(trackId: string): void`

Removes track by ID.

**Parameters**:
- `trackId`: Track UUID

**Throws**: `Error` if track not found or last track

**Events**: Emits `track-removed`

---

#### `getTrack(trackId: string): AnimationTrack | null`

Finds track by ID.

**Returns**: Track or null

---

#### `play(): void`

Starts synchronized playback across all tracks.

**Throws**: `Error` if no tracks exist

**Events**: Emits `playback-started`

**Example**:
```javascript
sequence.play();
```

---

#### `stop(): void`

Stops playback and resets to slot 0.

**Events**: Emits `playback-stopped`

---

#### `pause(): void`

Pauses playback without resetting position.

**Events**: Emits `playback-paused`

---

#### `clear(): void`

Removes all tracks (resets to empty state).

**Events**: Emits `sequence-cleared`

---

### Events

All events are `CustomEvent` instances dispatched from `MultiTrackSequence` (extends `EventTarget`).

| Event Name | Detail Payload | When Fired |
|------------|----------------|------------|
| `track-added` | `{ track: AnimationTrack }` | Track created |
| `track-removed` | `{ trackId: string }` | Track deleted |
| `playback-started` | `{ startTime: number }` | play() called |
| `playback-stopped` | `{ currentSlotIndex: number }` | stop() called |
| `playback-paused` | `{ currentSlotIndex: number }` | pause() called |
| `slot-changed` | `{ slotIndex: number, tracks: object }` | Global slot advances |
| `sequence-cleared` | `{}` | clear() called |

**Example**:
```javascript
sequence.addEventListener('slot-changed', (e) => {
  console.log('Now at slot:', e.detail.slotIndex);
});
```

---

## AnimationTrack API

### Constructor

```javascript
new AnimationTrack(options: {
  name: string;
  minSlots?: number;
  maxSlots?: number;
})
```

### Properties

| Property | Type | Readonly | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique UUID |
| `name` | `string` | No | Display name (editable) |
| `slots` | `AnimationSlot[]` | Yes | Array of slots |
| `currentSlotIndex` | `number` | Yes | Current playback position |
| `isActive` | `boolean` | No | Enabled for playback |

### Methods

#### `addSlot(animation?: string | null, index?: number): AnimationSlot`

Adds slot at position (defaults to end).

**Parameters**:
- `animation` (optional): Animation name or null for empty
- `index` (optional): Insert position, defaults to slots.length

**Returns**: New `AnimationSlot` instance

**Throws**: `Error` if maxSlots exceeded or invalid animation name

**Events**: Emits `slot-added`

---

#### `removeSlot(index: number): void`

Removes slot and shifts remaining left.

**Throws**: `Error` if index invalid or last slot

**Events**: Emits `slot-removed`

---

#### `moveSlot(fromIndex: number, toIndex: number): void`

Reorders slot within track.

**Throws**: `Error` if indices invalid

**Events**: Emits `slot-moved`

---

#### `setAnimation(slotIndex: number, animationName: string | null): void`

Sets/clears animation for slot.

**Throws**: `Error` if index invalid or animation name not found

**Events**: Emits `animation-changed`

---

#### `getSlot(index: number): AnimationSlot | null`

Gets slot by index.

---

#### `rename(newName: string): void`

Changes track name.

**Throws**: `Error` if name empty or duplicate

**Events**: Emits `track-renamed`

---

### Events

| Event Name | Detail Payload | When Fired |
|------------|----------------|------------|
| `slot-added` | `{ slot: AnimationSlot, index: number }` | Slot created |
| `slot-removed` | `{ index: number }` | Slot deleted |
| `slot-moved` | `{ fromIndex: number, toIndex: number }` | Slot reordered |
| `animation-changed` | `{ slotIndex: number, animation: string\|null }` | Animation set/cleared |
| `track-renamed` | `{ oldName: string, newName: string }` | Name updated |
| `playback-position-changed` | `{ slotIndex: number }` | currentSlotIndex changed |

---

## AnimationSlot API

### Constructor

```javascript
new AnimationSlot(index: number, animation?: string | null)
```

### Properties

| Property | Type | Readonly | Description |
|----------|------|----------|-------------|
| `index` | `number` | Yes | Position in track |
| `animation` | `string \| null` | No | Animation name or null |
| `isPlaying` | `boolean` | Yes | Currently playing |
| `isEmpty` | `boolean` | Yes | Computed: animation === null |
| `duration` | `number` | Yes | Animation duration (ms) |

### Methods

#### `setAnimation(name: string | null): void`

Assigns/clears animation.

**Events**: Emits `animation-set` or `animation-cleared`

---

#### `play(viewer: SpineViewer): Promise<void>`

Plays animation in viewer (async to wait for completion).

**Returns**: Promise resolving when animation completes

**Throws**: `Error` if isEmpty is true

**Events**: Emits `playback-started`

---

#### `stop(): void`

Stops playback.

**Events**: Emits `playback-stopped`

---

### Events

| Event Name | Detail Payload | When Fired |
|------------|----------------|------------|
| `animation-set` | `{ animation: string }` | Animation assigned |
| `animation-cleared` | `{}` | Animation set to null |
| `playback-started` | `{ animation: string }` | play() called |
| `playback-stopped` | `{}` | stop() called |

---

## UI Component API (multi-track-ui.js)

### `initMultiTrackUI(viewerId: string, sequence: MultiTrackSequence): void`

Initializes multi-track UI for a viewer.

**Parameters**:
- `viewerId`: ID of spine-viewer element
- `sequence`: MultiTrackSequence instance

**Example**:
```javascript
import { initMultiTrackUI } from './src/ui/multi-track-ui.js';

const viewer = document.getElementById('spineViewer');
const sequence = viewer.enableMultiTrack();
initMultiTrackUI('spineViewer', sequence);
```

---

### `destroyMultiTrackUI(viewerId: string): void`

Cleans up multi-track UI and event listeners.

---

### `renderTrack(track: AnimationTrack, container: HTMLElement): void`

Renders a single track into container.

---

### `renderSlot(slot: AnimationSlot, container: HTMLElement): void`

Renders a single slot into container.

---

## PlaybackController API (services/PlaybackController.js)

### Constructor

```javascript
new PlaybackController(sequence: MultiTrackSequence, viewer: SpineViewer)
```

### Methods

#### `start(): void`

Begins synchronized playback.

---

#### `stop(): void`

Stops and resets playback.

---

#### `pause(): void`

Pauses playback at current position.

---

#### `resume(): void`

Resumes from paused position.

---

#### `tick(timestamp: DOMHighResTimeStamp): void`

Frame callback (internal, called by RAF).

---

## TrackManager API (services/TrackManager.js)

### `createTrack(sequence: MultiTrackSequence, name?: string): AnimationTrack`

Factory for creating tracks.

---

### `duplicateTrack(track: AnimationTrack): AnimationTrack`

Creates copy of track with same slots.

---

### `validateTrackName(name: string, sequence: MultiTrackSequence): boolean`

Checks if name is valid and unique.

---

## Error Handling

All APIs follow consistent error handling:

### Error Types

```javascript
class MultiTrackError extends Error {
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'MultiTrackError';
  }
}
```

### Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| `MAX_TRACKS_EXCEEDED` | Too many tracks | Adding track when at maxTracks |
| `TRACK_NOT_FOUND` | Invalid track ID | Removing non-existent track |
| `INVALID_SLOT_INDEX` | Index out of bounds | Accessing slot[99] when only 10 exist |
| `INVALID_ANIMATION` | Animation name not found | Setting animation "xyz" that doesn't exist |
| `EMPTY_SLOT_PLAYBACK` | Cannot play empty slot | Calling play() on slot with animation=null |
| `DUPLICATE_TRACK_NAME` | Name already exists | Renaming to existing track name |
| `LAST_TRACK_REMOVAL` | Must keep ≥1 track | Removing only remaining track |

**Example**:
```javascript
try {
  sequence.addTrack("Duplicate");
} catch (error) {
  if (error.code === 'DUPLICATE_TRACK_NAME') {
    console.error('Track name already exists');
  }
}
```

---

## Backward Compatibility

### Single-Track Fallback

When multi-track is disabled, all existing single-track APIs continue to work:

```javascript
// Still works in single-track mode
viewer.setAnimation('walk');
viewer.getCurrentAnimation();
viewer.getAnimations();
```

### Feature Detection

```javascript
if (viewer.isMultiTrackEnabled()) {
  // Use multi-track API
} else {
  // Use single-track API
}
```

---

## TypeScript Definitions

Full TypeScript declarations available in `src/types/multi-track.d.ts` (to be created).

**Example**:
```typescript
interface MultiTrackSequence extends EventTarget {
  readonly tracks: AnimationTrack[];
  readonly isPlaying: boolean;
  addTrack(name?: string): AnimationTrack;
  play(): void;
  stop(): void;
}
```

---

## Versioning

**API Version**: 1.0.0

**Compatibility Promise**:
- Minor version updates (1.x.0): Backward compatible additions
- Patch updates (1.0.x): Bug fixes only
- Major updates (2.0.0): May introduce breaking changes

---

## Testing Contracts

All public APIs must have:
1. ✅ Unit tests covering success cases
2. ✅ Unit tests covering error cases
3. ✅ Integration tests for cross-component interactions
4. ✅ Example usage in documentation

See `tests/` directory for test implementation.
