# Research: Multi-Track Animation Grid System

**Feature**: 001-multi-track-animation-grid  
**Date**: October 17, 2025  
**Status**: Complete

## Purpose

Research technical decisions and best practices for implementing a multi-track animation system with grid-based slots and synchronized playback in a browser-based Spine animation viewer.

## Research Tasks

### 1. Testing Framework Selection

**Decision**: Use Vitest for unit and integration testing

**Rationale**:
- **Zero-config ESM support**: Works natively with ES6 modules without transpilation, matching project's no-build philosophy
- **Fast execution**: Vite-powered, ideal for rapid TDD workflow
- **Browser-compatible APIs**: Uses same test syntax as Jest but optimized for modern ESM
- **Lightweight**: No heavy dependencies, aligns with minimal-dependency approach
- **DOM testing support**: Works with jsdom or happy-dom for testing DOM manipulation

**Alternatives Considered**:
- **Jest**: Requires additional configuration for ESM, heavier setup, slower in ESM mode
- **Mocha + Chai**: More configuration needed, less modern tooling
- **No testing**: Rejected - need verification for complex multi-track synchronization logic

**Implementation Note**: Can use `vitest --ui` for visual test runner, `--coverage` for code coverage reporting

---

### 2. State Management Pattern

**Decision**: Use plain JavaScript objects with event-driven updates (custom EventTarget pattern)

**Rationale**:
- **No new dependencies**: Keeps project dependency-free
- **Browser-native**: EventTarget API is standard across all modern browsers
- **Lightweight**: Minimal overhead compared to state management libraries
- **Sufficient complexity**: Multi-track state is manageable without Redux/MobX complexity
- **Performance**: Direct object manipulation is fastest for real-time animation updates

**Alternatives Considered**:
- **Redux/Zustand**: Overkill for this scope, adds dependency, unnecessary complexity
- **Reactive frameworks (Vue/React)**: Would require rewriting entire component, not incremental
- **Observables (RxJS)**: Too heavy for simple state updates

**Pattern**:
```javascript
class MultiTrackSequence extends EventTarget {
  constructor() {
    super();
    this.tracks = [];
    this.playbackState = { isPlaying: false, currentSlotIndex: 0 };
  }
  
  addTrack(track) {
    this.tracks.push(track);
    this.dispatchEvent(new CustomEvent('track-added', { detail: track }));
  }
}
```

---

### 3. Drag-and-Drop Implementation

**Decision**: Use native HTML5 Drag and Drop API with custom data transfer

**Rationale**:
- **Already in use**: Project already uses drag-and-drop for file uploads (see `index.html`)
- **No dependencies**: Built into browsers
- **Consistent UX**: Matches existing file drag-and-drop behavior
- **Accessibility**: Screen reader support via ARIA attributes
- **Touch support**: Modern browsers support touch events with polyfill fallback if needed

**Alternatives Considered**:
- **Library (interact.js, Sortable.js)**: Adds dependency, unnecessary for simple slot reordering
- **Custom pointer events**: More code to maintain, reinventing the wheel

**Implementation Pattern** (from existing code):
```javascript
// Existing pattern in index.html
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const data = e.dataTransfer.getData('text/plain');
  // Handle drop
});
```

---

### 4. Slot Synchronization Timing

**Decision**: Use `requestAnimationFrame` with timestamp-based synchronization

**Rationale**:
- **Frame-perfect timing**: Aligns with browser's 60fps render cycle
- **No drift**: Timestamp-based progression prevents cumulative timing errors
- **Existing pattern**: PIXI.js ticker already uses RAF, keeps consistency
- **Performance**: Most efficient way to schedule visual updates

**Alternatives Considered**:
- **setTimeout/setInterval**: Unreliable timing, can drift over time, not frame-synchronized
- **PIXI.Ticker only**: Would require all timing logic inside PIXI, less flexible
- **Web Animations API**: Overkill for simple slot transitions, more complex API

**Synchronization Algorithm**:
```javascript
class PlaybackController {
  start() {
    this.startTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.tick.bind(this));
  }
  
  tick(timestamp) {
    const elapsed = timestamp - this.startTime;
    const slotIndex = Math.floor(elapsed / this.slotDuration);
    
    this.tracks.forEach(track => {
      track.setCurrentSlot(slotIndex);
    });
    
    if (this.isPlaying) {
      this.animationFrame = requestAnimationFrame(this.tick.bind(this));
    }
  }
}
```

---

### 5. Empty Slot Handling Strategy

**Decision**: Null object pattern with "idle" animation state

**Rationale**:
- **No special cases**: Empty slots behave like normal slots, just with null animation reference
- **Consistent API**: Playback controller doesn't need conditional logic
- **Visual feedback**: Can display placeholder or maintain last frame
- **Memory efficient**: No need to create dummy animation objects

**Alternatives Considered**:
- **Skip empty slots**: Causes timing desynchronization between tracks
- **Pause on empty**: Interrupts playback flow, bad UX
- **Auto-fill with default**: Unexpected behavior, user didn't request it

