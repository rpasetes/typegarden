// Green module - thin wrapper for backwards compatibility
// Delegates to GreenSystem (the new event-driven implementation)
// TODO: Remove this file in Phase 7 cleanup

import { greenSystem, type GreenLetter } from './systems/GreenSystem.ts';
import { eventBus } from './core/EventBus.ts';

// Re-export types
export type { GreenLetter };

// Legacy callback - still used by main.ts during dual-write phase
let onCaptureCallback: (() => void) | null = null;

export function setOnGreenCapture(callback: () => void): void {
  onCaptureCallback = callback;

  // Subscribe to GREEN_CAPTURED events and forward to legacy callback
  // This bridges the old callback system with the new event system
  eventBus.on('GREEN_CAPTURED', () => {
    if (onCaptureCallback) {
      onCaptureCallback();
    }
  });
}

export function setGreenLetterPosition(wordIndex: number, charIndex: number): void {
  greenSystem.setPosition(wordIndex, charIndex);
}

export function getActiveGreen(): GreenLetter | null {
  return greenSystem.getActive();
}

export function isGreenPosition(wordIndex: number, charIndex: number): boolean {
  return greenSystem.isPosition(wordIndex, charIndex);
}

export function captureGreen(): void {
  greenSystem.capture();
}

export function resetGreen(): void {
  greenSystem.reset();
}
