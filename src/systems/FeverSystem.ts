// FeverSystem - Fever mode state and chain tracking
// Extracted from tutorial.ts as part of Game Programming Patterns refactor
// Uses EventBus instead of callbacks

import { eventBus } from '../core/EventBus.ts';
import type { FeverStats } from '../core/types.ts';

export class FeverSystem {
  private stats: FeverStats | null = null;

  // Start fever mode - initialize tracking
  start(): void {
    this.stats = {
      startTime: Date.now(),
      goldenCaptures: 0,
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      currentChain: 0,
      maxChain: 0,
    };

    eventBus.emit({ type: 'FEVER_STARTED' });
  }

  // End fever mode - emit final stats
  end(): void {
    if (!this.stats) return;

    const duration = Date.now() - this.stats.startTime;
    const minutes = duration / 60000;
    const wpm = minutes > 0 ? Math.round((this.stats.correctKeystrokes / 5) / minutes) : 0;
    const total = this.stats.correctKeystrokes + this.stats.incorrectKeystrokes;
    const accuracy = total > 0 ? Math.round((this.stats.correctKeystrokes / total) * 100) : 100;

    eventBus.emit({
      type: 'FEVER_ENDED',
      stats: { ...this.stats },
      wpm,
      accuracy,
    });
  }

  // Get current stats
  getStats(): FeverStats | null {
    return this.stats;
  }

  // Track golden capture during fever
  trackGoldenCapture(): void {
    if (this.stats) {
      this.stats.goldenCaptures++;
    }
  }

  // Track keystroke during fever
  trackKeystroke(correct: boolean): void {
    if (this.stats) {
      if (correct) {
        this.stats.correctKeystrokes++;
      } else {
        this.stats.incorrectKeystrokes++;
      }
    }
  }

  // Increment chain on correct keystroke
  incrementChain(): number {
    if (this.stats) {
      this.stats.currentChain++;
      this.stats.maxChain = Math.max(this.stats.maxChain, this.stats.currentChain);

      eventBus.emit({
        type: 'CHAIN_UPDATED',
        current: this.stats.currentChain,
        max: this.stats.maxChain,
      });

      return this.stats.currentChain;
    }
    return 0;
  }

  // Break chain on typo
  breakChain(): void {
    if (this.stats) {
      this.stats.currentChain = 0;

      eventBus.emit({
        type: 'CHAIN_UPDATED',
        current: 0,
        max: this.stats.maxChain,
      });
    }
  }

  // Get current chain count
  getCurrentChain(): number {
    return this.stats?.currentChain ?? 0;
  }

  // Get max chain count
  getMaxChain(): number {
    return this.stats?.maxChain ?? 0;
  }

  // Check if fever is active
  isActive(): boolean {
    return this.stats !== null;
  }

  // Reset (for tutorial restart)
  reset(): void {
    this.stats = null;
  }
}

// Singleton instance
export const feverSystem = new FeverSystem();
