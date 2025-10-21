# Data Model: Multi-Track Animation Grid System

**Feature**: 001-multi-track-animation-grid  
**Date**: October 17, 2025

## Overview

This document defines the data entities, their relationships, and validation rules for the multi-track animation system.

## Entity Diagrams

```
┌─────────────────────────┐
│  MultiTrackSequence     │
│─────────────────────────│
│ - tracks: Track[]       │
│ - playbackState: Object │
│ - isPlaying: boolean    │
│ - currentTime: number   │
└───────┬─────────────────┘
        │ 1:N
        │
        ▼
┌─────────────────────────┐
│  AnimationTrack         │
│─────────────────────────│
│ - id: string            │
│ - name: string          │
│ - slots: Slot[]         │
│ - currentSlotIndex: int │
│ - isActive: boolean     │
└───────┬─────────────────┘
        │ 1:N
        │
        ▼
┌─────────────────────────┐
│  AnimationSlot          │
│─────────────────────────│
│ - index: number         │
│ - animation: string|null│
│ - isPlaying: boolean    │
│ - isEmpty: boolean      │
└─────────────────────────┘
```

## Entities

### 1. MultiTrackSequence

**Purpose**: Root container managing all tracks and global playback state

**Properties**:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `tracks` | `AnimationTrack[]` | Yes | `[]` | Ordered array of animation tracks |
| `playbackState` | `PlaybackState` | Yes | See below | Current playback state object |
| `maxTracks` | `number` | No | `10` | Maximum allowed tracks (configurable) |
| `slotDuration` | `number` | Yes | Auto-calculated | Duration per slot in milliseconds (based on animation durations) |

**PlaybackState Object**:
```javascript
{
  isPlaying: boolean,        // Currently playing
  currentSlotIndex: number,  // Global slot position (0-based)
  startTime: number,         // performance.now() when playback started
  loopMode: 'continuous'     // Always continuous for multi-track
}
```

**Methods**:
- `addTrack(name?: string): AnimationTrack` - Create and add new track
- `removeTrack(trackId: string): void` - Remove track by ID
- `getTrack(trackId: string): AnimationTrack | null` - Find track by ID
- `play(): void` - Start synchronized playback
- `stop(): void` - Stop and reset all tracks
- `clear(): void` - Remove all tracks

**Validation Rules**:
- ✅ Cannot add track if `tracks.length >= maxTracks`
- ✅ Cannot remove track if `tracks.length === 1` (must have at least one track for single-track fallback)
- ✅ `slotDuration` must be > 0

**Events Emitted**:
- `track-added` - When track is created
- `track-removed` - When track is deleted
- `playback-started` - When play() called
- `playback-stopped` - When stop() called
- `slot-changed` - When global slot index advances

---

### 2. AnimationTrack

**Purpose**: Represents a single horizontal track containing animation slots

**Properties**:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | `string` | Yes | UUID v4 | Unique identifier |
| `name` | `string` | Yes | `"Track N"` | Display name (user-editable) |
| `slots` | `AnimationSlot[]` | Yes | `[]` | Ordered slots in this track |
| `currentSlotIndex` | `number` | Yes | `0` | Currently playing slot (0-based) |
| `isActive` | `boolean` | Yes | `true` | Track is enabled for playback |
| `minSlots` | `number` | No | `8` | Minimum slots to display |
| `maxSlots` | `number` | No | `20` | Maximum allowed slots |

**Methods**:
- `addSlot(animation?: string, index?: number): AnimationSlot` - Add slot at position
- `removeSlot(index: number): void` - Remove slot and shift remaining
- `moveSlot(fromIndex: number, toIndex: number): void` - Reorder slots
- `setAnimation(slotIndex: number, animationName: string | null): void` - Set/clear animation
- `getSlot(index: number): AnimationSlot | null` - Get slot by index
- `setCurrentSlot(index: number): void` - Update playback position
- `rename(newName: string): void` - Change track name

**Validation Rules**:
- ✅ `name` cannot be empty string
- ✅ `name` must be unique within MultiTrackSequence
- ✅ `slotIndex` must be valid (0 to slots.length - 1)
- ✅ Cannot remove slot if `slots.length === 1` (must maintain at least one slot)
- ✅ `slots.length` cannot exceed `maxSlots`

**Events Emitted**:
- `slot-added` - When slot created
- `slot-removed` - When slot deleted
- `slot-moved` - When slot reordered
- `animation-changed` - When slot animation set/cleared
- `track-renamed` - When name updated
- `playback-position-changed` - When currentSlotIndex updates

---

### 3. AnimationSlot

**Purpose**: Individual container for a single animation reference or empty state

**Properties**:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `index` | `number` | Yes | Auto-assigned | Position in track (0-based) |
| `animation` | `string \| null` | Yes | `null` | Animation name reference (null = empty) |
| `isPlaying` | `boolean` | Yes | `false` | Currently playing in viewer |
| `duration` | `number` | No | Auto | Animation duration in ms (from Spine data) |

