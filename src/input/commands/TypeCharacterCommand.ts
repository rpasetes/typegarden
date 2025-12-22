// TypeCharacterCommand - handles typing a single character
// Emits KEYSTROKE event with correctness info

import type { InputCommand } from '../InputSystem.ts';
import type { TypingState } from '../../typing.ts';
import { eventBus } from '../../core/EventBus.ts';
import { isGoldenPosition, captureGolden, onCharacterTyped, expireGolden, triggerFeverCapture } from '../../golden.ts';
import { isGreenPosition, captureGreen } from '../../green.ts';
import { getCurrentPhase, incrementChain, breakChain } from '../../tutorial.ts';

export class TypeCharacterCommand implements InputCommand {
  constructor(private char: string) {}

  execute(state: TypingState): void {
    const wordIndex = state.currentWordIndex;
    const currentWord = state.words[wordIndex];
    const currentTyped = state.typed[wordIndex] ?? '';

    if (!currentWord) return;

    // Add character to typed
    state.typed[wordIndex] = currentTyped + this.char;
    state.currentCharIndex = currentTyped.length + 1;

    // Check if correct
    const expectedChar = currentWord[currentTyped.length];
    const isCorrect = this.char === expectedChar;
    const isFever = getCurrentPhase() === 'fever';

    if (isCorrect) {
      state.correctKeystrokes++;

      // Fever mode: every correct keystroke is a golden capture
      if (isFever) {
        triggerFeverCapture(wordIndex, currentTyped.length);
        incrementChain();
      }

      // Check for green letter capture
      if (isGreenPosition(wordIndex, currentTyped.length)) {
        captureGreen();
      }

      // Check for golden letter capture
      if (isGoldenPosition(wordIndex, currentTyped.length)) {
        captureGolden();
      }
    } else {
      state.incorrectKeystrokes++;
      state.errors++;

      // Break chain in fever mode
      if (isFever) {
        breakChain();
      }

      // Mistyping the golden letter loses it
      if (isGoldenPosition(wordIndex, currentTyped.length)) {
        expireGolden();
      }
    }

    // Emit keystroke event
    eventBus.emit({
      type: 'KEYSTROKE',
      key: this.char,
      correct: isCorrect,
      wordIndex,
      charIndex: currentTyped.length,
    });

    // Notify golden system
    onCharacterTyped(wordIndex, currentTyped.length, state.words);
  }
}

// Factory function for InputSystem
export function createTypeCharacterCommand(key: string, event: KeyboardEvent): TypeCharacterCommand | null {
  // Only handle single printable characters without modifiers
  if (key.length !== 1) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  return new TypeCharacterCommand(key);
}
