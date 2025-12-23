// GreenSystem - Green letter management
// Extracted from green.ts as part of Game Programming Patterns refactor
// Uses EventBus instead of callbacks

import { eventBus } from '../core/EventBus.ts';

export interface GreenLetter {
  wordIndex: number;
  charIndex: number;
}

export class GreenSystem {
  private activeGreen: GreenLetter | null = null;

  // Set green letter position (deterministic, set by tutorial or endless mode)
  setPosition(wordIndex: number, charIndex: number): void {
    this.activeGreen = { wordIndex, charIndex };
  }

  // Get active green letter
  getActive(): GreenLetter | null {
    return this.activeGreen;
  }

  // Check if position matches green letter
  isPosition(wordIndex: number, charIndex: number): boolean {
    if (!this.activeGreen) return false;
    return this.activeGreen.wordIndex === wordIndex &&
           this.activeGreen.charIndex === charIndex;
  }

  // Capture green letter (triggers fever or QR modal)
  capture(): void {
    if (!this.activeGreen) return;

    this.activeGreen = null;

    // Emit event instead of callback
    eventBus.emit({ type: 'GREEN_CAPTURED' });
  }

  // Expire green letter (on typo in harsh mode)
  expire(): void {
    if (!this.activeGreen) return;

    this.activeGreen = null;

    eventBus.emit({ type: 'GREEN_EXPIRED' });
  }

  // Reset green letter state
  reset(): void {
    this.activeGreen = null;
  }
}

// Singleton instance
export const greenSystem = new GreenSystem();
