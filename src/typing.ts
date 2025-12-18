import type { GardenState } from './garden.ts';
import { renderWords, setCursorActive } from './ui.ts';
import { generateWords } from './words.ts';
import { onCharacterTyped, isGoldenPosition, captureGolden, checkPassed, resetGolden, onTypo, expireGolden, triggerFeverCapture } from './golden.ts';
import { isGreenPosition, captureGreen } from './green.ts';
import { getCurrentPhase, incrementChain, breakChain } from './tutorial.ts';

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
  activeTime: number;  // accumulated active typing time (excludes AFK gaps)
  lastKeystrokeTime: number | null;  // for tracking gaps between keystrokes
}

export type TypingCompleteCallback = (state: TypingState) => void;
export type WordCompleteCallback = () => void;
export type KeystrokeCallback = (correct: boolean) => void;

let currentState: TypingState | null = null;
let onCompleteCallback: TypingCompleteCallback | null = null;
let onWordCompleteCallback: WordCompleteCallback | null = null;
let onKeystrokeCallback: KeystrokeCallback | null = null;

// Tutorial mode flag - when true, don't generate endless words
let tutorialMode = false;

// Remaining tutorial sentences to append progressively
let remainingTutorialSentences: string[][] = [];

// Append next sentence when this many words remaining
const TUTORIAL_APPEND_THRESHOLD = 2;

// Split words into sentences (by punctuation endings)
function splitIntoSentences(words: string[]): string[][] {
  const sentences: string[][] = [];
  let currentSentence: string[] = [];

  for (const word of words) {
    currentSentence.push(word);
    // End sentence on . ! ?
    if (/[.!?]$/.test(word)) {
      sentences.push(currentSentence);
      currentSentence = [];
    }
  }

  // Don't forget trailing words without punctuation
  if (currentSentence.length > 0) {
    sentences.push(currentSentence);
  }

  return sentences;
}

// Max gap between keystrokes before considered AFK (5 seconds)
const AFK_THRESHOLD_MS = 5000;

// Typing speed tracking (rolling window)
const SPEED_WINDOW_SIZE = 15;
const keystrokeTimestamps: number[] = [];

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
    activeTime: 0,
    lastKeystrokeTime: null,
  };
}

