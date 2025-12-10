export type Seed = 'cosmetic' | 'mechanical' | 'data';

export interface RunResult {
  timestamp: number;
  wpm: number;
  accuracy: number;
  wordCount: number;
  duration: number;
}

export interface GardenState {
  tutorialBeat: 0 | 1 | 2 | 3; // 0 = not started, 1-3 = current beat, 3 = complete after third choice
  tutorialComplete: boolean;
  seed: Seed | null; // Locked in after third tutorial choice
  unlockedUpgrades: string[]; // Permanent collection
  activeUpgrades: string[]; // Currently enabled
  runHistory: RunResult[];
  totalWordsTyped: number;
}

const STORAGE_KEY = 'typegarden';

export function initGarden(): GardenState {
  return {
    tutorialBeat: 0,
    tutorialComplete: false,
    seed: null,
    unlockedUpgrades: [],
    activeUpgrades: [],
    runHistory: [],
    totalWordsTyped: 0,
  };
}

export function saveGarden(state: GardenState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGarden(): GardenState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GardenState;
  } catch {
    return null;
  }
}

export function addRun(state: GardenState, result: RunResult): GardenState {
  return {
    ...state,
    runHistory: [...state.runHistory, result],
    totalWordsTyped: state.totalWordsTyped + result.wordCount,
  };
}

export function unlockUpgrade(state: GardenState, upgradeId: string): GardenState {
  if (state.unlockedUpgrades.includes(upgradeId)) return state;

  return {
    ...state,
    unlockedUpgrades: [...state.unlockedUpgrades, upgradeId],
    activeUpgrades: [...state.activeUpgrades, upgradeId],
  };
}

export function toggleUpgrade(state: GardenState, upgradeId: string): GardenState {
  if (!state.unlockedUpgrades.includes(upgradeId)) return state;

  const isActive = state.activeUpgrades.includes(upgradeId);

  return {
    ...state,
    activeUpgrades: isActive
      ? state.activeUpgrades.filter((id) => id !== upgradeId)
      : [...state.activeUpgrades, upgradeId],
  };
}

export function advanceTutorial(state: GardenState): GardenState {
  const nextBeat = Math.min(state.tutorialBeat + 1, 3) as 0 | 1 | 2 | 3;
  return {
    ...state,
    tutorialBeat: nextBeat,
    tutorialComplete: nextBeat === 3,
  };
}

export function setSeed(state: GardenState, seed: Seed): GardenState {
  return {
    ...state,
    seed,
  };
}
