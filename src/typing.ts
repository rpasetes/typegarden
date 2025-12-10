import type { GardenState } from './garden.ts';

export interface TypingState {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string[];
  errors: number;
  startTime: number | null;
  endTime: number | null;
}

export function createTypingState(words: string[]): TypingState {
  return {
    words,
    currentWordIndex: 0,
    currentCharIndex: 0,
    typed: words.map(() => ''),
    errors: 0,
    startTime: null,
    endTime: null,
  };
}

export function calculateWPM(state: TypingState): number {
  if (!state.startTime || !state.endTime) return 0;
  const minutes = (state.endTime - state.startTime) / 60000;
  const characters = state.typed.join(' ').length;
  return Math.round((characters / 5) / minutes);
}

export function calculateAccuracy(state: TypingState): number {
  let correct = 0;
  let total = 0;

  for (let i = 0; i < state.words.length; i++) {
    const word = state.words[i];
    const typed = state.typed[i];
    if (!word || !typed) continue;

    for (let j = 0; j < typed.length; j++) {
      total++;
      if (typed[j] === word[j]) {
        correct++;
      }
    }
  }

  return total === 0 ? 100 : Math.round((correct / total) * 100);
}

export function initTyping(_garden: GardenState): void {
  // Typing engine initialization will be implemented here
  // This is the scaffold — logic comes next
}
