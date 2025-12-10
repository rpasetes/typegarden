import type { GardenState } from './garden.ts';
import { renderWords, setCursorActive } from './ui.ts';

export interface TypingState {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string[];
  errors: number;
  startTime: number | null;
  endTime: number | null;
}

export type TypingCompleteCallback = (state: TypingState) => void;

let currentState: TypingState | null = null;
let onCompleteCallback: TypingCompleteCallback | null = null;

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
  if (!state.startTime) return 0;
  const endTime = state.endTime ?? Date.now();
  const minutes = (endTime - state.startTime) / 60000;
  if (minutes === 0) return 0;
  const characters = state.typed.join(' ').length;
  return Math.round(characters / 5 / minutes);
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

function handleKeydown(e: KeyboardEvent): void {
  if (!currentState) return;

  // Ignore modifier keys and special combinations
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const { key } = e;

  // Mark cursor as active (stop blinking)
  setCursorActive();

  // Start timer on first keystroke
  if (currentState.startTime === null && key.length === 1) {
    currentState.startTime = Date.now();
  }

  // Handle backspace
  if (key === 'Backspace') {
    e.preventDefault();
    handleBackspace();
    renderWords(currentState);
    return;
  }

  // Handle space — advance to next word
  if (key === ' ') {
    e.preventDefault();
    handleSpace();
    renderWords(currentState);
    return;
  }

  // Handle regular character input
  if (key.length === 1) {
    e.preventDefault();
    handleCharacter(key);
    renderWords(currentState);
    return;
  }
}

function handleBackspace(): void {
  if (!currentState) return;

  const currentTyped = currentState.typed[currentState.currentWordIndex] ?? '';

  if (currentTyped.length > 0) {
    // Delete last character from current word
    currentState.typed[currentState.currentWordIndex] = currentTyped.slice(0, -1);
    currentState.currentCharIndex = Math.max(0, currentState.currentCharIndex - 1);
  }
  // Note: Can't go back to previous words (per spec)
}

function handleSpace(): void {
  if (!currentState) return;

  const currentTyped = currentState.typed[currentState.currentWordIndex] ?? '';

  // Only advance if something was typed
  if (currentTyped.length === 0) return;

  // Check if we're at the last word
  if (currentState.currentWordIndex >= currentState.words.length - 1) {
    // Complete the run
    completeRun();
    return;
  }

  // Advance to next word
  currentState.currentWordIndex++;
  currentState.currentCharIndex = 0;
}

function handleCharacter(char: string): void {
  if (!currentState) return;

  const wordIndex = currentState.currentWordIndex;
  const currentWord = currentState.words[wordIndex];
  const currentTyped = currentState.typed[wordIndex] ?? '';

  if (!currentWord) return;

  // Add character to typed
  currentState.typed[wordIndex] = currentTyped + char;
  currentState.currentCharIndex = currentTyped.length + 1;

  // Track errors
  const expectedChar = currentWord[currentTyped.length];
  if (char !== expectedChar) {
    currentState.errors++;
  }

  // Auto-complete: if last word and typed length matches word length
  const isLastWord = wordIndex === currentState.words.length - 1;
  const newTypedLength = currentTyped.length + 1;
  if (isLastWord && newTypedLength >= currentWord.length) {
    completeRun();
  }
}

function completeRun(): void {
  if (!currentState) return;

  currentState.endTime = Date.now();

  // Remove keyboard listener
  document.removeEventListener('keydown', handleKeydown);

  // Trigger callback
  if (onCompleteCallback) {
    onCompleteCallback(currentState);
  }
}

export function startTyping(
  words: string[],
  onComplete?: TypingCompleteCallback
): TypingState {
  // Clean up previous listener if any
  document.removeEventListener('keydown', handleKeydown);

  // Create fresh state
  currentState = createTypingState(words);
  onCompleteCallback = onComplete ?? null;

  // Render initial state
  renderWords(currentState);

  // Attach keyboard listener
  document.addEventListener('keydown', handleKeydown);

  return currentState;
}

export function getTypingState(): TypingState | null {
  return currentState;
}

export function initTyping(_garden: GardenState): void {
  // This will be called from main.ts
  // The actual typing session is started via startTyping()
}
