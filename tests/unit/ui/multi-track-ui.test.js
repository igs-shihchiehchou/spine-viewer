import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Multi-Track UI', () => {
  let container;

  beforeEach(() => {
    // Create a test container
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should throw error if container is not provided', () => {
      expect(() => {
        initMultiTrackUI(null);
      }).toThrow('Container element is required');
    });

    it('should create multi-track UI structure', () => {
      const result = initMultiTrackUI(container);
      
      expect(result.sequence).toBeDefined();
      expect(result.trackManager).toBeDefined();
      
      const multiTrackContainer = container.querySelector('.multi-track-container');
      expect(multiTrackContainer).toBeTruthy();
      
      const header = multiTrackContainer.querySelector('.multi-track-header');
      expect(header).toBeTruthy();
      
      const tracksList = multiTrackContainer.querySelector('.tracks-list');
      expect(tracksList).toBeTruthy();
    });

    it('should initialize playback controller if spineViewer provided', () => {
      const mockViewer = {
        playAnimation: vi.fn(),
        stopAnimation: vi.fn(),
        skeleton: { data: { findAnimation: vi.fn() } },
        state: { timeScale: 1.0 }
      };

      const result = initMultiTrackUI(container, { spineViewer: mockViewer });
      
      expect(result.playbackController).toBeDefined();
    });
  });

  describe('T107-T109: Visual indicator functions', () => {
    let result;
    let track;

    beforeEach(() => {
      result = initMultiTrackUI(container);
      track = result.sequence.addTrack();
      track.setAnimation(0, 'walk');
      track.setAnimation(1, 'run');
    });

    describe('T107: updateSlotVisualState', () => {
      it('should update slot CSS class based on state', async () => {
        const { updateSlotVisualState } = await import('../../../src/ui/multi-track-ui.js');
        
        // Wait for track to be rendered
        await vi.waitFor(() => {
          const slotElement = container.querySelector(`[data-track-id="${track.id}"][data-slot-index="0"]`);
          return slotElement !== null;
        });

        const slotElement = container.querySelector(`[data-track-id="${track.id}"][data-slot-index="0"]`);
        expect(slotElement).toBeTruthy();

        // Set to playing state
        updateSlotVisualState(track.id, 0, 'playing');
        expect(slotElement.classList.contains('playing')).toBe(true);

        // Change to idle state
        updateSlotVisualState(track.id, 0, 'idle');
        expect(slotElement.classList.contains('playing')).toBe(false);
        expect(slotElement.classList.contains('idle')).toBe(true);

        // Clear state
        updateSlotVisualState(track.id, 0, null);
        expect(slotElement.classList.contains('idle')).toBe(false);
      });

      it('should handle non-existent slot gracefully', async () => {
        const { updateSlotVisualState } = await import('../../../src/ui/multi-track-ui.js');

        expect(() => {
          updateSlotVisualState('invalid-track-id', 99, 'playing');
        }).not.toThrow();
      });
    });

    describe('T108: highlightActiveSlot', () => {
      it('should add playing class to specified slot', async () => {
        const { highlightActiveSlot } = await import('../../../src/ui/multi-track-ui.js');
        
        await vi.waitFor(() => {
          return container.querySelector(`[data-track-id="${track.id}"][data-slot-index="0"]`) !== null;
        });

        const slotElement = container.querySelector(`[data-track-id="${track.id}"][data-slot-index="0"]`);
        
        highlightActiveSlot(track.id, 0);
        
        expect(slotElement.classList.contains('playing')).toBe(true);
      });

      it('should not highlight empty slots', async () => {
        const { highlightActiveSlot } = await import('../../../src/ui/multi-track-ui.js');
        
        // Add empty slot
        const emptySlotIndex = 2;
        
        await vi.waitFor(() => {
          return container.querySelector(`[data-track-id="${track.id}"][data-slot-index="${emptySlotIndex}"]`) !== null;
        });

        const emptySlot = container.querySelector(`[data-track-id="${track.id}"][data-slot-index="${emptySlotIndex}"]`);
        
        if (emptySlot && emptySlot.classList.contains('empty')) {
          highlightActiveSlot(track.id, emptySlotIndex);
          expect(emptySlot.classList.contains('playing')).toBe(false);
        }
      });

      it('should handle non-existent slot', async () => {
        const { highlightActiveSlot } = await import('../../../src/ui/multi-track-ui.js');

        expect(() => {
          highlightActiveSlot('invalid-id', 0);
        }).not.toThrow();
      });
    });

    describe('T109: clearAllHighlights', () => {
      it('should remove playing class from all slots', async () => {
        const { highlightActiveSlot, clearAllHighlights } = await import('../../../src/ui/multi-track-ui.js');
        
        await vi.waitFor(() => {
          return container.querySelector(`[data-track-id="${track.id}"][data-slot-index="0"]`) !== null;
        });

        // Highlight multiple slots
        highlightActiveSlot(track.id, 0);
        highlightActiveSlot(track.id, 1);

        const slot0 = container.querySelector(`[data-track-id="${track.id}"][data-slot-index="0"]`);
        const slot1 = container.querySelector(`[data-track-id="${track.id}"][data-slot-index="1"]`);

        expect(slot0.classList.contains('playing')).toBe(true);
        expect(slot1.classList.contains('playing')).toBe(true);

        // Clear all highlights
        clearAllHighlights();

        expect(slot0.classList.contains('playing')).toBe(false);
        expect(slot1.classList.contains('playing')).toBe(false);
      });

      it('should work when no slots are highlighted', async () => {
        const { clearAllHighlights } = await import('../../../src/ui/multi-track-ui.js');

        expect(() => {
          clearAllHighlights();
        }).not.toThrow();
      });
    });
  });

  describe('Cleanup', () => {

  describe('renderTrack()', () => {
    it('should render track element with name', async () => {
      const { renderTrack } = await import('../../../src/ui/multi-track-ui.js');
      const mockTrack = {
        id: 'track-1',
        name: 'Test Track',
        slots: []
      };
      
      const trackElement = renderTrack(mockTrack);
      
      expect(trackElement.classList.contains('track')).toBe(true);
      expect(trackElement.textContent).toContain('Test Track');
    });

    it('should render delete button', async () => {
      const { renderTrack } = await import('../../../src/ui/multi-track-ui.js');
      const mockTrack = {
        id: 'track-1',
        name: 'Test Track',
        slots: []
      };
      
      const trackElement = renderTrack(mockTrack);
      const deleteBtn = trackElement.querySelector('.delete-track-btn');
      
      expect(deleteBtn).toBeDefined();
    });

    it('should render track header', async () => {
      const { renderTrack } = await import('../../../src/ui/multi-track-ui.js');
      const mockTrack = {
        id: 'track-1',
        name: 'Test Track',
        slots: []
      };
      
      const trackElement = renderTrack(mockTrack);
      const header = trackElement.querySelector('.track-header');
      
      expect(header).toBeDefined();
      expect(header.querySelector('.track-name')).toBeDefined();
    });
  });

  describe('Track drag-drop handlers', () => {
    it('should setup drag-drop handlers on track', async () => {
      const { setupTrackDragDrop } = await import('../../../src/ui/multi-track-ui.js');
      const mockTrack = document.createElement('div');
      mockTrack.classList.add('track');
      
      setupTrackDragDrop(mockTrack);
      
      // Check that dragover event is handled
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.fn();
      dragOverEvent.preventDefault = preventDefaultSpy;
      
      mockTrack.dispatchEvent(dragOverEvent);
      
      // Should prevent default to allow drop
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
});
