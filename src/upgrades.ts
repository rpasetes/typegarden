import type { Seed } from './garden.ts';

export interface Upgrade {
  id: string;
  seed: Seed;
  name: string;
  description: string;
  tier: 1 | 2 | 3; // Tutorial beat where this can appear
}

// Upgrade definitions for v0
export const UPGRADES: Upgrade[] = [
  // COSMETIC SEED — Tier 1
  {
    id: 'cosmetic.palette',
    seed: 'cosmetic',
    name: 'palette',
    description: 'shift the colors',
    tier: 1,
  },
  // COSMETIC SEED — Tier 2
  {
    id: 'cosmetic.minimal',
    seed: 'cosmetic',
    name: 'minimal',
    description: 'remove all UI except text',
    tier: 2,
  },
  // COSMETIC SEED — Tier 3 (seed lock-in option)
  {
    id: 'cosmetic.focus',
    seed: 'cosmetic',
    name: 'focus',
    description: 'dim untyped words, highlight current',
    tier: 3,
  },

  // MECHANICAL SEED — Tier 1
  {
    id: 'mechanical.timer',
    seed: 'mechanical',
    name: 'timer',
    description: 'add a countdown',
    tier: 1,
  },
  // MECHANICAL SEED — Tier 2
  {
    id: 'mechanical.endless',
    seed: 'mechanical',
    name: 'endless',
    description: 'infinite mode, no word limit',
    tier: 2,
  },
  // MECHANICAL SEED — Tier 3 (seed lock-in option)
  {
    id: 'mechanical.strict',
    seed: 'mechanical',
    name: 'strict',
    description: 'errors must be corrected to continue',
    tier: 3,
  },

  // DATA SEED — Tier 1
  {
    id: 'data.wpm',
    seed: 'data',
    name: 'wpm',
    description: 'show live words per minute',
    tier: 1,
  },
  // DATA SEED — Tier 2
  {
    id: 'data.heatmap',
    seed: 'data',
    name: 'heatmap',
    description: 'show which keys you miss most',
    tier: 2,
  },
  // DATA SEED — Tier 3 (seed lock-in option)
  {
    id: 'data.history',
    seed: 'data',
    name: 'history',
    description: 'show your last 5 runs',
    tier: 3,
  },
];

export function getUpgradesByTier(tier: 1 | 2 | 3): Upgrade[] {
  return UPGRADES.filter((u) => u.tier === tier);
}

export function getUpgradeById(id: string): Upgrade | undefined {
  return UPGRADES.find((u) => u.id === id);
}

export function getUpgradesBySeed(seed: Seed): Upgrade[] {
  return UPGRADES.filter((u) => u.seed === seed);
}

// Apply upgrade effects — this will be expanded as we implement each upgrade
export function applyUpgradeEffects(activeUpgrades: string[]): void {
  // Cosmetic effects
  if (activeUpgrades.includes('cosmetic.palette')) {
    document.body.classList.add('palette-alt');
  } else {
    document.body.classList.remove('palette-alt');
  }

  if (activeUpgrades.includes('cosmetic.minimal')) {
    document.body.classList.add('minimal');
  } else {
    document.body.classList.remove('minimal');
  }

  if (activeUpgrades.includes('cosmetic.focus')) {
    document.body.classList.add('focus-mode');
  } else {
    document.body.classList.remove('focus-mode');
  }

  // Mechanical and Data effects are handled in the typing engine
}
