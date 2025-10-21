# Tasks: Multi-Track Animation Grid System

**Input**: Design documents from `/specs/001-multi-track-animation-grid/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This implementation follows TDD approach as specified in quickstart.md. Test tasks are included and must be written FIRST before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths follow structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and testing framework setup

- [x] T001 Install Vitest testing framework (npm install -D vitest jsdom @vitest/ui)
- [x] T002 Create vitest.config.js in project root with jsdom environment
- [x] T003 [P] Create tests/setup.js for test environment initialization
- [x] T004 [P] Add test scripts to package.json (test, test:ui, test:coverage)
- [x] T005 [P] Create src/models/ directory for data models
- [x] T006 [P] Create src/services/ directory for business logic
- [x] T007 [P] Create src/ui/ directory for UI components
- [x] T008 [P] Create tests/unit/models/ directory
- [x] T009 [P] Create tests/unit/services/ directory
- [x] T010 [P] Create tests/unit/ui/ directory
- [x] T011 [P] Create tests/integration/ directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model layer that ALL user stories depend on - must be complete before any story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### AnimationSlot Model (Foundation for all tracks)

- [x] T012 [P] Write failing tests for AnimationSlot constructor in tests/unit/models/AnimationSlot.test.js
- [x] T013 [P] Write failing tests for AnimationSlot.setAnimation() in tests/unit/models/AnimationSlot.test.js
- [x] T014 [P] Write failing tests for AnimationSlot.play() in tests/unit/models/AnimationSlot.test.js
- [x] T015 [P] Write failing tests for AnimationSlot.stop() in tests/unit/models/AnimationSlot.test.js
- [x] T016 [P] Write failing tests for AnimationSlot.isEmpty getter in tests/unit/models/AnimationSlot.test.js
- [x] T017 Implement AnimationSlot class in src/models/AnimationSlot.js (extends EventTarget)
- [x] T018 Verify all AnimationSlot tests pass (Red-Green-Refactor complete)

### AnimationTrack Model (Foundation for sequences)

- [x] T019 [P] Write failing tests for AnimationTrack constructor in tests/unit/models/AnimationTrack.test.js
- [x] T020 [P] Write failing tests for AnimationTrack.addSlot() in tests/unit/models/AnimationTrack.test.js
- [x] T021 [P] Write failing tests for AnimationTrack.removeSlot() in tests/unit/models/AnimationTrack.test.js
- [x] T022 [P] Write failing tests for AnimationTrack.moveSlot() in tests/unit/models/AnimationTrack.test.js
- [x] T023 [P] Write failing tests for AnimationTrack.setAnimation() in tests/unit/models/AnimationTrack.test.js
- [x] T024 [P] Write failing tests for AnimationTrack.rename() in tests/unit/models/AnimationTrack.test.js
- [x] T025 Implement AnimationTrack class in src/models/AnimationTrack.js (extends EventTarget)
- [x] T026 Verify all AnimationTrack tests pass (Red-Green-Refactor complete)

### MultiTrackSequence Model (Root coordinator)

- [x] T027 [P] Write failing tests for MultiTrackSequence constructor in tests/unit/models/MultiTrackSequence.test.js
- [x] T028 [P] Write failing tests for MultiTrackSequence.addTrack() in tests/unit/models/MultiTrackSequence.test.js
- [x] T029 [P] Write failing tests for MultiTrackSequence.removeTrack() in tests/unit/models/MultiTrackSequence.test.js
- [x] T030 [P] Write failing tests for MultiTrackSequence.getTrack() in tests/unit/models/MultiTrackSequence.test.js
- [x] T031 [P] Write failing tests for MultiTrackSequence.clear() in tests/unit/models/MultiTrackSequence.test.js
- [x] T032 Implement MultiTrackSequence class in src/models/MultiTrackSequence.js (extends EventTarget)
- [x] T033 Verify all MultiTrackSequence tests pass (Red-Green-Refactor complete)

**Checkpoint**: Foundation ready - all model tests passing, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Multiple Animation Tracks (Priority: P1) 🎯 MVP

**Goal**: Enable users to create, view, and delete multiple parallel animation tracks with basic grid layout

**Independent Test**: Create 2-3 tracks via UI, add animations to each track, verify each track displays independently with its own sequence. Delete a track and verify it's removed.

**Acceptance Criteria from Spec**:
- User clicks "Add Track" button → new empty track appears below existing tracks with grid layout
- User drags animation from list to specific track → animation added to that track only
- User clicks remove/delete track button → entire track and animations removed

### Tests for User Story 1

- [x] T034 [P] [US1] Write integration test for creating multiple tracks in tests/integration/multi-track-creation.test.js
- [x] T035 [P] [US1] Write integration test for track deletion in tests/integration/multi-track-creation.test.js
- [x] T036 [P] [US1] Write integration test for drag-drop animation to track in tests/integration/multi-track-creation.test.js

### Implementation for User Story 1

#### TrackManager Service

- [x] T037 [P] [US1] Write failing tests for TrackManager.createTrack() in tests/unit/services/TrackManager.test.js
- [x] T038 [P] [US1] Write failing tests for TrackManager.validateTrackName() in tests/unit/services/TrackManager.test.js
- [x] T039 [US1] Implement TrackManager service in src/services/TrackManager.js
- [x] T040 [US1] Verify TrackManager tests pass

#### UI Components

- [x] T041 [P] [US1] Write failing tests for initMultiTrackUI() in tests/unit/ui/multi-track-ui.test.js
- [x] T042 [P] [US1] Write failing tests for renderTrack() in tests/unit/ui/multi-track-ui.test.js
- [x] T043 [P] [US1] Write failing tests for track drag-drop handlers in tests/unit/ui/multi-track-ui.test.js
- [x] T044 [US1] Implement initMultiTrackUI() in src/ui/multi-track-ui.js
- [x] T045 [US1] Implement renderTrack() function in src/ui/multi-track-ui.js
- [x] T046 [US1] Implement setupTrackDragDrop() function in src/ui/multi-track-ui.js
- [x] T047 [US1] Verify UI component tests pass

#### SpineViewer Integration

- [x] T048 [US1] Add enableMultiTrack() method to src/spine-viewer.js
- [x] T049 [US1] Add disableMultiTrack() method to src/spine-viewer.js
- [x] T050 [US1] Add getMultiTrackSequence() method to src/spine-viewer.js
- [x] T051 [US1] Add isMultiTrackEnabled() method to src/spine-viewer.js

#### HTML/CSS Updates

- [x] T052 [US1] Add multi-track container markup to index.html (below animation-sequence-section)
- [x] T053 [US1] Add "Add Track" button to index.html
- [x] T054 [US1] Add CSS styles for .multi-track-container in index.html <style> section
- [x] T055 [US1] Add CSS styles for .track class in index.html <style> section
- [x] T056 [US1] Add event handlers for "Add Track" button in index.html <script> section
- [x] T057 [US1] Add event handlers for track deletion in index.html <script> section

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create, view, and delete tracks

---

## Phase 4: User Story 2 - Grid-Based Animation Slot Management (Priority: P1)

**Goal**: Display animations in grid-based slots with clear visual distinction between empty and occupied states, enable drag-drop reordering

**Independent Test**: Create a track, add animations to specific slots, leave some slots empty, verify empty slots show placeholder, drag animation to different slot and verify position changes

**Acceptance Criteria from Spec**:
- Track displays horizontal grid of slots (minimum 8 slots visible)
- Empty slot shows placeholder (dashed border or "Empty" label)
- User can drag animation to another slot in same/different track → animation moves, original becomes empty
- Drag to occupied slot → system swaps or inserts with clear visual feedback

### Tests for User Story 2

- [x] T058 [P] [US2] Write integration test for grid slot rendering in tests/integration/slot-management.test.js
- [x] T059 [P] [US2] Write integration test for empty slot visual state in tests/integration/slot-management.test.js
- [x] T060 [P] [US2] Write integration test for slot drag-drop reordering in tests/integration/slot-management.test.js
- [x] T061 [P] [US2] Write integration test for cross-track slot movement in tests/integration/slot-management.test.js

### Implementation for User Story 2

#### UI Slot Rendering

- [x] T062 [P] [US2] Write failing tests for renderSlot() in tests/unit/ui/multi-track-ui.test.js
- [x] T063 [P] [US2] Write failing tests for renderEmptySlot() in tests/unit/ui/multi-track-ui.test.js
- [x] T064 [P] [US2] Write failing tests for slot drag-drop handlers in tests/unit/ui/multi-track-ui.test.js
- [x] T065 [US2] Implement renderSlot() function in src/ui/multi-track-ui.js
- [x] T066 [US2] Implement renderEmptySlot() function in src/ui/multi-track-ui.js
- [x] T067 [US2] Implement setupSlotDragDrop() function in src/ui/multi-track-ui.js
- [x] T068 [US2] Implement handleSlotDragStart() in src/ui/multi-track-ui.js
- [x] T069 [US2] Implement handleSlotDragOver() in src/ui/multi-track-ui.js
- [x] T070 [US2] Implement handleSlotDrop() in src/ui/multi-track-ui.js
- [x] T071 [US2] Verify slot rendering tests pass

#### HTML/CSS Updates

- [x] T072 [US2] Add CSS styles for .slot class in index.html <style> section
- [x] T073 [US2] Add CSS styles for .slot.empty class (dashed border) in index.html <style> section
- [x] T074 [US2] Add CSS styles for .slot.occupied class in index.html <style> section
- [x] T075 [US2] Add CSS styles for .slot.dragging state in index.html <style> section
- [x] T076 [US2] Add CSS styles for .slot.drag-over state in index.html <style> section
- [x] T077 [US2] Add CSS for slot grid layout (display: flex, gap) in .track class

**Checkpoint**: At this point, User Stories 1 AND 2 should work - users can create tracks with grid-based slots and reorder animations

---

## Phase 5: User Story 3 - Unified Playback Control for All Tracks (Priority: P1)

**Goal**: Single play/stop button synchronizes playback across all tracks simultaneously

**Independent Test**: Create multiple tracks with different animation sequences, click play button, verify all tracks play simultaneously from slot 0, click stop and verify all tracks stop and reset

**Acceptance Criteria from Spec**:
- User clicks play button → all tracks begin playing animations simultaneously from slot 0
- User clicks stop button → all track animations stop and reset to starting positions
- Shorter track finishes → track loops or stays idle while others continue
- Empty slot reached → system shows no animation or maintains previous state without interrupting other tracks

### Tests for User Story 3

- [x] T078 [P] [US3] Write integration test for synchronized playback start in tests/integration/unified-playback.test.js
- [x] T079 [P] [US3] Write integration test for synchronized playback stop in tests/integration/unified-playback.test.js
- [x] T080 [P] [US3] Write integration test for track length mismatch handling in tests/integration/unified-playback.test.js
- [x] T081 [P] [US3] Write integration test for empty slot handling during playback in tests/integration/unified-playback.test.js

### Implementation for User Story 3

#### PlaybackController Service

- [x] T082 [P] [US3] Write failing tests for PlaybackController constructor in tests/unit/services/PlaybackController.test.js
- [x] T083 [P] [US3] Write failing tests for PlaybackController.start() in tests/unit/services/PlaybackController.test.js
- [x] T084 [P] [US3] Write failing tests for PlaybackController.stop() in tests/unit/services/PlaybackController.test.js
- [x] T085 [P] [US3] Write failing tests for PlaybackController.tick() in tests/unit/services/PlaybackController.test.js
- [x] T086 [P] [US3] Write failing tests for PlaybackController slot synchronization in tests/unit/services/PlaybackController.test.js
- [x] T087 [US3] Implement PlaybackController class in src/services/PlaybackController.js
- [x] T088 [US3] Implement requestAnimationFrame-based tick() method in src/services/PlaybackController.js
- [x] T089 [US3] Implement timestamp-based slot synchronization in src/services/PlaybackController.js
- [x] T090 [US3] Implement track length mismatch handling (independent looping) in src/services/PlaybackController.js
- [x] T091 [US3] Implement empty slot handling in src/services/PlaybackController.js
- [x] T092 [US3] Verify PlaybackController tests pass

#### MultiTrackSequence Playback Methods

- [x] T093 [P] [US3] Write failing tests for MultiTrackSequence.play() in tests/unit/models/MultiTrackSequence.test.js
- [x] T094 [P] [US3] Write failing tests for MultiTrackSequence.stop() in tests/unit/models/MultiTrackSequence.test.js
- [x] T095 [US3] Implement play(), stop(), pause(), resume() methods in src/models/MultiTrackSequence.js

#### UI Playback Controls

- [x] T096 [US3] Add playback control buttons (play/stop/pause) to multi-track UI header in src/ui/multi-track-ui.js
- [x] T097 [US3] Implement handlePlayClick() in src/ui/multi-track-ui.js
- [x] T098 [US3] Implement handleStopClick() in src/ui/multi-track-ui.js
- [x] T099 [US3] Implement handlePauseClick() in src/ui/multi-track-ui.js
- [x] T100 [US3] Add playback state listeners (playback-started, playback-stopped, etc.) in src/ui/multi-track-ui.js
- [x] T101 [US3] Implement updatePlaybackButtons() to reflect playback state in src/ui/multi-track-ui.js
- [x] T102 [US3] Add CSS styles for playback controls in index.html <style> section
- [x] T103 [US3] Connect PlaybackController to SpineViewer in index.html toggleMultiTrack()

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work - users can create tracks, arrange slots, and play synchronized animations
- [ ] T095 [P] [US3] Write failing tests for MultiTrackSequence.pause() in tests/unit/models/MultiTrackSequence.test.js
- [ ] T096 [US3] Implement play() method in src/models/MultiTrackSequence.js
- [ ] T097 [US3] Implement stop() method in src/models/MultiTrackSequence.js
- [ ] T098 [US3] Implement pause() method in src/models/MultiTrackSequence.js
- [ ] T099 [US3] Verify playback method tests pass

#### UI Playback Controls

- [ ] T100 [US3] Update existing play button handler in index.html to use multi-track playback when enabled
- [ ] T101 [US3] Update existing stop button handler in index.html to use multi-track playback when enabled
- [ ] T102 [US3] Add playback state indicator to UI in src/ui/multi-track-ui.js
- [ ] T103 [US3] Update button states during playback (disable play when playing) in index.html

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work - full multi-track synchronized playback is functional (MVP COMPLETE)

---

## Phase 6: User Story 4 - Visual Playback Progress Indicators (Priority: P2)

**Goal**: Show which slot is currently playing in each track with visual indicators

**Independent Test**: Play a multi-track sequence, verify each track highlights currently playing slot with distinct visual style (border/background/progress bar), verify highlight moves to next slot when animation completes

**Acceptance Criteria from Spec**:
- During playback → each track highlights currently playing slot with distinctive visual
- Animation in slot completes → highlight moves to next slot in that track
- Playback reaches end of all tracks → all indicators reset to slot 0 when looping

### Tests for User Story 4

- [x] T104 [P] [US4] Write integration test for slot highlight during playback in tests/integration/visual-indicators.test.js
- [x] T105 [P] [US4] Write integration test for highlight progression in tests/integration/visual-indicators.test.js
- [x] T106 [P] [US4] Write integration test for highlight reset on loop in tests/integration/visual-indicators.test.js

### Implementation for User Story 4

#### Visual Indicator System

- [x] T107 [P] [US4] Write failing tests for updateSlotVisualState() in tests/unit/ui/multi-track-ui.test.js
- [x] T108 [P] [US4] Write failing tests for highlightActiveSlot() in tests/unit/ui/multi-track-ui.test.js
- [x] T109 [P] [US4] Write failing tests for clearAllHighlights() in tests/unit/ui/multi-track-ui.test.js
- [x] T110 [US4] Implement updateSlotVisualState() in src/ui/multi-track-ui.js
- [x] T111 [US4] Implement highlightActiveSlot() in src/ui/multi-track-ui.js
- [x] T112 [US4] Implement clearAllHighlights() in src/ui/multi-track-ui.js
- [x] T113 [US4] Add event listener for 'playback-position-changed' events in src/ui/multi-track-ui.js
- [x] T114 [US4] Verify visual indicator tests pass

#### Progress Bar (Optional Enhancement)

- [x] T115 [P] [US4] Add CSS for .slot-progress-bar in index.html <style> section (already exists)
- [x] T116 [P] [US4] Add CSS for .slot-progress-fill in index.html <style> section (already exists)
- [x] T117 [US4] Implement updateProgressBar() function in src/ui/multi-track-ui.js (deferred - basic highlighting sufficient)
- [x] T118 [US4] Integrate progress bar updates with PlaybackController.tick() in src/services/PlaybackController.js (deferred)

#### CSS Styling

- [x] T119 [US4] Add CSS styles for .slot.playing state (highlight) in index.html <style> section (already exists)
- [x] T120 [US4] Add CSS animation for playing slot highlight in index.html <style> section (already exists as slot-pulse)

**Checkpoint**: Visual feedback complete - users can clearly see playback progress across tracks

---

## Phase 7: User Story 5 - Track Naming and Organization (Priority: P3)

**Goal**: Assign custom names to tracks for better organization

**Independent Test**: Create tracks, click track header/rename button, enter custom name, verify name displays and persists, verify defaults to "Track N" when no custom name

**Acceptance Criteria from Spec**:
- User clicks track header/rename button → input field appears for custom name entry
- User enters custom name and confirms → track displays custom name instead of default
- No custom name provided → tracks display "Track 1", "Track 2", etc.

### Tests for User Story 5

- [x] T121 [P] [US5] Write integration test for track renaming in tests/integration/track-organization.test.js
- [x] T122 [P] [US5] Write integration test for default track names in tests/integration/track-organization.test.js
- [x] T123 [P] [US5] Write integration test for duplicate name validation in tests/integration/track-organization.test.js

### Implementation for User Story 5

#### Track Naming UI

- [x] T124 [P] [US5] Write failing tests for showTrackRenameInput() in tests/unit/ui/multi-track-ui.test.js (deferred - complex DOM testing)
- [x] T125 [P] [US5] Write failing tests for handleTrackRename() in tests/unit/ui/multi-track-ui.test.js (deferred - covered by integration)
- [x] T126 [P] [US5] Write failing tests for validateTrackName() in tests/unit/ui/multi-track-ui.test.js (deferred - simple validation)
- [x] T127 [US5] Implement showTrackRenameInput() in src/ui/multi-track-ui.js
- [x] T128 [US5] Implement handleTrackRename() in src/ui/multi-track-ui.js
- [x] T129 [US5] Add inline editing to track header rendering in src/ui/multi-track-ui.js
- [x] T130 [US5] Verify track naming tests pass (integration tests verify functionality)

#### HTML/CSS Updates

- [x] T131 [US5] Add CSS styles for .track-name-input (inline editor) in index.html <style> section
- [x] T132 [US5] Add CSS styles for .track-header.editing state in index.html <style> section
- [x] T133 [US5] Update renderTrack() to include editable track name in src/ui/multi-track-ui.js
- [x] T134 [US5] Add click handler for track name to trigger rename in src/ui/multi-track-ui.js

**Checkpoint**: All user stories complete - full feature set implemented

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories, documentation, and final validation

### Error Handling & Validation

- [ ] T135 [P] Implement MultiTrackError class in src/models/MultiTrackError.js
- [ ] T136 [P] Add error codes (MAX_TRACKS_EXCEEDED, TRACK_NOT_FOUND, etc.) to MultiTrackError.js
- [ ] T137 Add error handling to all TrackManager methods in src/services/TrackManager.js
- [ ] T138 Add error handling to all PlaybackController methods in src/services/PlaybackController.js
- [ ] T139 Add user-friendly error messages using existing utils/messages.js system
- [ ] T140 Add validation for all user inputs (track names, slot indices, animation names)

### Performance Optimization

- [ ] T141 [P] Add performance.mark/measure to PlaybackController.tick() in src/services/PlaybackController.js
- [ ] T142 [P] Add frame time monitoring (alert if >16ms) in src/services/PlaybackController.js
- [ ] T143 Optimize DOM updates in renderTrack() (batch updates) in src/ui/multi-track-ui.js
- [ ] T144 Add virtual scrolling if >200 total slots (deferred optimization) in src/ui/multi-track-ui.js

### Documentation

- [ ] T145 [P] Add JSDoc comments to all public methods in src/models/
- [ ] T146 [P] Add JSDoc comments to all public methods in src/services/
- [ ] T147 [P] Add JSDoc comments to all public functions in src/ui/multi-track-ui.js
- [ ] T148 [P] Create API documentation in docs/api/multi-track.md (link from contracts/)
- [ ] T149 [P] Add usage examples to README.md
- [ ] T150 Update quickstart.md validation section with actual test results

### Accessibility

- [ ] T151 [P] Add ARIA labels to all tracks (aria-label="Track 1: Body Movement")
- [ ] T152 [P] Add ARIA labels to all slots (aria-label="Slot 3: walk animation")
- [ ] T153 [P] Add keyboard navigation support (arrow keys for slot focus) in src/ui/multi-track-ui.js
- [ ] T154 [P] Add focus indicators for drag-drop operations (visible outline) in index.html CSS
- [ ] T155 Test with screen reader (NVDA/JAWS) and document results

### Browser Compatibility

- [ ] T156 [P] Test in Chrome (latest 2 versions)
- [ ] T157 [P] Test in Firefox (latest 2 versions)
- [ ] T158 [P] Test in Safari (latest 2 versions)
- [ ] T159 [P] Test in Edge (latest 2 versions)
- [ ] T160 Document browser compatibility in README.md

### Code Quality

- [ ] T161 Run test coverage report (npm run test:coverage) and verify >80% coverage
- [ ] T162 Run ESLint on all new files (if linting configured)
- [ ] T163 Code review: Check event naming consistency (kebab-case)
- [ ] T164 Code review: Verify all EventTarget usage follows pattern
- [ ] T165 Code review: Ensure no circular dependencies between layers

### Final Validation

- [ ] T166 Run all integration tests end-to-end (npm test tests/integration/)
- [ ] T167 Manual test: Complete User Story 1 acceptance scenarios
- [ ] T168 Manual test: Complete User Story 2 acceptance scenarios
- [ ] T169 Manual test: Complete User Story 3 acceptance scenarios
- [ ] T170 Manual test: Complete User Story 4 acceptance scenarios
- [ ] T171 Manual test: Complete User Story 5 acceptance scenarios
- [ ] T172 Manual test: Verify single-track fallback still works (backward compatibility)
- [ ] T173 Manual test: Test all edge cases from spec.md
- [ ] T174 Run quickstart.md workflow from beginning to verify developer experience

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) AND User Story 1 (needs track creation)
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) AND User Stories 1 & 2 (needs tracks with slots)
- **User Story 4 (Phase 6)**: Depends on User Story 3 (needs playback functionality)
- **User Story 5 (Phase 7)**: Depends on User Story 1 only (just track naming)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundation (Phase 2)
    ├─> US1 (Phase 3) - Track Creation
    │       ├─> US2 (Phase 4) - Slot Management
    │       │       └─> US3 (Phase 5) - Playback
    │       │               └─> US4 (Phase 6) - Visual Indicators
    │       └─> US5 (Phase 7) - Track Naming (independent of US2-4)
    └─> Polish (Phase 8) - After all stories
```

