// Golden Letter System
// Spawns golden letters ahead of cursor for bonus sol

export interface GoldenLetter {
  wordIndex: number;
  charIndex: number;
  spawnedAt: number;       // Timestamp for expiry check
  reward: 1 | 2 | 3;       // Sol reward based on distance at spawn
}

// Active golden letter (one at a time)
let activeGolden: GoldenLetter | null = null;

// Spawn configuration
const SPAWN_INTERVAL = 20;        // Spawn every ~20 characters typed
const MIN_DISTANCE = 3;           // Minimum chars ahead
const MAX_DISTANCE = 15;          // Maximum chars ahead
const EXPIRY_MS = 5000;           // Fade after 5 seconds

// Track characters typed since last spawn
let charsSinceSpawn = 0;

// Callback for when golden is captured
let onCaptureCallback: ((reward: number, wordIndex: number, charIndex: number) => void) | null = null;

export function setOnGoldenCapture(callback: (reward: number, wordIndex: number, charIndex: number) => void): void {
  onCaptureCallback = callback;
}

export function resetGolden(): void {
  activeGolden = null;
  charsSinceSpawn = 0;
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
  charsSinceSpawn++;

  // Check for spawn
  if (!activeGolden && charsSinceSpawn >= SPAWN_INTERVAL) {
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

  activeGolden = {
    wordIndex: target.wordIndex,
    charIndex: target.charIndex,
    spawnedAt: Date.now(),
    reward: getRewardForDistance(distance),
  };
}

// Check if a position is the golden letter
export function isGoldenPosition(wordIndex: number, charIndex: number): boolean {
  if (!activeGolden) return false;
  return activeGolden.wordIndex === wordIndex && activeGolden.charIndex === charIndex;
}

// Called when player types the golden character
export function captureGolden(): void {
  if (!activeGolden) return;

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

  if (Date.now() - activeGolden.spawnedAt > EXPIRY_MS) {
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
