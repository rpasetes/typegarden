import type { GardenState } from './garden.ts';
import type { TypingState } from './typing.ts';
import { applyUpgradeEffects } from './upgrades.ts';

export function render(garden: GardenState): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Apply any active upgrade effects
  applyUpgradeEffects(garden.activeUpgrades);

  app.innerHTML = `
    <main class="container">
      <div id="typing-area" class="typing-area">
        <div id="words" class="words"></div>
      </div>
      <div id="stats" class="stats"></div>
    </main>
  `;
}

export function renderWords(state: TypingState): void {
  const wordsEl = document.getElementById('words');
  if (!wordsEl) return;

  const wordElements = state.words.map((word, wordIndex) => {
    const typed = state.typed[wordIndex] ?? '';
    const isCurrentWord = wordIndex === state.currentWordIndex;
    const isPastWord = wordIndex < state.currentWordIndex;

    const chars = word.split('').map((char, charIndex) => {
      const typedChar = typed[charIndex];
      let className = 'char';

      if (typedChar === undefined) {
        className += isPastWord ? ' dim' : '';
      } else if (typedChar === char) {
        className += ' correct';
      } else {
        className += ' incorrect';
      }

      // Cursor position
      if (isCurrentWord && charIndex === state.currentCharIndex) {
        className += ' cursor';
      }

      return `<span class="${className}">${char}</span>`;
    });

    // Extra characters typed beyond word length
    if (typed.length > word.length) {
      const extra = typed.slice(word.length);
      for (const char of extra) {
        chars.push(`<span class="char extra incorrect">${char}</span>`);
      }
    }

    // Cursor at end of word
    if (isCurrentWord && state.currentCharIndex >= word.length) {
      chars.push(`<span class="char cursor"> </span>`);
    }

    const wordClass = `word${isCurrentWord ? ' current' : ''}${isPastWord ? ' past' : ''}`;
    return `<span class="${wordClass}">${chars.join('')}</span>`;
  });

  wordsEl.innerHTML = wordElements.join(' ');
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
