// Test setup and global configuration
import { beforeEach, afterEach } from 'vitest';

// Global test setup
beforeEach(() => {
  // Clear any event listeners between tests
  if (global.eventListenerCleanup) {
    global.eventListenerCleanup.forEach(cleanup => cleanup());
  }
  global.eventListenerCleanup = [];
});

afterEach(() => {
  // Cleanup after each test
  if (global.eventListenerCleanup) {
    global.eventListenerCleanup.forEach(cleanup => cleanup());
    global.eventListenerCleanup = [];
  }
});

// Mock browser APIs if needed
global.requestAnimationFrame = global.requestAnimationFrame || ((callback) => {
  return setTimeout(callback, 16);
});

global.cancelAnimationFrame = global.cancelAnimationFrame || ((id) => {
  clearTimeout(id);
});
