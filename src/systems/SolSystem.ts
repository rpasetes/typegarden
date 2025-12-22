// SolSystem - Currency management system
// Extracted from sol.ts as part of Game Programming Patterns refactor
// Uses EventBus instead of callbacks

import { eventBus } from '../core/EventBus.ts';
import { loadGarden, saveGarden } from '../garden.ts';
import type { GardenState } from '../garden.ts';

export interface SolState {
  sessionSol: number;
  lifetimeSol: number;
}

export type SolSource = 'base' | 'golden' | 'bonus';

export class SolSystem {
  private state: SolState = {
    sessionSol: 0,
    lifetimeSol: 0,
  };

  // Initialize from garden state
  init(garden: GardenState): void {
    this.state = {
      sessionSol: garden.sessionSol ?? 0,
      lifetimeSol: garden.lifetimeSol ?? 0,
    };
  }

  // Get current sol state (returns copy to prevent mutation)
  getState(): SolState {
    return { ...this.state };
  }

  // Add sol and emit event
  private addSol(amount: number, source: SolSource): void {
    this.state.sessionSol += amount;
    this.state.lifetimeSol += amount;

    // Persist session and lifetime sol
    const garden = loadGarden();
    if (garden) {
      saveGarden({
        ...garden,
        sessionSol: this.state.sessionSol,
        lifetimeSol: this.state.lifetimeSol,
      });
    }

    // Emit event instead of callback
    eventBus.emit({
      type: 'SOL_EARNED',
      amount,
      total: this.state.sessionSol,
      source,
    });
  }

  // Earn 1 sol for completing a word
  earnBase(): void {
    this.addSol(1, 'base');
  }

  // Earn sol for capturing golden letter (1-3 based on tier)
  earnGolden(tier: 1 | 2 | 3): void {
    this.addSol(tier, 'golden');
  }

  // Earn custom bonus amount
  earnBonus(amount: number): void {
    this.addSol(amount, 'bonus');
  }

  // Reset session sol (for new runs)
  resetSession(): void {
    this.state.sessionSol = 0;
  }
}

// Singleton instance
export const solSystem = new SolSystem();
