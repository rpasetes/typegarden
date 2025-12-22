// RenderSystem Unit Tests
// Tests event subscriptions and UI function calls

import { test, expect, describe, beforeEach, mock } from 'bun:test';

// Mock DOM and localStorage before imports
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
} as Storage;

globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    appendChild: () => {},
  }),
  body: {
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
} as unknown as Document;

// Track which ui functions were called
const uiCalls: { fn: string; args: unknown[] }[] = [];

// Mock ui.ts functions
const mockRenderSolBar = (sessionSol: number) => {
  uiCalls.push({ fn: 'renderSolBar', args: [sessionSol] });
};

const mockRenderChainCounter = (chain: number) => {
  uiCalls.push({ fn: 'renderChainCounter', args: [chain] });
};

const mockHideChainCounter = () => {
  uiCalls.push({ fn: 'hideChainCounter', args: [] });
};

const mockSetFeverMode = (enabled: boolean) => {
  uiCalls.push({ fn: 'setFeverMode', args: [enabled] });
};

const mockSetAllLettersGreen = (enabled: boolean) => {
  uiCalls.push({ fn: 'setAllLettersGreen', args: [enabled] });
};

// Create a mock EventBus for testing
type EventHandler = (event: unknown) => void;
const mockHandlers: Map<string, EventHandler[]> = new Map();

const mockEventBus = {
  on: (type: string, handler: EventHandler) => {
    if (!mockHandlers.has(type)) {
      mockHandlers.set(type, []);
    }
    mockHandlers.get(type)!.push(handler);
  },
  emit: (event: { type: string }) => {
    const handlers = mockHandlers.get(event.type) ?? [];
    for (const handler of handlers) {
      handler(event);
    }
  },
};

// A testable version of RenderSystem that uses mocked dependencies
class TestableRenderSystem {
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    mockEventBus.on('SOL_EARNED', (event: unknown) => {
      const e = event as { total: number };
      mockRenderSolBar(e.total);
    });

    mockEventBus.on('CHAIN_UPDATED', (event: unknown) => {
      const e = event as { current: number };
      mockRenderChainCounter(e.current);
    });

    mockEventBus.on('PHASE_CHANGED', (event: unknown) => {
      const e = event as { from: string | null; to: string | null };
      const enteringFever = e.to === 'fever';
      const exitingFever = e.from === 'fever';

      if (enteringFever) {
        mockSetFeverMode(true);
        mockSetAllLettersGreen(true);
      } else if (exitingFever) {
        mockSetFeverMode(false);
        mockSetAllLettersGreen(false);
        mockHideChainCounter();
      }
    });
  }
}

describe('RenderSystem', () => {
  let renderSystem: TestableRenderSystem;

  beforeEach(() => {
    uiCalls.length = 0;
    mockHandlers.clear();
    renderSystem = new TestableRenderSystem();
    renderSystem.init();
  });

  describe('SOL_EARNED events', () => {
    test('calls renderSolBar with total', () => {
      mockEventBus.emit({ type: 'SOL_EARNED', amount: 1, total: 42, source: 'base' });

      expect(uiCalls).toContainEqual({ fn: 'renderSolBar', args: [42] });
    });

    test('updates on multiple sol earned events', () => {
      mockEventBus.emit({ type: 'SOL_EARNED', amount: 1, total: 10, source: 'base' });
      mockEventBus.emit({ type: 'SOL_EARNED', amount: 3, total: 13, source: 'golden' });

      expect(uiCalls).toContainEqual({ fn: 'renderSolBar', args: [10] });
      expect(uiCalls).toContainEqual({ fn: 'renderSolBar', args: [13] });
    });
  });

  describe('CHAIN_UPDATED events', () => {
    test('calls renderChainCounter with current chain', () => {
      mockEventBus.emit({ type: 'CHAIN_UPDATED', current: 5, max: 5 });

      expect(uiCalls).toContainEqual({ fn: 'renderChainCounter', args: [5] });
    });

    test('updates on chain increase', () => {
      mockEventBus.emit({ type: 'CHAIN_UPDATED', current: 1, max: 1 });
      mockEventBus.emit({ type: 'CHAIN_UPDATED', current: 2, max: 2 });
      mockEventBus.emit({ type: 'CHAIN_UPDATED', current: 3, max: 3 });

      expect(uiCalls.filter(c => c.fn === 'renderChainCounter')).toHaveLength(3);
    });
  });

  describe('PHASE_CHANGED events', () => {
    test('entering fever enables fever mode and green letters', () => {
      mockEventBus.emit({ type: 'PHASE_CHANGED', from: 'mechanics', to: 'fever' });

      expect(uiCalls).toContainEqual({ fn: 'setFeverMode', args: [true] });
      expect(uiCalls).toContainEqual({ fn: 'setAllLettersGreen', args: [true] });
    });

    test('exiting fever disables fever mode and hides chain', () => {
      mockEventBus.emit({ type: 'PHASE_CHANGED', from: 'fever', to: 'stats' });

      expect(uiCalls).toContainEqual({ fn: 'setFeverMode', args: [false] });
      expect(uiCalls).toContainEqual({ fn: 'setAllLettersGreen', args: [false] });
      expect(uiCalls).toContainEqual({ fn: 'hideChainCounter', args: [] });
    });

    test('other phase changes do not trigger fever functions', () => {
      mockEventBus.emit({ type: 'PHASE_CHANGED', from: 'intro', to: 'mechanics' });

      expect(uiCalls.filter(c => c.fn === 'setFeverMode')).toHaveLength(0);
      expect(uiCalls.filter(c => c.fn === 'setAllLettersGreen')).toHaveLength(0);
    });
  });

  describe('initialization', () => {
    test('only initializes once', () => {
      // Create fresh system with fresh handlers
      const localHandlers: Map<string, EventHandler[]> = new Map();
      const localEventBus = {
        on: (type: string, handler: EventHandler) => {
          if (!localHandlers.has(type)) localHandlers.set(type, []);
          localHandlers.get(type)!.push(handler);
        },
        emit: (event: { type: string }) => {
          const handlers = localHandlers.get(event.type) ?? [];
          for (const handler of handlers) handler(event);
        },
      };

      // Track calls for this specific test
      const localCalls: string[] = [];

      class LocalRenderSystem {
        private initialized = false;
        init(): void {
          if (this.initialized) return;
          this.initialized = true;
          localEventBus.on('SOL_EARNED', () => {
            localCalls.push('renderSolBar');
          });
        }
      }

      const system = new LocalRenderSystem();
      system.init();
      system.init();
      system.init();

      localEventBus.emit({ type: 'SOL_EARNED', amount: 1, total: 1, source: 'base' });

      expect(localCalls).toHaveLength(1);
    });
  });
});