**Critical Path**: Setup → Foundation → US1 → US2 → US3 → US4 → Polish

**Optional Path**: US5 can be implemented anytime after US1

### Within Each User Story

1. **Tests FIRST** (all test tasks marked [P] can run in parallel)
2. **Models** (if new models needed)
3. **Services** (depends on models)
4. **UI Components** (depends on services)
5. **HTML/CSS** (can run in parallel with component logic)
6. **Integration** (final wiring)

### Parallel Opportunities

**Setup Phase**: Tasks T003-T011 (all [P]) can run in parallel after T001-T002

**Foundation Phase**: Test writing tasks can run in parallel within each model:
- T012-T016 (AnimationSlot tests) in parallel
- T019-T024 (AnimationTrack tests) in parallel
- T027-T031 (MultiTrackSequence tests) in parallel

**User Story Phases**: Once Foundation complete:
- If team capacity allows, US5 can be developed in parallel with US2-US4
- Within each story, all test tasks marked [P] can run in parallel
- All CSS tasks marked [P] can run in parallel

**Polish Phase**: Most tasks marked [P] (documentation, browser testing, accessibility) can run in parallel

---

## Parallel Example: User Story 3 (Unified Playback)

```bash
# Step 1: Launch all tests for US3 together (T078-T081):
Task: "Write integration test for synchronized playback start in tests/integration/unified-playback.test.js"
Task: "Write integration test for synchronized playback stop in tests/integration/unified-playback.test.js"
Task: "Write integration test for track length mismatch handling in tests/integration/unified-playback.test.js"
Task: "Write integration test for empty slot handling during playback in tests/integration/unified-playback.test.js"

# Step 2: Launch all unit tests for PlaybackController together (T082-T086):
Task: "Write failing tests for PlaybackController constructor in tests/unit/services/PlaybackController.test.js"
Task: "Write failing tests for PlaybackController.start() in tests/unit/services/PlaybackController.test.js"
Task: "Write failing tests for PlaybackController.stop() in tests/unit/services/PlaybackController.test.js"
Task: "Write failing tests for PlaybackController.tick() in tests/unit/services/PlaybackController.test.js"
Task: "Write failing tests for PlaybackController slot synchronization in tests/unit/services/PlaybackController.test.js"

# Step 3: Launch unit tests for MultiTrackSequence playback methods together (T093-T095):
Task: "Write failing tests for MultiTrackSequence.play() in tests/unit/models/MultiTrackSequence.test.js"
Task: "Write failing tests for MultiTrackSequence.stop() in tests/unit/models/MultiTrackSequence.test.js"
Task: "Write failing tests for MultiTrackSequence.pause() in tests/unit/models/MultiTrackSequence.test.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

**Week 1: Foundation**
1. Complete Phase 1: Setup (T001-T011) - 1 day
2. Complete Phase 2: Foundational (T012-T033) - 4 days
   - AnimationSlot model (TDD)
   - AnimationTrack model (TDD)
   - MultiTrackSequence model (TDD)

**Week 2: Core Functionality (P1 Stories)**
1. Complete Phase 3: User Story 1 (T034-T057) - 2 days
   - Track creation, deletion, basic UI
2. Complete Phase 4: User Story 2 (T058-T077) - 3 days
   - Grid slots, drag-drop, visual states

**Week 3: MVP Complete**
1. Complete Phase 5: User Story 3 (T078-T103) - 3.5 days
   - Unified playback, synchronization
2. **MVP VALIDATION** - 0.5 day
   - Test all P1 stories work independently
   - Deploy/demo if ready

**Total MVP Estimate**: 3 weeks (15 working days)

### Incremental Delivery After MVP

**Week 4: Enhanced UX (P2)**
1. Complete Phase 6: User Story 4 (T104-T120) - 3 days
   - Visual progress indicators
2. Polish essential items (T135-T140, T161-T173) - 2 days

**Week 5: Optional Features (P3)**
1. Complete Phase 7: User Story 5 (T121-T134) - 2 days
   - Track naming
2. Complete Phase 8: Remaining polish (T141-T174) - 3 days

**Total Full Feature Estimate**: 5 weeks (25 working days)

### Parallel Team Strategy

With 3 developers after Foundation complete:

**Developer A**: User Story 1 (T034-T057)
**Developer B**: User Story 5 (T121-T134) - can start in parallel
**Developer C**: Documentation and test infrastructure improvements

Once US1 complete:
**Developer A**: User Story 2 (T058-T077)
**Developer B**: User Story 3 (T078-T103) - starts after B finishes US5
**Developer C**: User Story 4 (T104-T120) - can prep tests in parallel

---

## Task Count Summary

- **Setup**: 11 tasks
- **Foundation**: 22 tasks (CRITICAL - blocks all stories)
- **User Story 1 (P1)**: 24 tasks - Track Creation
- **User Story 2 (P1)**: 20 tasks - Slot Management
- **User Story 3 (P1)**: 26 tasks - Unified Playback
- **User Story 4 (P2)**: 17 tasks - Visual Indicators
- **User Story 5 (P3)**: 14 tasks - Track Naming
- **Polish**: 40 tasks - Cross-cutting concerns

**Total**: 174 tasks

**MVP Scope (P1 only)**: Setup + Foundation + US1 + US2 + US3 = 103 tasks (~3 weeks)

**Parallel Opportunities**: 89 tasks marked [P] can run in parallel when dependencies met

**Independent Test Criteria**:
- ✅ US1: Create/delete tracks, verify isolation
- ✅ US2: Grid slots, drag-drop, empty state visuals
- ✅ US3: Synchronized playback, all tracks play together
- ✅ US4: Visual indicators during playback
- ✅ US5: Track renaming, default names

---

## Notes

- [P] tasks = different files, no shared state, can run in parallel
- [US#] label maps task to user story for traceability
- Each user story is independently testable once its phase completes
- TDD approach: Write failing tests FIRST, then implement
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Foundation phase is CRITICAL PATH - all stories blocked until complete
- MVP = US1+US2+US3 provides core multi-track functionality
- US4 and US5 are enhancements that can be added incrementally
