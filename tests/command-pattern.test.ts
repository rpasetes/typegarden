// Command Pattern Unit Tests
// Tests the command pattern in isolation without production imports

import { test, expect, describe } from 'bun:test';

// Minimal TypingState for testing
interface TestTypingState {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string[];
  mistaken: boolean[];
  correctKeystrokes: number;
  incorrectKeystrokes: number;
}

// Command interface (mirrors InputCommand)
interface TestCommand {
  execute(state: TestTypingState): void;
}

// Pure TypeCharacterCommand implementation (no side effects)
class TypeCharacterCommand implements TestCommand {
  constructor(private char: string) {}

  execute(state: TestTypingState): void {
    const wordIndex = state.currentWordIndex;
    const currentWord = state.words[wordIndex];
    const currentTyped = state.typed[wordIndex] ?? '';

    if (!currentWord) return;

    state.typed[wordIndex] = currentTyped + this.char;
    state.currentCharIndex = currentTyped.length + 1;

    const expectedChar = currentWord[currentTyped.length];
    if (this.char === expectedChar) {
      state.correctKeystrokes++;
    } else {
      state.incorrectKeystrokes++;
    }
  }
}

// Pure BackspaceCommand implementation
class BackspaceCommand implements TestCommand {
  execute(state: TestTypingState): void {
    const wordIndex = state.currentWordIndex;
    const currentTyped = state.typed[wordIndex] ?? '';

    if (currentTyped.length > 0) {
      state.typed[wordIndex] = currentTyped.slice(0, -1);
      state.currentCharIndex = Math.max(0, state.currentCharIndex - 1);
      state.mistaken[wordIndex] = false;
    } else if (wordIndex > 0) {
      const prevIndex = wordIndex - 1;
      const prevWord = state.words[prevIndex] ?? '';
      const prevTyped = state.typed[prevIndex] ?? '';
      const prevCorrect = prevTyped === prevWord;

      if (state.mistaken[prevIndex] || !prevCorrect) {
        state.currentWordIndex = prevIndex;
        state.currentCharIndex = prevTyped.length;
        state.mistaken[prevIndex] = false;
      }
    }
  }
}

// Pure SpaceCommand implementation
class SpaceCommand implements TestCommand {
  execute(state: TestTypingState): void {
    const wordIndex = state.currentWordIndex;
    const currentWord = state.words[wordIndex] ?? '';
    const currentTyped = state.typed[wordIndex] ?? '';

    if (currentTyped.length === 0) return;

    const isIncomplete = currentTyped.length < currentWord.length;
    const hasErrors = currentTyped.split('').some((char, i) => char !== currentWord[i]);

    if (isIncomplete || hasErrors) {
      state.mistaken[wordIndex] = true;
    }

    state.currentWordIndex++;
    state.currentCharIndex = 0;
  }
}

function createTestState(words: string[]): TestTypingState {
  return {
    words,
    currentWordIndex: 0,
    currentCharIndex: 0,
    typed: words.map(() => ''),
    mistaken: words.map(() => false),
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
  };
}

describe('TypeCharacterCommand', () => {
  test('adds correct character to typed array', () => {
    const state = createTestState(['hello', 'world']);
    const cmd = new TypeCharacterCommand('h');
    cmd.execute(state);

    expect(state.typed[0]).toBe('h');
    expect(state.currentCharIndex).toBe(1);
    expect(state.correctKeystrokes).toBe(1);
  });

  test('increments incorrectKeystrokes on wrong character', () => {
    const state = createTestState(['hello', 'world']);
    const cmd = new TypeCharacterCommand('x');
    cmd.execute(state);

    expect(state.typed[0]).toBe('x');
    expect(state.incorrectKeystrokes).toBe(1);
  });

  test('handles multiple characters in sequence', () => {
    const state = createTestState(['hello', 'world']);

    new TypeCharacterCommand('h').execute(state);
    new TypeCharacterCommand('e').execute(state);
    new TypeCharacterCommand('l').execute(state);

    expect(state.typed[0]).toBe('hel');
    expect(state.currentCharIndex).toBe(3);
    expect(state.correctKeystrokes).toBe(3);
  });
});

