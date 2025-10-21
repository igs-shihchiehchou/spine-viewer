import { describe, it, expect, beforeEach } from 'vitest';
import { MultiTrackSequence } from '../../src/models/MultiTrackSequence.js';

describe('Slot Management Integration', () => {
  let sequence;
  let track;

  beforeEach(() => {
    sequence = new MultiTrackSequence();
    track = sequence.addTrack('Test Track');
  });

  describe('Grid slot rendering', () => {
    it('should render horizontal grid of slots', () => {
      // Add multiple slots
      track.addSlot('walk');
      track.addSlot('run');
      track.addSlot('jump');
      track.addSlot(null); // empty
      track.addSlot('fly');

      expect(track.slots.length).toBe(5);
      
      // Verify slots maintain order
      expect(track.slots[0].animation).toBe('walk');
      expect(track.slots[1].animation).toBe('run');
      expect(track.slots[2].animation).toBe('jump');
      expect(track.slots[3].isEmpty).toBe(true);
      expect(track.slots[4].animation).toBe('fly');
    });

    it('should support minimum 8 slots display', () => {
      // Even with fewer animations, should support 8+ slots
      track.addSlot('anim1');
      track.addSlot('anim2');
      track.addSlot('anim3');
      
      // Add more empty slots
      for (let i = 3; i < 8; i++) {
        track.addSlot(null);
      }

      expect(track.slots.length).toBeGreaterThanOrEqual(8);
    });

    it('should maintain slot indices after operations', () => {
      track.addSlot('a');
      track.addSlot('b');
      track.addSlot('c');

      track.slots.forEach((slot, index) => {
        expect(slot.index).toBe(index);
      });
    });
  });

  describe('Empty slot visual state', () => {
    it('should distinguish empty from occupied slots', () => {
      track.addSlot('walk'); // occupied
      track.addSlot(null);   // empty
      track.addSlot('run');  // occupied

      expect(track.slots[0].isEmpty).toBe(false);
      expect(track.slots[0].animation).toBe('walk');
      
      expect(track.slots[1].isEmpty).toBe(true);
      expect(track.slots[1].animation).toBeNull();
      
      expect(track.slots[2].isEmpty).toBe(false);
      expect(track.slots[2].animation).toBe('run');
    });

    it('should update isEmpty when animation changes', () => {
      track.addSlot(null); // start empty
      
      expect(track.slots[0].isEmpty).toBe(true);
      
      track.setAnimation(0, 'walk'); // now occupied
      expect(track.slots[0].isEmpty).toBe(false);
      
      track.setAnimation(0, null); // back to empty
      expect(track.slots[0].isEmpty).toBe(true);
    });
  });

  describe('Slot drag-drop reordering', () => {
    beforeEach(() => {
      track.addSlot('a');
      track.addSlot('b');
      track.addSlot('c');
      track.addSlot('d');
    });

    it('should move slot forward within track', () => {
      track.moveSlot(1, 3); // Move 'b' to position 3
      
      expect(track.slots[0].animation).toBe('a');
      expect(track.slots[1].animation).toBe('c');
      expect(track.slots[2].animation).toBe('d');
      expect(track.slots[3].animation).toBe('b');
    });

    it('should move slot backward within track', () => {
      track.moveSlot(3, 1); // Move 'd' to position 1
      
      expect(track.slots[0].animation).toBe('a');
      expect(track.slots[1].animation).toBe('d');
      expect(track.slots[2].animation).toBe('b');
      expect(track.slots[3].animation).toBe('c');
    });

    it('should update slot indices after move', () => {
      track.moveSlot(1, 3);
      
      track.slots.forEach((slot, index) => {
        expect(slot.index).toBe(index);
      });
    });

    it('should emit slot-moved event', () => {
      let eventFired = false;
      track.addEventListener('slot-moved', () => {
        eventFired = true;
      });
      
      track.moveSlot(0, 2);
      expect(eventFired).toBe(true);
    });
  });

  describe('Cross-track slot movement', () => {
    let track2;

    beforeEach(() => {
      track2 = sequence.addTrack('Track 2');
      
      track.addSlot('walk');
      track.addSlot('run');
      track2.addSlot('smile');
      track2.addSlot('blink');
    });

    it('should move animation from one track to another', () => {
      // Simulate: remove from track1, add to track2
      const animation = track.slots[0].animation;
      
      track.removeSlot(0);
      track2.addSlot(animation);
      
      // Verify removal from track1
      expect(track.slots.length).toBe(1);
      expect(track.slots[0].animation).toBe('run');
      
      // Verify addition to track2
      expect(track2.slots.length).toBe(3);
      expect(track2.slots[2].animation).toBe('walk');
    });

    it('should maintain track isolation during moves', () => {
      const track1SlotCount = track.slots.length;
      const track2SlotCount = track2.slots.length;
      
      // Move within track1
      track.moveSlot(0, 1);
      
      // Track2 should be unaffected
      expect(track2.slots.length).toBe(track2SlotCount);
      expect(track2.slots[0].animation).toBe('smile');
    });

    it('should support slot swap between tracks', () => {
      const anim1 = track.slots[0].animation;
      const anim2 = track2.slots[0].animation;
      
      // Swap animations
      track.setAnimation(0, anim2);
      track2.setAnimation(0, anim1);
      
      expect(track.slots[0].animation).toBe('smile');
      expect(track2.slots[0].animation).toBe('walk');
    });
  });

  describe('Drag to occupied slot behavior', () => {
    beforeEach(() => {
      track.addSlot('walk');
      track.addSlot('run');
      track.addSlot('jump');
    });

    it('should replace animation in occupied slot', () => {
      track.setAnimation(1, 'fly'); // Replace 'run' with 'fly'
      
      expect(track.slots[1].animation).toBe('fly');
      expect(track.slots[1].isEmpty).toBe(false);
    });

    it('should emit animation-changed event on replacement', () => {
      let eventDetail = null;
      track.addEventListener('animation-changed', (e) => {
        eventDetail = e.detail;
      });
      
      track.setAnimation(1, 'fly');
      
      expect(eventDetail).not.toBeNull();
      expect(eventDetail.slotIndex).toBe(1);
      expect(eventDetail.animation).toBe('fly');
    });

    it('should support insert-at-index behavior', () => {
      // Insert new slot between existing slots
      track.addSlot('new-anim', 1);
      
      expect(track.slots.length).toBe(4);
      expect(track.slots[0].animation).toBe('walk');
      expect(track.slots[1].animation).toBe('new-anim');
      expect(track.slots[2].animation).toBe('run');
      expect(track.slots[3].animation).toBe('jump');
    });
  });

  describe('Full workflow', () => {
    it('should support complete slot management lifecycle', () => {
      // Initial setup
      track.addSlot('walk');
      track.addSlot('run');
      track.addSlot(null); // empty
      track.addSlot('jump');
      
      expect(track.slots.length).toBe(4);
      
      // Fill empty slot
      track.setAnimation(2, 'fly');
      expect(track.slots[2].isEmpty).toBe(false);
      
      // Reorder
      track.moveSlot(3, 1);
      expect(track.slots[1].animation).toBe('jump');
      
      // Remove slot
      track.removeSlot(0);
      expect(track.slots.length).toBe(3);
      
      // Verify final state
      expect(track.slots[0].animation).toBe('jump');
      expect(track.slots[1].animation).toBe('run');
      expect(track.slots[2].animation).toBe('fly');
    });
  });
});
