// SpaceCommand - handles advancing to next word
// Emits WORD_COMPLETED event, checks for passed golden letters

import type { InputCommand } from '../InputSystem.ts';
import type { TypingState } from '../../typing.ts';
import { eventBus } from '../../core/EventBus.ts';
import { expireGolden, checkPassed } from '../../golden.ts';

export class SpaceCommand implements InputCommand {
  execute(state: TypingState): void {
    const wordIndex = state.currentWordIndex;
    const currentWord = state.words[wordIndex] ?? '';
    const currentTyped = state.typed[wordIndex] ?? '';

    // Only advance if something was typed
    if (currentTyped.length === 0) return;

    // Check if word is mistaken (incomplete or has errors)
    const isIncomplete = currentTyped.length < currentWord.length;
    const hasErrors = currentTyped.split('').some((char, i) => char !== currentWord[i]);

    if (isIncomplete || hasErrors) {
      state.mistaken[wordIndex] = true;
      // Skipping with mistakes instantly expires any active golden
      expireGolden();
    } else if (!state.mistaken[wordIndex]) {
      // Word completed correctly AND was never marked as mistaken
      eventBus.emit({
        type: 'WORD_COMPLETED',
        wordIndex,
        word: currentWord,
        correct: true,
      });
    }

    // Advance to next word
    state.currentWordIndex++;
    state.currentCharIndex = 0;

    // Check if golden letter was passed (skipped without capturing)
    checkPassed(state.currentWordIndex, state.currentCharIndex, state.words);
  }
}

// Factory function for InputSystem
export function createSpaceCommand(key: string, event: KeyboardEvent): SpaceCommand | null {
  if (key !== ' ') return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  return new SpaceCommand();
}
