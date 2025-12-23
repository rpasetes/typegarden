// Sol module - thin wrapper delegating to SolSystem
// Provides backwards-compatible API for existing code

import { solSystem, type SolState } from './systems/SolSystem.ts';
import type { GardenState } from './garden.ts';

// Re-export types
export type { SolState };

export function initSol(garden: GardenState): void {
  solSystem.init(garden);
}

export function getSolState(): SolState {
  return solSystem.getState();
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
