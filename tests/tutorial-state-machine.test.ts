// TutorialStateMachine Unit Tests
// Tests state transitions and guards

import { test, expect, describe, beforeEach } from 'bun:test';
import { TutorialStateMachine } from '../src/state/TutorialStateMachine.ts';

// Mock localStorage before imports trigger side effects
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  length: 0,
  key: () => null,
} as Storage;

describe('TutorialStateMachine', () => {
  let machine: TutorialStateMachine;

  beforeEach(() => {
    machine = new TutorialStateMachine();
  });

  describe('initial state', () => {
    test('starts in idle (null) phase', () => {
      expect(machine.getPhase()).toBe(null);
    });

    test('is not active initially', () => {
      expect(machine.isActive()).toBe(false);
    });
  });

  describe('START transition', () => {
    test('transitions from idle to intro', () => {
      const result = machine.start();
      expect(result).toBe(true);
      expect(machine.getPhase()).toBe('intro');
    });

    test('is active after starting', () => {
      machine.start();
      expect(machine.isActive()).toBe(true);
    });

    test('intro config has correct properties', () => {
      machine.start();
      const config = machine.getConfig();
      expect(config.goldenEnabled).toBe(false);
      expect(config.solBarVisible).toBe(false);
      expect(config.words.length).toBeGreaterThan(0);
    });
  });

  describe('PHASE_COMPLETE transitions', () => {
    test('intro → mechanics', () => {
      machine.start();
      expect(machine.getPhase()).toBe('intro');

      machine.completePhase();
      expect(machine.getPhase()).toBe('mechanics');
    });

    test('mechanics → fever', () => {
      machine.start();
      machine.completePhase(); // intro → mechanics

      machine.completePhase(); // mechanics → fever
      expect(machine.getPhase()).toBe('fever');
    });

    test('fever → stats', () => {
      machine.start();
      machine.completePhase(); // intro → mechanics
      machine.completePhase(); // mechanics → fever

      machine.completePhase(); // fever → stats
      expect(machine.getPhase()).toBe('stats');
    });
  });

  describe('GREEN_CAPTURED transition', () => {
    test('mechanics → fever via green capture', () => {
      machine.start();
      machine.completePhase(); // intro → mechanics

      const result = machine.captureGreen();
      expect(result).toBe(true);
      expect(machine.getPhase()).toBe('fever');
    });

    test('green capture ignored in intro', () => {
      machine.start();
      expect(machine.getPhase()).toBe('intro');

      const result = machine.captureGreen();
      expect(result).toBe(false);
      expect(machine.getPhase()).toBe('intro');
    });
  });

  describe('STATS_DISMISSED transition', () => {
    test('stats → idle', () => {
      machine.start();
      machine.completePhase(); // intro → mechanics
      machine.completePhase(); // mechanics → fever
      machine.completePhase(); // fever → stats

      machine.dismissStats();
      expect(machine.getPhase()).toBe(null);
      expect(machine.isActive()).toBe(false);
    });
  });

  describe('RESET transition', () => {
    test('reset from any state goes to idle', () => {
      machine.start();
      machine.completePhase(); // intro → mechanics

      machine.reset();
      expect(machine.getPhase()).toBe(null);
      expect(machine.isActive()).toBe(false);
    });
  });

  describe('phase configs', () => {
    test('mechanics has golden enabled', () => {
      machine.start();
      machine.completePhase();
      const config = machine.getConfig();
      expect(config.goldenEnabled).toBe(true);
      expect(config.greenLetterPosition).not.toBeNull();
    });

    test('fever has allLettersGreen', () => {
      machine.start();
      machine.completePhase();
      machine.completePhase();
      const config = machine.getConfig();
      expect(config.allLettersGreen).toBe(true);
      expect(config.goldenSpawnInterval).toBe(5);
    });
  });

  describe('timer', () => {
    test('elapsed time is 0 before starting', () => {
      expect(machine.getElapsedTime()).toBe(0);
    });

    test('elapsed time increases after starting timer', async () => {
      machine.startTimer();
      await new Promise(r => setTimeout(r, 50));
      expect(machine.getElapsedTime()).toBeGreaterThan(0);
    });

    test('reset clears timer', () => {
      machine.startTimer();
      machine.reset();
      expect(machine.getElapsedTime()).toBe(0);
    });
  });

  describe('full tutorial flow', () => {
    test('complete tutorial from start to finish', () => {
      // Start
      expect(machine.getPhase()).toBe(null);
      machine.start();
      expect(machine.getPhase()).toBe('intro');

      // Intro → Mechanics
      machine.completePhase();
      expect(machine.getPhase()).toBe('mechanics');

      // Mechanics → Fever (via green capture)
      machine.captureGreen();
      expect(machine.getPhase()).toBe('fever');

      // Fever → Stats
      machine.completePhase();
      expect(machine.getPhase()).toBe('stats');

      // Stats → Complete
      machine.dismissStats();
      expect(machine.getPhase()).toBe(null);
      expect(machine.isActive()).toBe(false);
    });

    test('complete tutorial without green capture', () => {
      machine.start();
      machine.completePhase(); // intro → mechanics
      machine.completePhase(); // mechanics → fever (via phase complete)
      machine.completePhase(); // fever → stats
      machine.dismissStats(); // stats → idle

      expect(machine.getPhase()).toBe(null);
    });
  });

  describe('invalid transitions', () => {
    test('cannot complete phase when idle', () => {
      const result = machine.completePhase();
      expect(result).toBe(false);
      expect(machine.getPhase()).toBe(null);
    });

    test('cannot dismiss stats when not in stats', () => {
      machine.start();
      const result = machine.dismissStats();
      expect(result).toBe(false);
      expect(machine.getPhase()).toBe('intro');
    });

    test('cannot capture green in fever', () => {
      machine.start();
      machine.completePhase(); // intro → mechanics
      machine.completePhase(); // mechanics → fever

      const result = machine.captureGreen();
      expect(result).toBe(false);
      expect(machine.getPhase()).toBe('fever');
    });

    test('cannot start when already started', () => {
      machine.start();
      expect(machine.getPhase()).toBe('intro');

      const result = machine.start();
      expect(result).toBe(false);
      expect(machine.getPhase()).toBe('intro');
    });
  });

  describe('edge cases', () => {
    test('multiple resets work correctly', () => {
      machine.start();
      machine.completePhase();
      machine.reset();
      expect(machine.getPhase()).toBe(null);

      machine.start();
      expect(machine.getPhase()).toBe('intro');

      machine.reset();
      expect(machine.getPhase()).toBe(null);
    });

    test('can restart after completing tutorial', () => {
      // Complete full flow
      machine.start();
      machine.completePhase();
      machine.completePhase();
      machine.completePhase();
      machine.dismissStats();
      expect(machine.getPhase()).toBe(null);

      // Start again
      machine.start();
      expect(machine.getPhase()).toBe('intro');
    });

    test('timer only starts once', () => {
      machine.startTimer();
      const time1 = machine.getElapsedTime();

      machine.startTimer(); // Should not reset
      const time2 = machine.getElapsedTime();

      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });

  describe('config consistency', () => {
    test('each phase has non-empty words except idle/stats', () => {
      // Idle
      expect(machine.getConfig().words.length).toBe(0);

      // Intro
      machine.start();
      expect(machine.getConfig().words.length).toBeGreaterThan(0);

      // Mechanics
      machine.completePhase();
      expect(machine.getConfig().words.length).toBeGreaterThan(0);

      // Fever
      machine.completePhase();
      expect(machine.getConfig().words.length).toBeGreaterThan(0);

      // Stats
      machine.completePhase();
      expect(machine.getConfig().words.length).toBe(0);
    });

    test('solBarVisible is false only in intro', () => {
      machine.start();
      expect(machine.getConfig().solBarVisible).toBe(false);

      machine.completePhase();
      expect(machine.getConfig().solBarVisible).toBe(true);

      machine.completePhase();
      expect(machine.getConfig().solBarVisible).toBe(true);
    });
  });
});
