import type { GardenState } from './garden.ts';
import { renderWords, setCursorActive } from './ui.ts';

export interface TypingState {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string[];
  mistaken: boolean[];  // tracks which words have errors or were incomplete
  errors: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
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
    mistaken: words.map(() => false),
    errors: 0,
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
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
  const total = state.correctKeystrokes + state.incorrectKeystrokes;
  if (total === 0) return 100;
  return Math.round((state.correctKeystrokes / total) * 100);
}

function handleKeydown(e: KeyboardEvent): void {
  if (!currentState) return;

  const { key } = e;

  // Mark cursor as active (stop blinking)
  setCursorActive();

  // Handle Option+Backspace (delete entire word)
  if (key === 'Backspace' && e.altKey) {
    e.preventDefault();
    handleOptionBackspace();
    renderWords(currentState);
    return;
  }

  // Ignore other modifier key combinations
  if (e.ctrlKey || e.metaKey || e.altKey) return;

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

function isWordCorrect(wordIndex: number): boolean {
  if (!currentState) return false;
  const word = currentState.words[wordIndex] ?? '';
  const typed = currentState.typed[wordIndex] ?? '';
  return typed === word;
}

function handleBackspace(): void {
  if (!currentState) return;

  const wordIndex = currentState.currentWordIndex;
  const currentTyped = currentState.typed[wordIndex] ?? '';

  if (currentTyped.length > 0) {
    // Delete last character from current word
    currentState.typed[wordIndex] = currentTyped.slice(0, -1);
    currentState.currentCharIndex = Math.max(0, currentState.currentCharIndex - 1);

    // Clear mistaken flag if we're editing this word
    currentState.mistaken[wordIndex] = false;
  } else if (wordIndex > 0) {
    // At start of word with nothing typed — try to go back
    const prevIndex = wordIndex - 1;

    // Can only go back if previous word is mistaken (not a checkpoint)
    if (currentState.mistaken[prevIndex] || !isWordCorrect(prevIndex)) {
      currentState.currentWordIndex = prevIndex;
      const prevTyped = currentState.typed[prevIndex] ?? '';
      currentState.currentCharIndex = prevTyped.length;
      // Clear mistaken flag — player is correcting it
      currentState.mistaken[prevIndex] = false;
    }
    // If previous word is correct, do nothing (checkpoint)
  }
}

function handleOptionBackspace(): void {
  if (!currentState) return;

  const wordIndex = currentState.currentWordIndex;
  const currentTyped = currentState.typed[wordIndex] ?? '';

  if (currentTyped.length > 0) {
    // Delete entire current word
    currentState.typed[wordIndex] = '';
    currentState.currentCharIndex = 0;
    currentState.mistaken[wordIndex] = false;
  } else if (wordIndex > 0) {
    // Already empty — go back and delete previous word (if mistaken)
    const prevIndex = wordIndex - 1;

    if (currentState.mistaken[prevIndex] || !isWordCorrect(prevIndex)) {
      currentState.currentWordIndex = prevIndex;
      currentState.typed[prevIndex] = '';
      currentState.currentCharIndex = 0;
      currentState.mistaken[prevIndex] = false;
    }
  }
}

function handleSpace(): void {
  if (!currentState) return;

  const wordIndex = currentState.currentWordIndex;
  const currentWord = currentState.words[wordIndex] ?? '';
  const currentTyped = currentState.typed[wordIndex] ?? '';

  // Only advance if something was typed
  if (currentTyped.length === 0) return;

  // Check if word is mistaken (incomplete or has errors)
  const isIncomplete = currentTyped.length < currentWord.length;
  const hasErrors = currentTyped.split('').some((char, i) => char !== currentWord[i]);

  if (isIncomplete || hasErrors) {
    currentState.mistaken[wordIndex] = true;
  }

  // Check if we're at the last word
  if (wordIndex >= currentState.words.length - 1) {
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

  // Track keystrokes
  const expectedChar = currentWord[currentTyped.length];
  if (char === expectedChar) {
    currentState.correctKeystrokes++;
  } else {
    currentState.incorrectKeystrokes++;
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