**Computed Properties**:
- `isEmpty: boolean` - Returns `animation === null`

**Methods**:
- `setAnimation(name: string | null): void` - Assign/clear animation
- `play(viewer: SpineViewer): void` - Trigger playback in viewer
- `stop(): void` - Stop playback

**Validation Rules**:
- ✅ `animation` must be valid animation name from loaded Spine data (or null)
- ✅ Cannot play() if `isEmpty === true`
- ✅ `index` cannot be negative

**Events Emitted**:
- `animation-set` - When animation assigned
- `animation-cleared` - When animation set to null
- `playback-started` - When play() called
- `playback-stopped` - When stop() called

---

## Relationships

```
MultiTrackSequence (1) ──┬──> (N) AnimationTrack
                         │
                         └──> PlaybackState (1)

AnimationTrack (1) ──> (N) AnimationSlot
```

**Cascade Rules**:
- Deleting `MultiTrackSequence` → deletes all `AnimationTrack` instances
- Deleting `AnimationTrack` → deletes all `AnimationSlot` instances
- Deleting `AnimationSlot` → no cascades (leaf entity)

---

## State Transitions

### MultiTrackSequence States

```
┌─────────┐   play()    ┌─────────┐
│  Idle   │────────────>│ Playing │
│         │<────────────│         │
└─────────┘   stop()    └─────────┘
     │                       │
     │ clear()              │ clear()
     ▼                       ▼
┌─────────┐             ┌─────────┐
│  Empty  │             │  Empty  │
└─────────┘             └─────────┘
```

**State Definitions**:
- **Empty**: `tracks.length === 0` (invalid state, must have >= 1 track)
- **Idle**: `isPlaying === false`, tracks exist with animations
- **Playing**: `isPlaying === true`, playback in progress

### AnimationSlot States

```
┌─────────┐  setAnimation()  ┌────────────┐
│  Empty  │─────────────────>│  Occupied  │
│         │<─────────────────│            │
└─────────┘  clear()         └────────────┘
     │                             │
     │                             │ play()
     │                             ▼
     │                       ┌────────────┐
     │                       │  Playing   │
     │                       └────────────┘
     │                             │ stop()
     │                             ▼
     └──────────────────────>┌────────────┐
                             │  Occupied  │
                             └────────────┘
```

---

## Data Persistence

**Storage Strategy**: In-memory only (no persistence)

**Rationale**:
- Feature is session-based (animation review tool)
- No requirement for saving track configurations
- Spine files are loaded per session
- Future enhancement: localStorage for track layouts

**If persistence added later**:
```javascript
// Serialization format (JSON)
{
  "version": "1.0",
  "tracks": [
    {
      "id": "uuid-1",
      "name": "Body Movement",
      "slots": [
        { "index": 0, "animation": "walk" },
        { "index": 1, "animation": "run" },
        { "index": 2, "animation": null }
      ]
    }
  ]
}
```

---

## Performance Considerations

### Memory Footprint

**Estimated per entity**:
- `MultiTrackSequence`: ~200 bytes (base object + arrays)
- `AnimationTrack`: ~100 bytes + (slots.length × 50 bytes)
- `AnimationSlot`: ~50 bytes

**Example**: 10 tracks × 20 slots
- Slots: 200 × 50 bytes = 10 KB
- Tracks: 10 × 100 bytes = 1 KB
- Sequence: 200 bytes
- **Total**: ~11.2 KB (negligible)

### Optimization Strategies

1. **Lazy Slot Creation**: Create slot objects only when needed (not all 20 upfront)
2. **Object Pooling**: Reuse slot objects instead of creating/destroying
3. **Frozen Objects**: Use `Object.freeze()` for immutable properties (better V8 optimization)
4. **WeakMap for Metadata**: Store transient UI state separately from core data

---

## Validation Summary

All entities include:
- ✅ Type validation (via JSDoc + runtime checks)
- ✅ Boundary validation (min/max constraints)
- ✅ Relationship validation (foreign key existence)
- ✅ State transition validation (only valid state changes)
- ✅ Event emission for all mutations (enables UI reactivity)

---

## Example Usage

```javascript
// Create sequence
const sequence = new MultiTrackSequence();

// Add tracks
const track1 = sequence.addTrack("Body Movement");
const track2 = sequence.addTrack("Facial Expressions");

// Add slots and animations
track1.addSlot("walk");
track1.addSlot("run");
track1.addSlot(null); // Empty slot

track2.addSlot("smile");
track2.addSlot("blink");

// Start playback
sequence.play();

// Listen for events
sequence.addEventListener('slot-changed', (e) => {
  console.log('Now playing slot:', e.detail.slotIndex);
});
```

---

## Next Steps

1. Implement entities in `src/models/`
2. Add unit tests for each entity
3. Define API contracts in `contracts/multi-track-api.md`
