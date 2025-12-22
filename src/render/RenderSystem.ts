// RenderSystem - Observer pattern for event-driven rendering
// Subscribes to EventBus events and triggers appropriate UI updates
//
// This decouples UI rendering from game logic - the game emits events,
// RenderSystem decides what to re-render.

import { eventBus } from '../core/EventBus.ts';
import {
  renderSolBar,
  renderChainCounter,
  hideChainCounter,
  setFeverMode,
  setAllLettersGreen,
  triggerScreenGlow,
} from '../ui.ts';

export class RenderSystem {
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Subscribe to sol changes
    eventBus.on('SOL_EARNED', (event) => {
      renderSolBar(event.total);
    });

    // Subscribe to chain updates (fever mode streak)
    eventBus.on('CHAIN_UPDATED', (event) => {
      renderChainCounter(event.current);
    });

    // Subscribe to phase changes for mode styling
    eventBus.on('PHASE_CHANGED', (event) => {
      const enteringFever = event.to === 'fever';
      const exitingFever = event.from === 'fever';

      if (enteringFever) {
        setFeverMode(true);
        setAllLettersGreen(true);
      } else if (exitingFever) {
        setFeverMode(false);
        setAllLettersGreen(false);
        hideChainCounter();
      }
    });

    // Subscribe to fever end for screen glow
    eventBus.on('FEVER_ENDED', () => {
      // Screen glow is triggered by stats modal redemption, not fever end
      // Keeping this hook for potential future effects
    });

    // Subscribe to golden events for word re-rendering
    // Note: Currently handled by callbacks in main.ts during dual-write phase
    // eventBus.on('GOLDEN_SPAWNED', (event) => { ... });
    // eventBus.on('GOLDEN_CAPTURED', (event) => { ... });
    // eventBus.on('GOLDEN_EXPIRED', () => { ... });
  }

  // Trigger a screen glow effect (called from outside)
  triggerGlow(): void {
    triggerScreenGlow();
  }
}

// Singleton instance
export const renderSystem = new RenderSystem();
