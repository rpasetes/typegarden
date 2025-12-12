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
      <div id="progress" class="above-viewport progress"></div>
      <div id="typing-area" class="typing-area">
        <div id="words" class="words"></div>
        <div id="cursor" class="cursor"></div>
      </div>
      <div id="stats" class="above-viewport stats"></div>
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

    const isMistaken = state.mistaken[wordIndex] ?? false;
    const wordClass = `word${isCurrentWord ? ' current' : ''}${isPastWord ? ' past' : ''}${isMistaken ? ' mistaken' : ''}`;
    return `<span class="${wordClass}">${chars.join('')}</span>`;
  });

  wordsEl.innerHTML = wordElements.join(' ');

  // Update progress indicator (shows completed words, not current)
  renderProgress(state.currentWordIndex, state.words.length);

  // Scroll first, then position cursor (so cursor reflects post-scroll position)
  scrollToCurrentWord();
  updateCursorPosition(cursorAtEnd);
}

function updateCursorPosition(atEnd: boolean): void {
  const cursor = document.getElementById('cursor');
  const target = document.querySelector('[data-cursor-target="true"]') as HTMLElement | null;
  const wordsEl = document.getElementById('words');

  if (!cursor || !wordsEl) return;

  if (!target) {
    cursor.style.opacity = '0';
    return;
  }

  // Use offsetTop/offsetLeft which ignore transforms
  // Then manually account for the scroll offset
  const style = getComputedStyle(wordsEl);
  const lineHeightPx = parseFloat(style.lineHeight);
  const scrollOffset = scrolledToLine * lineHeightPx;

  // Calculate cursor position directly from offset values
  const targetLeft = target.offsetLeft;
  const targetTop = target.offsetTop - scrollOffset;

  cursor.style.opacity = '1';
  cursor.style.left = atEnd
    ? `${targetLeft + target.offsetWidth}px`
    : `${targetLeft}px`;
  cursor.style.top = `${targetTop}px`;
}

// Track which line we're scrolled to (persists across renders)
let scrolledToLine = 0;

export function resetScroll(): void {
  scrolledToLine = 0;
}

function scrollToCurrentWord(): void {
  const wordsEl = document.getElementById('words');
  const currentWord = document.querySelector('.word.current') as HTMLElement | null;

  if (!wordsEl || !currentWord) return;

  // Get line height in pixels
  const style = getComputedStyle(wordsEl);
  const lineHeightPx = parseFloat(style.lineHeight);

  // offsetTop gives position in natural document flow (ignores transforms)
  const wordTop = currentWord.offsetTop;
  const currentLine = Math.floor(wordTop / lineHeightPx);

  // Keep current word always on line 2 (center)
  // scrolledToLine + 1 = center line, so scrolledToLine = currentLine - 1
  const targetScroll = Math.max(0, currentLine - 1);
  if (targetScroll !== scrolledToLine) {
    scrolledToLine = targetScroll;
  }

  const offset = -scrolledToLine * lineHeightPx;
  wordsEl.style.transform = `translateY(${offset}px)`;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function renderStats(wpm: number, accuracy: number, duration: number, activeTime: number, sessionTotal: number): void {
  const statsEl = document.getElementById('stats');
  if (!statsEl) return;

  const afkTime = duration - activeTime;
  const afkDisplay = afkTime > 500 ? ` (${formatDuration(afkTime)} afk)` : '';

  statsEl.innerHTML = `
    <span class="stat">${wpm} wpm</span>
    <span class="stat">${accuracy}% acc</span>
    <span class="stat">${formatDuration(duration)}${afkDisplay}</span>
    <span class="stat">${formatDuration(sessionTotal)} total</span>
  `;

  // Trigger fade-in animation
  requestAnimationFrame(() => {
    statsEl.classList.add('visible');
  });
}

export function renderContinuePrompt(): void {
  const wordsEl = document.getElementById('words');
  const cursor = document.getElementById('cursor');
  if (!wordsEl) return;

  // Hide cursor
  if (cursor) cursor.style.opacity = '0';

  wordsEl.innerHTML = '<span class="continue-prompt">press space to keep typing</span>';
  wordsEl.style.transform = 'translateY(0)';
}

export function clearStats(): void {
  const statsEl = document.getElementById('stats');
  if (!statsEl) return;
  statsEl.classList.remove('visible');
  statsEl.innerHTML = '';
}

export function renderProgress(current: number, total: number): void {
  const progressEl = document.getElementById('progress');
  if (!progressEl) return;
  progressEl.textContent = `${current}/${total}`;
  progressEl.classList.add('visible');
}

export function hideProgress(): void {
  const progressEl = document.getElementById('progress');
  if (!progressEl) return;
  progressEl.classList.remove('visible');
}

export function showFocusOverlay(): void {
  // Don't show if already visible
  if (document.querySelector('.focus-overlay')) return;

  const typingArea = document.getElementById('typing-area');
  if (!typingArea) return;

  const overlay = document.createElement('div');
  overlay.className = 'focus-overlay fade-in';
  overlay.innerHTML = '<p class="focus-overlay-message">click here or press a key to focus</p>';

  // Remove on click with fade
  overlay.addEventListener('click', () => {
    hideFocusOverlay();
  });

  typingArea.appendChild(overlay);
}

export function hideFocusOverlay(): void {
  const overlay = document.querySelector('.focus-overlay');
  if (!overlay) return;

  // Fade out before removing
  overlay.classList.add('fade-out');
  setTimeout(() => {
    overlay.remove();
  }, 200); // Match transition duration
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