describe('BackspaceCommand', () => {
  test('deletes last character from current word', () => {
    const state = createTestState(['hello', 'world']);
    state.typed[0] = 'hel';
    state.currentCharIndex = 3;

    const cmd = new BackspaceCommand();
    cmd.execute(state);

    expect(state.typed[0]).toBe('he');
    expect(state.currentCharIndex).toBe(2);
  });

  test('does nothing at start of first word with nothing typed', () => {
    const state = createTestState(['hello', 'world']);

    const cmd = new BackspaceCommand();
    cmd.execute(state);

    expect(state.typed[0]).toBe('');
    expect(state.currentWordIndex).toBe(0);
  });

  test('goes back to previous word if mistaken', () => {
    const state = createTestState(['hello', 'world']);
    state.currentWordIndex = 1;
    state.typed[0] = 'helo';
    state.mistaken[0] = true;

    const cmd = new BackspaceCommand();
    cmd.execute(state);

    expect(state.currentWordIndex).toBe(0);
    expect(state.currentCharIndex).toBe(4);
    expect(state.mistaken[0]).toBe(false);
  });

  test('does not go back past correctly typed word (checkpoint)', () => {
    const state = createTestState(['hello', 'world']);
    state.currentWordIndex = 1;
    state.typed[0] = 'hello';
    state.mistaken[0] = false;

    const cmd = new BackspaceCommand();
    cmd.execute(state);

    expect(state.currentWordIndex).toBe(1);
  });
});

describe('SpaceCommand', () => {
  test('advances to next word when current word has content', () => {
    const state = createTestState(['hello', 'world']);
    state.typed[0] = 'hello';

    const cmd = new SpaceCommand();
    cmd.execute(state);

    expect(state.currentWordIndex).toBe(1);
    expect(state.currentCharIndex).toBe(0);
  });

  test('does not advance if nothing typed', () => {
    const state = createTestState(['hello', 'world']);

    const cmd = new SpaceCommand();
    cmd.execute(state);

    expect(state.currentWordIndex).toBe(0);
  });

  test('marks word as mistaken if incomplete', () => {
    const state = createTestState(['hello', 'world']);
    state.typed[0] = 'hel';

    const cmd = new SpaceCommand();
    cmd.execute(state);

    expect(state.mistaken[0]).toBe(true);
    expect(state.currentWordIndex).toBe(1);
  });

  test('marks word as mistaken if has errors', () => {
    const state = createTestState(['hello', 'world']);
    state.typed[0] = 'hxxxx';

    const cmd = new SpaceCommand();
    cmd.execute(state);

    expect(state.mistaken[0]).toBe(true);
  });
});

describe('Command Composition', () => {
  test('type word, space, type next word', () => {
    const state = createTestState(['hi', 'there']);

    // Type "hi"
    new TypeCharacterCommand('h').execute(state);
    new TypeCharacterCommand('i').execute(state);
    expect(state.typed[0]).toBe('hi');

    // Space to next word
    new SpaceCommand().execute(state);
    expect(state.currentWordIndex).toBe(1);
    expect(state.mistaken[0]).toBe(false);

    // Type "there"
    new TypeCharacterCommand('t').execute(state);
    new TypeCharacterCommand('h').execute(state);
    expect(state.typed[1]).toBe('th');
    expect(state.correctKeystrokes).toBe(4);
  });

  test('mistake, backspace, correct', () => {
    const state = createTestState(['hello']);

    // Type wrong char
    new TypeCharacterCommand('x').execute(state);
    expect(state.incorrectKeystrokes).toBe(1);

    // Backspace
    new BackspaceCommand().execute(state);
    expect(state.typed[0]).toBe('');

    // Type correct char
    new TypeCharacterCommand('h').execute(state);
    expect(state.typed[0]).toBe('h');
    expect(state.correctKeystrokes).toBe(1);
  });
});
