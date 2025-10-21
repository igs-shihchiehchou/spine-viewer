# Quickstart: Multi-Track Animation Grid System

**Feature**: 001-multi-track-animation-grid  
**For**: Developers implementing the multi-track system  
**Date**: October 17, 2025

## Overview

This guide gets you started developing the multi-track animation feature. Follow these steps to set up your environment, understand the architecture, and begin implementation.

## Prerequisites

- ✅ Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- ✅ Basic knowledge of JavaScript ES6+ modules
- ✅ Familiarity with HTML5 Drag and Drop API
- ✅ Understanding of PIXI.js and Spine animations (helpful but not required)
- ✅ Node.js 18+ (for running Vitest tests)

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
# Install Vitest for testing
npm install -D vitest jsdom @vitest/ui

# Or use yarn
yarn add -D vitest jsdom @vitest/ui
```

### 2. Configure Vitest

Create `vitest.config.js` in project root:

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
```

### 3. Create Test Setup

Create `tests/setup.js`:

```javascript
import { beforeEach, afterEach } from 'vitest';

// Mock DOM elements needed for tests
beforeEach(() => {
  document.body.innerHTML = '<div id="test-container"></div>';
});

afterEach(() => {
  document.body.innerHTML = '';
});
```

### 4. Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Architecture Overview

### Component Hierarchy

```
┌─────────────────────────────────────┐
│  index.html (UI Layer)              │
│  - Multi-track UI markup            │
│  - Event handlers                   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  multi-track-ui.js (UI Controller)  │
│  - DOM rendering                    │
│  - Drag-drop handling               │
│  - Event bindings                   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Services Layer                     │
│  ├─ PlaybackController.js           │
│  └─ TrackManager.js                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Models Layer                       │
│  ├─ MultiTrackSequence.js           │
│  ├─ AnimationTrack.js               │
│  └─ AnimationSlot.js                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  spine-viewer.js (Web Component)    │
│  - PIXI.js integration              │
│  - Spine animation playback         │
└─────────────────────────────────────┘
```

### Data Flow

```
User Action (UI)
    ↓
Event Handler (multi-track-ui.js)
    ↓
Service Method (PlaybackController/TrackManager)
    ↓
Model Update (MultiTrackSequence/AnimationTrack)
    ↓
Event Emission (CustomEvent)
    ↓
UI Update (Listener in multi-track-ui.js)
    ↓
DOM Render
```

## Implementation Order (TDD)

Follow this order for test-driven development:

### Phase 1: Models (Week 1)

#### Day 1-2: AnimationSlot
1. ✅ Write failing tests for AnimationSlot
2. ✅ Implement AnimationSlot class
3. ✅ Pass all tests
4. ✅ Refactor

**Test File**: `tests/unit/models/AnimationSlot.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { AnimationSlot } from '../../../src/models/AnimationSlot.js';

describe('AnimationSlot', () => {
  it('should create empty slot by default', () => {
    const slot = new AnimationSlot(0);
    expect(slot.isEmpty).toBe(true);
    expect(slot.animation).toBeNull();
  });

  it('should set animation', () => {
    const slot = new AnimationSlot(0);
    slot.setAnimation('walk');
    expect(slot.isEmpty).toBe(false);
    expect(slot.animation).toBe('walk');
  });

  // Add more tests...
});
```

#### Day 3-4: AnimationTrack
1. ✅ Write failing tests for AnimationTrack
2. ✅ Implement AnimationTrack class
3. ✅ Pass all tests
4. ✅ Refactor

**Test File**: `tests/unit/models/AnimationTrack.test.js`

#### Day 5: MultiTrackSequence
1. ✅ Write failing tests for MultiTrackSequence
2. ✅ Implement MultiTrackSequence class
3. ✅ Pass all tests
4. ✅ Refactor

**Test File**: `tests/unit/models/MultiTrackSequence.test.js`

### Phase 2: Services (Week 2)

#### Day 1-2: TrackManager
**Test File**: `tests/unit/services/TrackManager.test.js`

#### Day 3-5: PlaybackController
**Test File**: `tests/unit/services/PlaybackController.test.js`

### Phase 3: UI & Integration (Week 3)

#### Day 1-3: multi-track-ui.js
**Test File**: `tests/unit/ui/multi-track-ui.test.js`

#### Day 4-5: Integration Tests
**Test File**: `tests/integration/multi-track-playback.test.js`

## Code Examples

### Example 1: Create Your First Test

```javascript
// tests/unit/models/AnimationSlot.test.js
import { describe, it, expect, vi } from 'vitest';
import { AnimationSlot } from '../../../src/models/AnimationSlot.js';

describe('AnimationSlot', () => {
  describe('constructor', () => {
    it('should initialize with index and null animation', () => {
      const slot = new AnimationSlot(5);
      
      expect(slot.index).toBe(5);
      expect(slot.animation).toBeNull();
      expect(slot.isEmpty).toBe(true);
      expect(slot.isPlaying).toBe(false);
    });
  });

  describe('setAnimation', () => {
    it('should update animation and emit event', () => {
      const slot = new AnimationSlot(0);
      const listener = vi.fn();
      
      slot.addEventListener('animation-set', listener);
      slot.setAnimation('walk');
      
      expect(slot.animation).toBe('walk');
      expect(slot.isEmpty).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should clear animation when set to null', () => {
      const slot = new AnimationSlot(0, 'run');
      const listener = vi.fn();
      
      slot.addEventListener('animation-cleared', listener);
      slot.setAnimation(null);
      
      expect(slot.animation).toBeNull();
      expect(slot.isEmpty).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Example 2: Implement AnimationSlot (Stub)

```javascript
// src/models/AnimationSlot.js
export class AnimationSlot extends EventTarget {
  constructor(index, animation = null) {
    super();
    this._index = index;
    this._animation = animation;
    this._isPlaying = false;
  }

