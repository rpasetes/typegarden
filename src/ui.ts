import type { GardenState } from './garden.ts';
import type { TypingState } from './typing.ts';
import { applyUpgradeEffects } from './upgrades.ts';

export function setCursorActive(): void {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  cursor.classList.remove('idle');
}

export function setCursorIdle(): void {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  cursor.classList.add('idle');
}

export function initCursorIdleDetection(): void {
  // Start idle on mouse movement
  document.addEventListener('mousemove', () => {
    const cursor = document.getElementById('cursor');
    if (cursor && !cursor.classList.contains('idle')) {
      // If not already idle, set idle (mouse activity = not typing)
      setCursorIdle();
    }
  });

  // Set idle when window loses focus
  window.addEventListener('blur', setCursorIdle);

  // Start as idle
  setCursorIdle();
}

export function render(garden: GardenState): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Apply any active upgrade effects
  applyUpgradeEffects(garden.activeUpgrades);

  app.innerHTML = `
    <main class="container">
      <div id="typing-area" class="typing-area">
        <div id="words" class="words"></div>
        <div id="cursor" class="cursor"></div>
      </div>
      <div id="stats" class="stats"></div>
    </main>
  `;
}

export function renderWords(state: TypingState): void {
  const wordsEl = document.getElementById('words');
  if (!wordsEl) return;

  // Track if cursor should be at end of a character (right edge)
  let cursorAtEnd = false;

  const wordElements = state.words.map((word, wordIndex) => {
    const typed = state.typed[wordIndex] ?? '';
    const isCurrentWord = wordIndex === state.currentWordIndex;
    const isPastWord = wordIndex < state.currentWordIndex;

    const chars = word.split('').map((char, charIndex) => {
      const typedChar = typed[charIndex];
      let className = 'char';
      let dataAttr = '';

      if (typedChar === undefined) {
        // Untyped: gray/dim to prompt typing
        className += ' untyped';
      } else if (typedChar === char) {
        // Correct: white
        className += ' correct';
      } else {
        // Incorrect: red
        className += ' incorrect';
      }

      // Mark cursor target (at start of this char)
      if (isCurrentWord && charIndex === state.currentCharIndex) {
        dataAttr = ' data-cursor-target="true"';
      }

      // Mark cursor at end of last typed char
      if (isCurrentWord && charIndex === state.currentCharIndex - 1 && state.currentCharIndex === typed.length && typed.length <= word.length) {
        dataAttr = ' data-cursor-target="true" data-cursor-end="true"';
        cursorAtEnd = true;
      }

      return `<span class="${className}"${dataAttr}>${char}</span>`;
    });

    // Extra characters typed beyond word length
    if (typed.length > word.length) {
      const extra = typed.slice(word.length);
      for (let i = 0; i < extra.length; i++) {
        const extraIndex = word.length + i;
        const isLastTyped = extraIndex === typed.length - 1;
        let dataAttr = '';

        // Cursor at end of last extra char
        if (isCurrentWord && isLastTyped && state.currentCharIndex === typed.length) {
          dataAttr = ' data-cursor-target="true" data-cursor-end="true"';
          cursorAtEnd = true;
        }

        chars.push(`<span class="char extra incorrect"${dataAttr}>${extra[i]}</span>`);
      }
    }

    const wordClass = `word${isCurrentWord ? ' current' : ''}${isPastWord ? ' past' : ''}`;
    return `<span class="${wordClass}">${chars.join('')}</span>`;
  });

  wordsEl.innerHTML = wordElements.join(' ');

  // Position the cursor
  updateCursorPosition(cursorAtEnd);
}

function updateCursorPosition(atEnd: boolean): void {
  const cursor = document.getElementById('cursor');
  const target = document.querySelector('[data-cursor-target="true"]');
  const wordsEl = document.getElementById('words');

  if (!cursor || !wordsEl) return;

  if (!target) {
    cursor.style.opacity = '0';
    return;
  }

  const wordsRect = wordsEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  cursor.style.opacity = '1';
  // Position at right edge if at end of typed content, otherwise left edge
  const leftPos = atEnd ? targetRect.right - wordsRect.left : targetRect.left - wordsRect.left;
  cursor.style.left = `${leftPos}px`;
  cursor.style.top = `${targetRect.top - wordsRect.top}px`;
}

export function renderStats(wpm: number, accuracy: number): void {
  const statsEl = document.getElementById('stats');
  if (!statsEl) return;

  statsEl.innerHTML = `
    <span class="stat">${wpm} wpm</span>
    <span class="stat">${accuracy}% acc</span>
  `;

  // Trigger fade-in animation
  requestAnimationFrame(() => {
    statsEl.classList.add('visible');
  });
}

export function renderUpgradeChoice(
  options: { id: string; name: string; description: string }[],
  onSelect: (id: string) => void
): void {
  const app = document.getElementById('app');
  if (!app) return;

  const modal = document.createElement('div');
  modal.className = 'upgrade-modal';
  modal.innerHTML = `
    <div class="upgrade-content">
      <p class="upgrade-prompt">choose how your garden grows:</p>
      <div class="upgrade-options">
        ${options
          .map(
            (opt, i) => `
          <button class="upgrade-option" data-id="${opt.id}">
            <span class="upgrade-key">${i + 1}</span>
            <span class="upgrade-name">${opt.name}</span>
            <span class="upgrade-desc">${opt.description}</span>
          </button>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  // Click handlers
  modal.querySelectorAll('.upgrade-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) {
        modal.remove();
        onSelect(id);
      }
    });
  });

  // Keyboard handlers (1, 2, 3)
  const keyHandler = (e: KeyboardEvent) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= options.length) {
      const opt = options[num - 1];
      if (opt) {
        document.removeEventListener('keydown', keyHandler);
        modal.remove();
        onSelect(opt.id);
      }
    }
  };
  document.addEventListener('keydown', keyHandler);

  app.appendChild(modal);
}
