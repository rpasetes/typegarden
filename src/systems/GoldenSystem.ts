// GoldenSystem - Golden letter management
// Extracted from golden.ts as part of Game Programming Patterns refactor
// Uses EventBus instead of callbacks

import { eventBus } from '../core/EventBus.ts';

export interface GoldenLetter {
  wordIndex: number;
  charIndex: number;
  spawnedAt: number;
  reward: 1 | 2 | 3;
  fadeDuration: number;
}

export class GoldenSystem {
  private activeGolden: GoldenLetter | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  // Configuration
  private readonly DEFAULT_SPAWN_INTERVAL = 20;
  private readonly MIN_DISTANCE = 3;
  private readonly MAX_DISTANCE = 15;
  private readonly MISTAKE_COOLDOWN_MS = 2000;

  // State
  private spawnInterval = 20;
  private enabled = true;
  private startWordIndex = 0;
  private charsSinceSpawn = 0;
  private lastMistakeAt = 0;

  // Get active golden letter
  getActive(): GoldenLetter | null {
    return this.activeGolden;
  }

  // Get fade duration for CSS animation
  getFadeDuration(): number {
    return this.activeGolden?.fadeDuration ?? 4000;
  }

  // Check if position matches golden letter
  isPosition(wordIndex: number, charIndex: number): boolean {
    if (!this.activeGolden) return false;
    return this.activeGolden.wordIndex === wordIndex &&
           this.activeGolden.charIndex === charIndex;
  }

  // Configuration setters
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setStartWordIndex(wordIndex: number): void {
    this.startWordIndex = wordIndex;
  }

  setSpawnInterval(interval: number): void {
    this.spawnInterval = interval;
  }

  resetSpawnInterval(): void {
    this.spawnInterval = this.DEFAULT_SPAWN_INTERVAL;
  }

  // Reset all state
  reset(): void {
    this.clearExpiryTimer();
    this.activeGolden = null;
    this.charsSinceSpawn = 0;
    this.lastMistakeAt = 0;
    this.startWordIndex = 0;
  }

  // Called on each character typed
  onCharacterTyped(
    currentWordIndex: number,
    currentCharIndex: number,
    words: string[],
    typingSpeed: number
  ): void {
    if (!this.enabled) return;
    if (currentWordIndex < this.startWordIndex) return;

    this.charsSinceSpawn++;

    const inCooldown = Date.now() - this.lastMistakeAt < this.MISTAKE_COOLDOWN_MS;
    if (!this.activeGolden && this.charsSinceSpawn >= this.spawnInterval && !inCooldown) {
      this.spawn(currentWordIndex, currentCharIndex, words, typingSpeed);
      this.charsSinceSpawn = 0;
    }
  }

  // Handle typo - speed up fade
  onTypo(): void {
    this.lastMistakeAt = Date.now();
    if (!this.activeGolden) return;

    this.activeGolden.fadeDuration = Math.max(500, this.activeGolden.fadeDuration * 0.75);

    this.clearExpiryTimer();
    const elapsed = Date.now() - this.activeGolden.spawnedAt;
    const remaining = Math.max(0, this.activeGolden.fadeDuration - elapsed);

    this.expiryTimer = setTimeout(() => {
      if (this.activeGolden) {
        this.activeGolden = null;
        this.expiryTimer = null;
        eventBus.emit({ type: 'GOLDEN_EXPIRED' });
      }
    }, remaining + 50);
  }

  // Instantly expire golden
  expire(): void {
    this.clearExpiryTimer();
    this.activeGolden = null;
  }

  // Capture golden letter
  capture(): void {
    if (!this.activeGolden) return;

    this.clearExpiryTimer();

    const { reward, wordIndex, charIndex } = this.activeGolden;
    this.activeGolden = null;

    eventBus.emit({
      type: 'GOLDEN_CAPTURED',
      reward,
      wordIndex,
      charIndex,
    });
  }

  // Check if golden was passed (cursor went past it)
  checkPassed(currentWordIndex: number, currentCharIndex: number, words: string[]): boolean {
    if (!this.activeGolden) return false;

    const currentAbs = this.toAbsoluteIndex(currentWordIndex, currentCharIndex, words);
    const goldenAbs = this.toAbsoluteIndex(this.activeGolden.wordIndex, this.activeGolden.charIndex, words);

    if (currentAbs > goldenAbs) {
      this.activeGolden = null;
      return true;
    }
    return false;
  }

  // Trigger fever capture (every letter is golden in fever mode)
  triggerFeverCapture(wordIndex: number, charIndex: number): void {
    eventBus.emit({
      type: 'GOLDEN_CAPTURED',
      reward: 1 as const,
      wordIndex,
      charIndex,
    });
  }

  // Private helpers
  private spawn(
    currentWordIndex: number,
    currentCharIndex: number,
    words: string[],
    typingSpeed: number
  ): void {
    const distance = this.MIN_DISTANCE +
      Math.floor(Math.random() * (this.MAX_DISTANCE - this.MIN_DISTANCE + 1));

    const currentAbs = this.toAbsoluteIndex(currentWordIndex, currentCharIndex, words);
    const targetAbs = currentAbs + distance;
    const target = this.fromAbsoluteIndex(targetAbs, words);

    if (!target) return;

    const fadeDuration = this.calculateFadeDuration(typingSpeed);

    this.activeGolden = {
      wordIndex: target.wordIndex,
      charIndex: target.charIndex,
      spawnedAt: Date.now(),
      reward: this.getRewardForDistance(distance),
      fadeDuration,
    };

    eventBus.emit({
      type: 'GOLDEN_SPAWNED',
      wordIndex: target.wordIndex,
      charIndex: target.charIndex,
      reward: this.activeGolden.reward,
      fadeDuration,
    });

    this.clearExpiryTimer();
    this.expiryTimer = setTimeout(() => {
      if (this.activeGolden) {
        this.activeGolden = null;
        this.expiryTimer = null;
        eventBus.emit({ type: 'GOLDEN_EXPIRED' });
      }
    }, fadeDuration + 50);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private calculateFadeDuration(typingSpeed: number): number {
    const baseDuration = 4000;
    const speedModifier = Math.max(0.5, Math.min(2, typingSpeed / 5));
    return baseDuration / speedModifier;
  }

  private getRewardForDistance(distance: number): 1 | 2 | 3 {
    if (distance <= 5) return 1;
    if (distance <= 10) return 2;
    return 3;
  }

  private toAbsoluteIndex(wordIndex: number, charIndex: number, words: string[]): number {
    let abs = 0;
    for (let i = 0; i < wordIndex; i++) {
      abs += (words[i]?.length ?? 0) + 1;
    }
    return abs + charIndex;
  }

  private fromAbsoluteIndex(absIndex: number, words: string[]): { wordIndex: number; charIndex: number } | null {
    let remaining = absIndex;
    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const wordLen = words[wordIndex]?.length ?? 0;
      if (remaining < wordLen) {
        return { wordIndex, charIndex: remaining };
      }
      remaining -= wordLen + 1;
    }
    return null;
  }
}

// Singleton instance
export const goldenSystem = new GoldenSystem();
