// Sol module - thin wrapper for backwards compatibility
// Delegates to SolSystem (the new event-driven implementation)
// TODO: Remove this file in Phase 7 cleanup

import { solSystem, type SolState } from './systems/SolSystem.ts';
import { eventBus } from './core/EventBus.ts';
import type { GardenState } from './garden.ts';

// Re-export types
export type { SolState };

// Legacy callback - still used by main.ts during dual-write phase
let onSolChange: ((sol: SolState) => void) | null = null;

export function initSol(garden: GardenState): void {
  solSystem.init(garden);
}

export function getSolState(): SolState {
  return solSystem.getState();
}

export function setOnSolChange(callback: (sol: SolState) => void): void {
  onSolChange = callback;

  // Subscribe to SOL_EARNED events and forward to legacy callback
  // This bridges the old callback system with the new event system
  eventBus.on('SOL_EARNED', () => {
    if (onSolChange) {
      onSolChange(solSystem.getState());
    }
  });
}

export function earnBaseSol(): void {
  solSystem.earnBase();
}

export function earnGoldenSol(tier: 1 | 2 | 3): void {
  solSystem.earnGolden(tier);
}

export function earnBonusSol(amount: number): void {
  solSystem.earnBonus(amount);
}
