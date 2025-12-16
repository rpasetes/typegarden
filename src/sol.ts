import { loadGarden, saveGarden } from './garden.ts';
import type { GardenState } from './garden.ts';

export interface SolState {
  sessionSol: number;
  lifetimeSol: number;
}

let state: SolState = {
  sessionSol: 0,
  lifetimeSol: 0,
};

let onSolChange: ((sol: SolState) => void) | null = null;

export function initSol(garden: GardenState): void {
  state = {
    sessionSol: 0,
    lifetimeSol: garden.lifetimeSol ?? 0,
  };
}

export function getSolState(): SolState {
  return { ...state };
}

export function setOnSolChange(callback: (sol: SolState) => void): void {
  onSolChange = callback;
}

function addSol(amount: number): void {
  state.sessionSol += amount;
  state.lifetimeSol += amount;

  // Persist lifetime sol
  const garden = loadGarden();
  if (garden) {
    saveGarden({ ...garden, lifetimeSol: state.lifetimeSol });
  }

  // Notify listeners
  onSolChange?.(state);
}

export function earnBaseSol(): void {
  addSol(1);
}

export function earnGoldenSol(tier: 1 | 2 | 3): void {
  addSol(tier);
}
