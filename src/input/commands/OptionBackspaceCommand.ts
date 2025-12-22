// OptionBackspaceCommand - handles Option+Backspace to delete entire word
// Also respects word checkpoints

import type { InputCommand } from '../InputSystem.ts';
import type { TypingState } from '../../typing.ts';

export class OptionBackspaceCommand implements InputCommand {
  execute(state: TypingState): void {
    const wordIndex = state.currentWordIndex;
    const currentTyped = state.typed[wordIndex] ?? '';

    if (currentTyped.length > 0) {
      // Delete entire current word
      state.typed[wordIndex] = '';
      state.currentCharIndex = 0;
      state.mistaken[wordIndex] = false;
    } else if (wordIndex > 0) {
      // Already empty — go back and delete previous word (if mistaken)
      const prevIndex = wordIndex - 1;
      const prevWord = state.words[prevIndex] ?? '';
      const prevTyped = state.typed[prevIndex] ?? '';
      const prevCorrect = prevTyped === prevWord;

      if (state.mistaken[prevIndex] || !prevCorrect) {
        state.currentWordIndex = prevIndex;
        state.typed[prevIndex] = '';
        state.currentCharIndex = 0;
        state.mistaken[prevIndex] = false;
      }
    }
  }
}

// Factory function for InputSystem
export function createOptionBackspaceCommand(key: string, event: KeyboardEvent): OptionBackspaceCommand | null {
  if (key !== 'Backspace') return null;
  if (!event.altKey) return null; // Must have Option key

  return new OptionBackspaceCommand();
}