**Implementation**:
```javascript
class AnimationSlot {
  constructor(index) {
    this.index = index;
    this.animation = null; // null = empty slot
  }
  
  isEmpty() {
    return this.animation === null;
  }
  
  play(viewer) {
    if (this.isEmpty()) {
      // Hold current pose or show empty state
      return;
    }
    viewer.setAnimation(this.animation.name);
  }
}
```

---

### 6. Track Length Mismatch Resolution

**Decision**: Independent looping per track (shortest track loops, others continue)

**Rationale**:
- **Flexible composition**: Allows layering short/long animations (e.g., breathing loop + walk cycle)
- **No forced synchronization**: Users control track lengths independently
- **Predictable behavior**: Each track loops at its natural boundary
- **Professional tools precedent**: Similar to Adobe After Effects, Blender NLA

**Alternatives Considered**:
- **Pad to longest**: Wastes slots, unclear UX for what to pad with
- **Stop all when shortest ends**: Limits flexibility, forces equal lengths
- **One-shot (no loop)**: Doesn't match existing single-track looping behavior

**Example**:
```
Track 1: [A, B, C] → loops after C
Track 2: [X, Y, Z, W, Q] → loops after Q
Playback: A+X, B+Y, C+Z, A+W, B+Q, C+X (Track 1 loops), A+Y (Track 2 loops), ...
```

---

### 7. UI Layout Pattern

**Decision**: CSS Grid for track layout, Flexbox for slots within tracks

**Rationale**:
- **Already in use**: Project uses CSS Grid for demo cards (see `index.html` `.demo-grid`)
- **Responsive**: Grid auto-flows tracks vertically, flexbox handles horizontal slots
- **No JavaScript layout**: Pure CSS, better performance
- **Accessibility**: Proper semantic structure, screen reader friendly

**Alternatives Considered**:
- **Absolute positioning**: Brittle, hard to maintain, bad for responsive
- **Table layout**: Semantic mismatch, less flexible
- **Canvas rendering**: Overkill, loses DOM benefits (accessibility, CSS styling)

**Structure**:
```css
.multi-track-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.track {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.slot {
  flex: 0 0 120px; /* Fixed width slots */
  min-height: 80px;
}
```

---

### 8. Performance Optimization Strategy

**Decision**: Virtual scrolling for slots + track windowing (render only visible)

**Rationale**:
- **Scale gracefully**: 10 tracks × 20 slots = 200 DOM nodes, manageable without virtualization initially
- **Deferred optimization**: Implement only if performance issues arise (YAGNI)
- **Simple first**: Render all slots, optimize later if needed
- **Measurement-driven**: Use browser DevTools to identify actual bottlenecks

**Monitoring Plan**:
- Track frame times with `performance.mark/measure`
- Alert if frame time > 16ms (60fps budget)
- If >200 total slots: implement virtual scrolling
- If >10 simultaneous animations: investigate PIXI.js resource pooling

**Alternatives Considered**:
- **Immediate virtualization**: Premature optimization, adds complexity
- **Canvas rendering**: Loses DOM benefits, harder to debug
- **Web Workers**: Overkill for client-side animation control

---

## Best Practices Applied

### JavaScript ES6+ Module Pattern
- **Export/Import**: Use named exports for models/services, default for main classes
- **Tree-shaking friendly**: Avoid side effects in module scope
- **Example**: `export class AnimationTrack { }` vs `export default class { }`

### Event Naming Convention
- **Pattern**: `entity-action` (kebab-case)
- **Examples**: `track-added`, `slot-changed`, `playback-started`
- **Rationale**: Consistent with DOM event naming, easy to grep

### Error Handling
- **Validation**: Throw early on invalid operations (e.g., adding animation to non-existent track)
- **User feedback**: Use existing message system (`utils/messages.js`)
- **Graceful degradation**: If multi-track fails, fall back to single-track mode

### Accessibility
- **ARIA labels**: Add `aria-label` to tracks/slots for screen readers
- **Keyboard nav**: Support arrow keys for slot navigation
- **Focus management**: Visible focus indicators for drag-drop

---

## Technology Stack Summary

| Category | Technology | Justification |
|----------|-----------|---------------|
| Testing | Vitest | ESM-native, fast, zero-config |
| State Management | EventTarget pattern | Browser-native, no dependencies |
| Drag-Drop | HTML5 DnD API | Already in use, standards-based |
| Timing | requestAnimationFrame | Frame-perfect, no drift |
| Layout | CSS Grid + Flexbox | Already in use, responsive |
| Performance | Measurement-first | Optimize when data shows need |

---

## Open Questions

None. All NEEDS CLARIFICATION items from Technical Context have been resolved:
- ✅ Testing framework: Vitest selected
- ✅ State management: EventTarget pattern
- ✅ Synchronization: RAF + timestamps
- ✅ Empty slot handling: Null object pattern
- ✅ Track length mismatch: Independent looping

---

## Next Steps

Proceed to **Phase 1: Design & Contracts**
- Create `data-model.md` with entity schemas
- Define API contracts in `contracts/multi-track-api.md`
- Write `quickstart.md` for developer onboarding