  get index() {
    return this._index;
  }

  get animation() {
    return this._animation;
  }

  get isEmpty() {
    return this._animation === null;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  setAnimation(name) {
    const oldAnimation = this._animation;
    this._animation = name;

    if (name === null) {
      this.dispatchEvent(new CustomEvent('animation-cleared', {
        detail: { oldAnimation }
      }));
    } else {
      this.dispatchEvent(new CustomEvent('animation-set', {
        detail: { animation: name }
      }));
    }
  }

  async play(viewer) {
    if (this.isEmpty) {
      throw new Error('Cannot play empty slot');
    }

    this._isPlaying = true;
    this.dispatchEvent(new CustomEvent('playback-started', {
      detail: { animation: this._animation }
    }));

    // Integrate with SpineViewer
    viewer.setAnimation(this._animation, false);

    // Wait for animation completion
    return new Promise(resolve => {
      const listener = {
        complete: () => {
          this._isPlaying = false;
          viewer.spine.state.removeListener(listener);
          resolve();
        }
      };
      viewer.spine.state.addListener(listener);
    });
  }

  stop() {
    this._isPlaying = false;
    this.dispatchEvent(new CustomEvent('playback-stopped'));
  }
}
```

### Example 3: Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Development Workflow

### Daily Workflow

1. **Start with tests** (Red phase)
   ```bash
   npm test -- --watch
   ```

2. **Write failing test** for next feature
   
3. **Implement minimum code** to pass (Green phase)

4. **Refactor** while keeping tests green

5. **Commit** when feature is complete and tested
   ```bash
   git add .
   git commit -m "feat: implement AnimationSlot.setAnimation()"
   ```

### Git Commit Convention

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `test:` - Adding tests
- `refactor:` - Code restructuring
- `docs:` - Documentation only

**Examples**:
```bash
git commit -m "feat: add AnimationTrack.moveSlot() method"
git commit -m "test: add edge cases for empty slot playback"
git commit -m "refactor: extract event emission to helper"
```

## Debugging Tips

### 1. Use Browser DevTools

Add breakpoints in your code:
```javascript
debugger; // Execution pauses here
```

### 2. Enable Vitest UI

```bash
npm run test:ui
```

Opens interactive test runner at http://localhost:51204

### 3. Log Events

```javascript
sequence.addEventListener('track-added', (e) => {
  console.log('[DEBUG] Track added:', e.detail);
});
```

### 4. Use Performance Marks

```javascript
performance.mark('playback-start');
// ... code ...
performance.mark('playback-end');
performance.measure('playback-duration', 'playback-start', 'playback-end');
console.log(performance.getEntriesByType('measure'));
```

## Common Pitfalls

### ❌ Don't: Mutate state directly

```javascript
// BAD
track.slots[0].animation = 'walk';
```

### ✅ Do: Use methods that emit events

```javascript
// GOOD
track.setAnimation(0, 'walk');
```

### ❌ Don't: Create circular dependencies

```javascript
// BAD: models/AnimationTrack.js imports ui/multi-track-ui.js
```

### ✅ Do: Use event-driven communication

```javascript
// GOOD: UI listens to model events
track.addEventListener('animation-changed', updateUI);
```

### ❌ Don't: Test implementation details

```javascript
// BAD
expect(slot._animation).toBe('walk'); // Testing private property
```

### ✅ Do: Test public API

```javascript
// GOOD
expect(slot.animation).toBe('walk'); // Testing public getter
```

## Resources

### Documentation
- 📄 [Feature Spec](./spec.md) - User requirements
- 📄 [Implementation Plan](./plan.md) - This file
- 📄 [Data Model](./data-model.md) - Entity schemas
- 📄 [API Contracts](./contracts/multi-track-api.md) - Public APIs
- 📄 [Research](./research.md) - Technical decisions

### External Resources
- 📚 [Vitest Documentation](https://vitest.dev/)
- 📚 [PIXI.js Guide](https://pixijs.com/guides)
- 📚 [pixi-spine Documentation](https://github.com/pixijs/spine)
- 📚 [HTML5 Drag and Drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- 📚 [EventTarget API](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)

### Project Files
- 🔧 `index.html` - Current single-track UI (reference)
- 🔧 `src/spine-viewer.js` - SpineViewer component (integration point)
- 🔧 `src/utils/` - Shared utilities

## Getting Help

### Questions?

1. Check existing documentation in `specs/001-multi-track-animation-grid/`
2. Review research decisions in `research.md`
3. Examine API contracts in `contracts/multi-track-api.md`
4. Look at similar patterns in `index.html` (single-track implementation)

### Stuck on Tests?

- Read Vitest examples: https://vitest.dev/guide/
- Check mock/spy documentation: https://vitest.dev/api/vi.html
- Look at jsdom limitations: https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform

## Next Steps

1. ✅ Set up Vitest (see Quick Setup above)
2. ✅ Read [Data Model](./data-model.md) thoroughly
3. ✅ Read [API Contracts](./contracts/multi-track-api.md)
4. ✅ Start with AnimationSlot tests (TDD Red-Green-Refactor)
5. ✅ Move to AnimationTrack once AnimationSlot is complete
6. ✅ Continue with implementation order above

Happy coding! 🚀
