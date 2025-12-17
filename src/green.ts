// Green Letter System
// Spawns rare green letters that trigger fever rush mode

import { getTypingSpeed } from './typing.ts';
import { getGoldenStreak } from './sol.ts';

export interface GreenLetter {
  wordIndex: number;
  charIndex: number;
  spawnedAt: number;       // Timestamp for expiry check
  fadeDuration: number;    // Dynamic fade duration in ms
}

// Active green letter (one at a time)
let activeGreen: GreenLetter | null = null;

// Spawn configuration
const BASE_SPAWN_INTERVAL = 50;   // Base: spawn every ~50 words typed
const MIN_DISTANCE = 3;            // Minimum chars ahead
const MAX_DISTANCE = 15;           // Maximum chars ahead
const MISTAKE_COOLDOWN_MS = 2000;  // Can't spawn for 2s after a mistake
const STREAK_BONUS_PER_LEVEL = 0.05; // +5% spawn probability per streak level

// Track words typed since last spawn
let wordsSinceGreenSpawn = 0;

// Track last mistake for cooldown
let lastMistakeAt = 0;

// Callback for when green is captured (includes position for particles)
let onCaptureCallback: ((wordIndex: number, charIndex: number) => void) | null = null;

// Callback for when green expires (to trigger UI update)
let onExpiryCallback: (() => void) | null = null;

// Timer for scheduled expiry
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

export function setOnGreenCapture(callback: (wordIndex: number, charIndex: number) => void): void {
  onCaptureCallback = callback;
}

export function setOnGreenExpiry(callback: () => void): void {
  onExpiryCallback = callback;
}

export function resetGreen(): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  activeGreen = null;
  wordsSinceGreenSpawn = 0;
  lastMistakeAt = 0;
}

export function getActiveGreen(): GreenLetter | null {
  return activeGreen;
}

// Calculate dynamic fade duration based on typing speed
function calculateFadeDuration(): number {
  const baseDuration = 6000; // Longer than golden (6s vs 4s)
  const typingSpeed = getTypingSpeed();

  // Speed modifier: 5 cps = 1x, 10 cps = 2x faster fade
  const speedModifier = Math.max(0.5, Math.min(2, typingSpeed / 5));

  return baseDuration / speedModifier;
}

export function getFadeDuration(): number {
  return activeGreen?.fadeDuration ?? 6000;
}

// Speed up fade when player makes a typo
export function onTypo(): void {
  lastMistakeAt = Date.now();
  if (!activeGreen) return;
  // Cut remaining fade time by 25%
  activeGreen.fadeDuration = Math.max(500, activeGreen.fadeDuration * 0.75);

  // Reschedule timer to match new duration
  if (expiryTimer) clearTimeout(expiryTimer);
  const elapsed = Date.now() - activeGreen.spawnedAt;
  const remaining = Math.max(0, activeGreen.fadeDuration - elapsed);
  expiryTimer = setTimeout(() => {
    if (activeGreen) {
      activeGreen = null;
      expiryTimer = null;
      if (onExpiryCallback) onExpiryCallback();
    }
  }, remaining + 50);
}

// Instantly expire green when player skips a word with mistakes
export function expireGreen(): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  activeGreen = null;
}

// Convert word/char position to absolute character index
function toAbsoluteIndex(wordIndex: number, charIndex: number, words: string[]): number {
  let abs = 0;
  for (let i = 0; i < wordIndex; i++) {
    abs += (words[i]?.length ?? 0) + 1; // +1 for space
  }
  return abs + charIndex;
}

// Convert absolute index back to word/char position
function fromAbsoluteIndex(absIndex: number, words: string[]): { wordIndex: number; charIndex: number } | null {
  let remaining = absIndex;
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const wordLen = words[wordIndex]?.length ?? 0;
    if (remaining < wordLen) {
      return { wordIndex, charIndex: remaining };
    }
    remaining -= wordLen + 1; // +1 for space
  }
  return null;
}

