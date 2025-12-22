// Golden module - thin wrapper for backwards compatibility
// Delegates to GoldenSystem (the new event-driven implementation)
// TODO: Remove this file in Phase 7 cleanup

import { goldenSystem, type GoldenLetter } from './systems/GoldenSystem.ts';
import { eventBus } from './core/EventBus.ts';
import { getTypingSpeed } from './typing.ts';

// Re-export types
export type { GoldenLetter };

// Legacy callbacks - still used by main.ts during dual-write phase
let onCaptureCallback: ((reward: number, wordIndex: number, charIndex: number) => void) | null = null;
let onExpiryCallback: (() => void) | null = null;

export function setOnGoldenCapture(callback: (reward: number, wordIndex: number, charIndex: number) => void): void {
  onCaptureCallback = callback;

  // Subscribe to GOLDEN_CAPTURED events and forward to legacy callback
  eventBus.on('GOLDEN_CAPTURED', (event) => {
    if (onCaptureCallback) {
      onCaptureCallback(event.reward, event.wordIndex, event.charIndex);
    }
  });
}

export function setOnGoldenExpiry(callback: () => void): void {
  onExpiryCallback = callback;

  // Subscribe to GOLDEN_EXPIRED events and forward to legacy callback
  eventBus.on('GOLDEN_EXPIRED', () => {
    if (onExpiryCallback) {
      onExpiryCallback();
    }
  });
}

export function setGoldenEnabled(enabled: boolean): void {
  goldenSystem.setEnabled(enabled);
}

export function setGoldenStartWordIndex(wordIndex: number): void {
  goldenSystem.setStartWordIndex(wordIndex);
}

export function setSpawnInterval(interval: number): void {
  goldenSystem.setSpawnInterval(interval);
}

export function resetSpawnInterval(): void {
  goldenSystem.resetSpawnInterval();
}

export function resetGolden(): void {
  goldenSystem.reset();
}

export function getActiveGolden(): GoldenLetter | null {
  return goldenSystem.getActive();
}

export function getFadeDuration(): number {
  return goldenSystem.getFadeDuration();
}

export function onTypo(): void {
  goldenSystem.onTypo();
}

export function expireGolden(): void {
  goldenSystem.expire();
}

// Called on each character typed - wrapper passes typing speed
export function onCharacterTyped(
  currentWordIndex: number,
  currentCharIndex: number,
  words: string[]
): void {
  goldenSystem.onCharacterTyped(currentWordIndex, currentCharIndex, words, getTypingSpeed());
}

export function isGoldenPosition(wordIndex: number, charIndex: number): boolean {
  return goldenSystem.isPosition(wordIndex, charIndex);
}

export function captureGolden(): void {
  goldenSystem.capture();
}

export function triggerFeverCapture(wordIndex: number, charIndex: number): void {
  goldenSystem.triggerFeverCapture(wordIndex, charIndex);
}

export function checkExpiry(): boolean {
  // This function is mostly deprecated - the system handles expiry internally
  // Kept for backwards compatibility
  return false;
}

export function checkPassed(currentWordIndex: number, currentCharIndex: number, words: string[]): boolean {
  return goldenSystem.checkPassed(currentWordIndex, currentCharIndex, words);
}