export function appendWords(newWords: string[]): void {
  if (!currentState) return;

  currentState.words.push(...newWords);
  currentState.typed.push(...newWords.map(() => ''));
  currentState.mistaken.push(...newWords.map(() => false));
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

export function getTypingSpeed(): number {
  if (keystrokeTimestamps.length < 2) return 0;

  const now = Date.now();
  const recentStrokes = keystrokeTimestamps.filter(ts => now - ts < 5000);

  if (recentStrokes.length < 2) return 0;

  const timeSpan = now - recentStrokes[0]!;
  if (timeSpan === 0) return 0;

  const charsPerMs = recentStrokes.length / timeSpan;
  return charsPerMs * 1000;
}

function trackActiveTime(): void {
  if (!currentState) return;

  const now = Date.now();

  if (currentState.lastKeystrokeTime !== null) {
    const gap = now - currentState.lastKeystrokeTime;
    // Only count time if gap is within threshold (not AFK)
    if (gap <= AFK_THRESHOLD_MS) {
      currentState.activeTime += gap;
    }
  }

  currentState.lastKeystrokeTime = now;
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

  // Track active typing time (excludes AFK gaps)
  trackActiveTime();

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
    // Skipping with mistakes instantly expires any active golden
    expireGolden();
  } else if (!currentState.mistaken[wordIndex]) {
    // Word completed correctly AND was never marked as mistaken - trigger callback
    if (onWordCompleteCallback) {
      onWordCompleteCallback();
    }
  }

  // Advance to next word
  currentState.currentWordIndex++;
  currentState.currentCharIndex = 0;

  // Check if golden letter was passed (skipped without capturing)
  checkPassed(currentState.currentWordIndex, currentState.currentCharIndex, currentState.words);

  // Check if we need more words
  const wordsRemaining = currentState.words.length - currentState.currentWordIndex;

  if (tutorialMode) {
    // Tutorial: append next sentence from remaining pool
    if (wordsRemaining < TUTORIAL_APPEND_THRESHOLD && remainingTutorialSentences.length > 0) {
      const nextSentence = remainingTutorialSentences.shift()!;
      appendWords(nextSentence);
    }

    // Check if tutorial is complete (no more words and no sentences remaining)
    if (currentState.currentWordIndex >= currentState.words.length && remainingTutorialSentences.length === 0) {
      if (onCompleteCallback) {
        onCompleteCallback(currentState);
      }
      return;
    }
  } else {
    // Endless mode: generate random words
    if (wordsRemaining < 10) {
      const newWords = generateWords({ type: 'common', count: 15 });
      appendWords(newWords);
    }
  }
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
  const isFever = getCurrentPhase() === 'fever';

  if (char === expectedChar) {
    currentState.correctKeystrokes++;

    // Track keystroke timing for speed calculation
    keystrokeTimestamps.push(Date.now());
    if (keystrokeTimestamps.length > SPEED_WINDOW_SIZE) {
      keystrokeTimestamps.shift();
    }

    // In fever mode, every correct keystroke is a golden capture
    if (isFever) {
      triggerFeverCapture(wordIndex, currentTyped.length);
      incrementChain();
    }

    // Notify keystroke callback (for fever stats)
    if (onKeystrokeCallback) {
      onKeystrokeCallback(true);
    }

    // Check for green letter capture (triggers fever or QR modal)
    let greenCaptured = false;
    if (isGreenPosition(wordIndex, currentTyped.length)) {
      captureGreen();
      greenCaptured = true;
    }

    // Check for golden letter capture (only on correct keystroke)
    if (isGoldenPosition(wordIndex, currentTyped.length)) {
      captureGolden();
    }

    // If green was captured, skip tutorial completion (green callback handles transition)
    if (greenCaptured) {
      return;
    }
  } else {
    currentState.incorrectKeystrokes++;
    currentState.errors++;
    onTypo();

    // Break chain in fever mode
    if (isFever) {
      breakChain();
    }

    // Notify keystroke callback (for fever stats)
    if (onKeystrokeCallback) {
      onKeystrokeCallback(false);
    }

    // Mistyping the golden letter itself loses the bonus entirely
    if (isGoldenPosition(wordIndex, currentTyped.length)) {
      expireGolden();
    }
  }

  // Notify golden system of character typed (for spawn timing)
  onCharacterTyped(wordIndex, currentTyped.length, currentState.words);

  // In tutorial mode, check if we just completed the final word
  if (tutorialMode && char === expectedChar) {
    const newTyped = currentState.typed[wordIndex] ?? '';
    const isLastWord = wordIndex === currentState.words.length - 1;
    const isWordComplete = newTyped.length === currentWord.length;

    if (isLastWord && isWordComplete) {
      // Final character of tutorial typed - trigger completion immediately
      if (onWordCompleteCallback) {
        onWordCompleteCallback();
      }
      if (onCompleteCallback) {
        onCompleteCallback(currentState);
      }
    }
  }
}

export interface StartTypingOptions {
  onWordComplete?: WordCompleteCallback;
  onComplete?: TypingCompleteCallback;
  onKeystroke?: KeystrokeCallback;
  isTutorial?: boolean;
}

export function startTyping(
  words: string[],
  options: StartTypingOptions | WordCompleteCallback = {}
): TypingState {
  // Clean up previous listener if any
  document.removeEventListener('keydown', handleKeydown);

  // Handle legacy signature (just callback)
  const opts: StartTypingOptions = typeof options === 'function'
    ? { onWordComplete: options }
    : options;

  tutorialMode = opts.isTutorial ?? false;

  // For tutorial mode, chunk by sentences - start with first sentence, store rest
  let initialWords = words;
  remainingTutorialSentences = [];

  if (tutorialMode) {
    const sentences = splitIntoSentences(words);
    if (sentences.length > 1) {
      initialWords = sentences[0] ?? [];
      remainingTutorialSentences = sentences.slice(1);
    }
  }

  // Create fresh state
  currentState = createTypingState(initialWords);
  onWordCompleteCallback = opts.onWordComplete ?? null;
  onCompleteCallback = opts.onComplete ?? null;
  onKeystrokeCallback = opts.onKeystroke ?? null;

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
