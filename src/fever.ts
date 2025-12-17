// Fever Mode Controller
// Manages 50-word fever rush mode triggered by green letter capture

import { setSpawnInterval } from './golden.ts';

export type FeverMode = 'normal' | 'fever' | 'results';

export interface FeverState {
  mode: FeverMode;
  wordsCompleted: number;      // Words completed during fever (0-50)
  goldensCaptured: number;     // Golden letters captured during fever
  startTime: number | null;    // Timestamp when fever started
  endTime: number | null;      // Timestamp when fever ended
}

// Fever configuration
const FEVER_WORD_COUNT = 50;
const FEVER_GOLDEN_INTERVAL = 10; // 2x density (normal is 20)
const NORMAL_GOLDEN_INTERVAL = 20;

let state: FeverState = {
  mode: 'normal',
  wordsCompleted: 0,
  goldensCaptured: 0,
  startTime: null,
  endTime: null,
};

// Callbacks
let onFeverStartCallback: (() => void) | null = null;
let onFeverCompleteCallback: ((state: FeverState) => void) | null = null;

export function setOnFeverStart(callback: () => void): void {
  onFeverStartCallback = callback;
}

export function setOnFeverComplete(callback: (state: FeverState) => void): void {
  onFeverCompleteCallback = callback;
}

export function getFeverState(): FeverState {
  return { ...state };
}

export function isFeverMode(): boolean {
  return state.mode === 'fever';
}

export function isResultsMode(): boolean {
  return state.mode === 'results';
}

// Start fever mode (called when green letter is captured)
export function startFever(): void {
  if (state.mode !== 'normal') return;

  state = {
    mode: 'fever',
    wordsCompleted: 0,
    goldensCaptured: 0,
    startTime: Date.now(),
    endTime: null,
  };

  // Increase golden spawn rate (2x density)
  setSpawnInterval(FEVER_GOLDEN_INTERVAL);

  if (onFeverStartCallback) {
    onFeverStartCallback();
  }
}

// Track word completion during fever
export function onFeverWordComplete(): void {
  if (state.mode !== 'fever') return;

  state.wordsCompleted++;

  // Check if fever is complete (50 words)
  if (state.wordsCompleted >= FEVER_WORD_COUNT) {
    completeFever();
  }
}

// Track golden captures during fever
export function onFeverGoldenCapture(): void {
  if (state.mode !== 'fever') return;

  state.goldensCaptured++;
}

// Complete fever and transition to results mode
function completeFever(): void {
  if (state.mode !== 'fever') return;

  state.mode = 'results';
  state.endTime = Date.now();

  // Reset golden spawn rate to normal
  setSpawnInterval(NORMAL_GOLDEN_INTERVAL);

  if (onFeverCompleteCallback) {
    onFeverCompleteCallback(state);
  }
}

// Return to normal mode after results (called when player redeems sol)
export function exitFever(): void {
  state = {
    mode: 'normal',
    wordsCompleted: 0,
    goldensCaptured: 0,
    startTime: null,
    endTime: null,
  };

  // Ensure golden spawn rate is normal
  setSpawnInterval(NORMAL_GOLDEN_INTERVAL);
}

// Reset fever state (called on session start)
export function resetFever(): void {
  state = {
    mode: 'normal',
    wordsCompleted: 0,
    goldensCaptured: 0,
    startTime: null,
    endTime: null,
  };

  // Ensure golden spawn rate is normal
  setSpawnInterval(NORMAL_GOLDEN_INTERVAL);
}
