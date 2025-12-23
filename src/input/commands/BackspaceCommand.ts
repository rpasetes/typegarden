// BackspaceCommand - handles deleting a character or navigating back
// Respects word checkpoints (can't go back past correct words)

import type { InputCommand } from '../InputSystem.ts';
import type { TypingState } from '../../typing.ts';

export class BackspaceCommand implements InputCommand {
  execute(state: TypingState): void {
    const wordIndex = state.currentWordIndex;
    const currentTyped = state.typed[wordIndex] ?? '';

    if (currentTyped.length > 0) {
      // Delete last character from current word
      state.typed[wordIndex] = currentTyped.slice(0, -1);
      state.currentCharIndex = Math.max(0, state.currentCharIndex - 1);

      // Clear mistaken flag if we're editing this word
      state.mistaken[wordIndex] = false;
    } else if (wordIndex > 0) {
      // At start of word with nothing typed — try to go back
      const prevIndex = wordIndex - 1;
      const prevWord = state.words[prevIndex] ?? '';
      const prevTyped = state.typed[prevIndex] ?? '';
      const prevCorrect = prevTyped === prevWord;

      // Can only go back if previous word is mistaken (not a checkpoint)
      if (state.mistaken[prevIndex] || !prevCorrect) {
        state.currentWordIndex = prevIndex;
        state.currentCharIndex = prevTyped.length;
        // Clear mistaken flag — player is correcting it
        state.mistaken[prevIndex] = false;
      }
      // If previous word is correct, do nothing (checkpoint)
    }
  }
}

// Factory function for InputSystem
export function createBackspaceCommand(key: string, event: KeyboardEvent): BackspaceCommand | null {
  if (key !== 'Backspace') return null;
  if (event.altKey) return null; // Option+Backspace is handled separately
  if (event.ctrlKey || event.metaKey) return null;

  return new BackspaceCommand();
}
