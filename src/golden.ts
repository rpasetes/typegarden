// Golden Letter System
// Spawns golden letters ahead of cursor for bonus sol

import { getTypingSpeed } from './typing.ts';

export interface GoldenLetter {
  wordIndex: number;
  charIndex: number;
  spawnedAt: number;       // Timestamp for expiry check
  reward: 1 | 2 | 3;       // Sol reward based on distance at spawn
  fadeDuration: number;    // Dynamic fade duration in ms
}

// Active golden letter (one at a time)
let activeGolden: GoldenLetter | null = null;

// Spawn configuration
const DEFAULT_SPAWN_INTERVAL = 20; // Spawn every ~20 characters typed
const MIN_DISTANCE = 3;            // Minimum chars ahead
const MAX_DISTANCE = 15;           // Maximum chars ahead
const MISTAKE_COOLDOWN_MS = 2000;  // Can't spawn for 2s after a mistake

// Configurable spawn interval (for fever mode 2x density)
let spawnInterval = DEFAULT_SPAWN_INTERVAL;

// Enable/disable golden spawning (for tutorial phases)
let goldenEnabled = true;

// Minimum word index before golden can spawn (for tutorial delayed start)
let goldenStartWordIndex = 0;

// Track characters typed since last spawn
let charsSinceSpawn = 0;

// Track last mistake for cooldown
let lastMistakeAt = 0;

// Callback for when golden is captured (includes position for particles)
let onCaptureCallback: ((reward: number, wordIndex: number, charIndex: number) => void) | null = null;

// Callback for when golden expires (to trigger UI update)
let onExpiryCallback: (() => void) | null = null;

// Timer for scheduled expiry
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

export function setOnGoldenCapture(callback: (reward: number, wordIndex: number, charIndex: number) => void): void {
  onCaptureCallback = callback;
}

export function setOnGoldenExpiry(callback: () => void): void {
  onExpiryCallback = callback;
}

export function setGoldenEnabled(enabled: boolean): void {
  goldenEnabled = enabled;
}

export function setGoldenStartWordIndex(wordIndex: number): void {
  goldenStartWordIndex = wordIndex;
}

export function setSpawnInterval(interval: number): void {
  spawnInterval = interval;
}

export function resetSpawnInterval(): void {
  spawnInterval = DEFAULT_SPAWN_INTERVAL;
}

export function resetGolden(): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  activeGolden = null;
  charsSinceSpawn = 0;
  lastMistakeAt = 0;
  goldenStartWordIndex = 0;
}

export function getActiveGolden(): GoldenLetter | null {
  return activeGolden;
}

// Calculate reward tier based on distance (farther = harder = more reward)
function getRewardForDistance(distance: number): 1 | 2 | 3 {
  if (distance <= 5) return 1;      // Easy: 3-5 chars
  if (distance <= 10) return 2;     // Medium: 6-10 chars
  return 3;                          // Hard: 11-15 chars
}

// Calculate dynamic fade duration based on typing speed only
function calculateFadeDuration(): number {
  const baseDuration = 4000;
  const typingSpeed = getTypingSpeed();

  // Speed modifier: 5 cps = 1x, 10 cps = 2x faster fade
  const speedModifier = Math.max(0.5, Math.min(2, typingSpeed / 5));

  return baseDuration / speedModifier;
}

export function getFadeDuration(): number {
  return activeGolden?.fadeDuration ?? 4000;
}

// Speed up fade when player makes a typo
export function onTypo(): void {
  lastMistakeAt = Date.now();
  if (!activeGolden) return;
  // Cut remaining fade time by 25%
  activeGolden.fadeDuration = Math.max(500, activeGolden.fadeDuration * 0.75);

  // Reschedule timer to match new duration
  if (expiryTimer) clearTimeout(expiryTimer);
  const elapsed = Date.now() - activeGolden.spawnedAt;
  const remaining = Math.max(0, activeGolden.fadeDuration - elapsed);
  expiryTimer = setTimeout(() => {
    if (activeGolden) {
      activeGolden = null;
      expiryTimer = null;
      if (onExpiryCallback) onExpiryCallback();
    }
  }, remaining + 50);
}

// Instantly expire golden when player skips a word with mistakes
export function expireGolden(): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  activeGolden = null;
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

// Called on each character typed
export function onCharacterTyped(
  currentWordIndex: number,
  currentCharIndex: number,
  words: string[]
): void {
  // Skip if golden spawning is disabled (tutorial intro phase)
  if (!goldenEnabled) return;

  // Skip if we haven't reached the start word index yet (tutorial delayed start)
  if (currentWordIndex < goldenStartWordIndex) return;

  charsSinceSpawn++;

  // Check for spawn (skip if in cooldown from recent mistake)
  const inCooldown = Date.now() - lastMistakeAt < MISTAKE_COOLDOWN_MS;
  if (!activeGolden && charsSinceSpawn >= spawnInterval && !inCooldown) {
    spawnGolden(currentWordIndex, currentCharIndex, words);
    charsSinceSpawn = 0;
  }
}

function spawnGolden(
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

  activeGolden = {
    wordIndex: target.wordIndex,
    charIndex: target.charIndex,
    spawnedAt: Date.now(),
    reward: getRewardForDistance(distance),
    fadeDuration,
  };

  // Schedule expiry to match fade duration
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => {
    if (activeGolden) {
      activeGolden = null;
      expiryTimer = null;
      if (onExpiryCallback) onExpiryCallback();
    }
  }, fadeDuration + 50); // Expire when fade animation completes
}

// Check if a position is the golden letter
export function isGoldenPosition(wordIndex: number, charIndex: number): boolean {
  if (!activeGolden) return false;
  return activeGolden.wordIndex === wordIndex && activeGolden.charIndex === charIndex;
}

// Called when player types the golden character
export function captureGolden(): void {
  if (!activeGolden) return;

  // Clear expiry timer since we're capturing
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  const reward = activeGolden.reward;
  const wordIndex = activeGolden.wordIndex;
  const charIndex = activeGolden.charIndex;
  activeGolden = null;

  if (onCaptureCallback) {
    onCaptureCallback(reward, wordIndex, charIndex);
  }
}

// Check for expired golden letters (call periodically or on render)
export function checkExpiry(): boolean {
  if (!activeGolden) return false;

  // Expiry based on dynamic fade duration
  if (Date.now() - activeGolden.spawnedAt > activeGolden.fadeDuration) {
    activeGolden = null;
    return true; // Was expired
  }
  return false;
}

// Check if golden was passed (cursor went past it without capturing)
export function checkPassed(currentWordIndex: number, currentCharIndex: number, words: string[]): boolean {
  if (!activeGolden) return false;

  const currentAbs = toAbsoluteIndex(currentWordIndex, currentCharIndex, words);
  const goldenAbs = toAbsoluteIndex(activeGolden.wordIndex, activeGolden.charIndex, words);

  if (currentAbs > goldenAbs) {
    activeGolden = null;
    return true; // Was passed
  }
  return false;
}