// Calculate spawn threshold reduction from golden streak
// Higher streak = spawn sooner (reduce words needed)
function getStreakThresholdReduction(): number {
  const streakLevel = getGoldenStreak();
  // Each streak level reduces threshold by 5% (max 50% reduction at streak 10)
  return Math.min(0.5, streakLevel * STREAK_BONUS_PER_LEVEL);
}

// Called when a word is completed
export function onWordCompleted(): void {
  wordsSinceGreenSpawn++;
}

// Called to check if green should spawn (call after word completion)
export function checkGreenSpawn(
  currentWordIndex: number,
  currentCharIndex: number,
  words: string[]
): void {
  // Skip if green already active
  if (activeGreen) return;

  // Check for spawn (skip if in cooldown from recent mistake)
  const inCooldown = Date.now() - lastMistakeAt < MISTAKE_COOLDOWN_MS;
  if (inCooldown) return;

  // Calculate effective threshold (streak reduces it)
  const reduction = getStreakThresholdReduction();
  const effectiveThreshold = Math.floor(BASE_SPAWN_INTERVAL * (1 - reduction));

  // Check if enough words have been typed
  if (wordsSinceGreenSpawn < effectiveThreshold) return;

  // Spawn guaranteed once threshold is reached
  spawnGreen(currentWordIndex, currentCharIndex, words);
  wordsSinceGreenSpawn = 0;
}

function spawnGreen(
  currentWordIndex: number,
  currentCharIndex: number,
  words: string[]
): void {
  // Random distance between MIN and MAX
  const distance = MIN_DISTANCE + Math.floor(Math.random() * (MAX_DISTANCE - MIN_DISTANCE + 1));

  // Calculate target position
  const currentAbs = toAbsoluteIndex(currentWordIndex, currentCharIndex, words);
  const targetAbs = currentAbs + distance;
  const target = fromAbsoluteIndex(targetAbs, words);

  if (!target) return; // Not enough words ahead

  const fadeDuration = calculateFadeDuration();

  activeGreen = {
    wordIndex: target.wordIndex,
    charIndex: target.charIndex,
    spawnedAt: Date.now(),
    fadeDuration,
  };

  // Schedule expiry to match fade duration
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    if (activeGreen) {
      activeGreen = null;
      expiryTimer = null;
      if (onExpiryCallback) onExpiryCallback();
    }
  }, fadeDuration + 50); // Expire when fade animation completes
}

// Check if a position is the green letter
export function isGreenPosition(wordIndex: number, charIndex: number): boolean {
  if (!activeGreen) return false;
  return activeGreen.wordIndex === wordIndex && activeGreen.charIndex === charIndex;
}

// Called when player types the green character
export function captureGreen(): void {
  if (!activeGreen) return;

  // Clear expiry timer since we're capturing
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  const wordIndex = activeGreen.wordIndex;
  const charIndex = activeGreen.charIndex;
  activeGreen = null;

  if (onCaptureCallback) {
    onCaptureCallback(wordIndex, charIndex);
  }
}

// Check for expired green letters (call periodically or on render)
export function checkExpiry(): boolean {
  if (!activeGreen) return false;

  // Expiry based on dynamic fade duration
  if (Date.now() - activeGreen.spawnedAt > activeGreen.fadeDuration) {
    activeGreen = null;
    return true; // Was expired
  }
  return false;
}

// Check if green was passed (cursor went past it without capturing)
export function checkPassed(currentWordIndex: number, currentCharIndex: number, words: string[]): boolean {
  if (!activeGreen) return false;

  const currentAbs = toAbsoluteIndex(currentWordIndex, currentCharIndex, words);
  const greenAbs = toAbsoluteIndex(activeGreen.wordIndex, activeGreen.charIndex, words);

  if (currentAbs > greenAbs) {
    activeGreen = null;
    return true; // Was passed
  }
  return false;
}
