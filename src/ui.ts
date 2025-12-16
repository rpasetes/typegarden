import type { GardenState } from './garden.ts';
import type { TypingState } from './typing.ts';
import { applyUpgradeEffects } from './upgrades.ts';
import { getIsRunActive } from './main.ts';

// Track the highest word index we've rendered (for detecting new words)
let highestRenderedIndex = -1;

// Reset when starting new session
export function resetRenderedTracking(): void {
  highestRenderedIndex = -1;
}

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

  // Reset tracking for new session
  resetRenderedTracking();

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
      <div id="sol-bar" class="sol-bar"></div>
    </main>
  `;
}

// Render only a window of words around cursor for performance
const WORDS_BEHIND = 20;

export function renderWords(state: TypingState): void {
  const wordsEl = document.getElementById('words');
  if (!wordsEl) return;

  // Calculate render window
  const windowStart = Math.max(0, state.currentWordIndex - WORDS_BEHIND);
  const windowEnd = state.words.length;

  // Track if cursor should be at end of a character (right edge)
  let cursorAtEnd = false;

  // Track character offset for staggered fade animation (only for new words)
  let newCharOffset = 0;

  const wordElements: string[] = [];

  for (let wordIndex = windowStart; wordIndex < windowEnd; wordIndex++) {
    const word = state.words[wordIndex] ?? '';
    const typed = state.typed[wordIndex] ?? '';
    const isCurrentWord = wordIndex === state.currentWordIndex;
    const isPastWord = wordIndex < state.currentWordIndex;

    // Word is "new" if we haven't rendered this absolute index before
    const isNewWord = wordIndex > highestRenderedIndex;
    const wordStartCharOffset = newCharOffset;

    const chars = word.split('').map((char, charIndex) => {
      const typedChar = typed[charIndex];
      let className = 'char';
      let dataAttr = '';
      let styleAttr = '';

      if (typedChar === undefined) {
        className += ' untyped';
      } else if (typedChar === char) {
        className += ' correct';
      } else {
        className += ' incorrect';
      }

      // Mark cursor target
      if (isCurrentWord && charIndex === state.currentCharIndex) {
        dataAttr = ' data-cursor-target="true"';
      }

      // Mark cursor at end of last typed char
      if (isCurrentWord && charIndex === state.currentCharIndex - 1 && state.currentCharIndex === typed.length && typed.length <= word.length) {
        dataAttr = ' data-cursor-target="true" data-cursor-end="true"';
        cursorAtEnd = true;
      }

      // Staggered fade for new word characters
      if (isNewWord) {
        const charOffset = wordStartCharOffset + charIndex;
        className += ' char-new';
        styleAttr = ` style="animation-delay: ${charOffset * 12}ms"`;
      }

      return `<span class="${className}"${dataAttr}${styleAttr}>${char}</span>`;
    });

    // Update char offset for next new word
    if (isNewWord) {
      newCharOffset += word.length + 1;
    }

    // Extra characters typed beyond word length
    if (typed.length > word.length) {
      const extra = typed.slice(word.length);
      for (let i = 0; i < extra.length; i++) {
        const extraIndex = word.length + i;
        const isLastTyped = extraIndex === typed.length - 1;
        let dataAttr = '';

        if (isCurrentWord && isLastTyped && state.currentCharIndex === typed.length) {
          dataAttr = ' data-cursor-target="true" data-cursor-end="true"';
          cursorAtEnd = true;
        }

        chars.push(`<span class="char extra incorrect"${dataAttr}>${extra[i]}</span>`);
      }
    }

    const isMistaken = state.mistaken[wordIndex] ?? false;
    const wordClass = `word${isCurrentWord ? ' current' : ''}${isPastWord ? ' past' : ''}${isMistaken ? ' mistaken' : ''}`;
    wordElements.push(`<span class="${wordClass}">${chars.join('')}</span>`);
  }

  wordsEl.innerHTML = wordElements.join(' ');

  // Update highest rendered index
  highestRenderedIndex = Math.max(highestRenderedIndex, windowEnd - 1);

  // Scroll and position cursor
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

// Number of visible lines in viewport
const VISIBLE_LINES = 3;

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

  // Only scroll when current line goes past the visible viewport
  // Visible lines are: scrolledToLine, scrolledToLine+1, scrolledToLine+2
  const lastVisibleLine = scrolledToLine + VISIBLE_LINES - 1;

  if (currentLine > lastVisibleLine) {
    // Cursor went below viewport - scroll so current line is the last visible
    scrolledToLine = currentLine - VISIBLE_LINES + 1;
  } else if (currentLine < scrolledToLine) {
    // Cursor went above viewport (backspace) - scroll so current line is first visible
    scrolledToLine = currentLine;
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

  // Remove fade-out class and show continue prompt
  wordsEl.classList.remove('fade-out');
  wordsEl.innerHTML = '<span class="continue-prompt">press space to keep typing</span>';
  wordsEl.style.transform = 'translateY(0)';
}

export function fadeOutWords(): Promise<void> {
  return new Promise((resolve) => {
    const wordsEl = document.getElementById('words');
    if (!wordsEl) {
      resolve();
      return;
    }

    // Add fade-out class
    wordsEl.classList.add('fade-out');

    // Wait for CSS transition to complete
    const onTransitionEnd = () => {
      wordsEl.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };
    wordsEl.addEventListener('transitionend', onTransitionEnd);

    // Fallback timeout in case transitionend doesn't fire
    setTimeout(() => {
      wordsEl.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    }, 400);
  });
}

export function fadeOutStats(): Promise<void> {
  return new Promise((resolve) => {
    const statsEl = document.getElementById('stats');
    const wordsEl = document.getElementById('words');

    // Fade out stats
    if (statsEl) {
      statsEl.classList.remove('visible');

      // Wait for stats CSS transition to complete
      const onTransitionEnd = () => {
        statsEl.removeEventListener('transitionend', onTransitionEnd);
        resolve();
      };
      statsEl.addEventListener('transitionend', onTransitionEnd);

      // Fallback timeout
      setTimeout(() => {
        statsEl.removeEventListener('transitionend', onTransitionEnd);
        resolve();
      }, 500);
    } else {
      resolve();
    }

    // Fade out continue prompt
    if (wordsEl) {
      wordsEl.classList.add('fade-out');
    }
  });
}

export function fadeInWords(): void {
  const wordsEl = document.getElementById('words');
  if (!wordsEl) return;

  // Remove fade-out class to fade in
  wordsEl.classList.remove('fade-out');
}

export function prepareWordsFadeIn(): void {
  const wordsEl = document.getElementById('words');
  if (!wordsEl) return;

  // Add fade-out class before initial render (will be removed to fade in)
  wordsEl.classList.add('fade-out');
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

export function renderSolBar(sessionSol: number): void {
  const solBarEl = document.getElementById('sol-bar');
  if (!solBarEl) return;
  solBarEl.innerHTML = `<span class="sol-icon">🌱</span><span class="sol-count">${sessionSol}</span>`;
}

export function showFocusOverlay(): void {
  // Don't show if already visible
  if (document.querySelector('.focus-overlay')) return;

  const typingArea = document.getElementById('typing-area');
  if (!typingArea) return;

  // Hide progress indicator when unfocused
  const progressEl = document.getElementById('progress');
  if (progressEl) {
    progressEl.classList.remove('visible');
  }

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

  // Restore progress indicator only if we're in an active run
  if (getIsRunActive()) {
    const progressEl = document.getElementById('progress');
    if (progressEl && progressEl.textContent) {
      progressEl.classList.add('visible');
    }
  }

  // Fade out before removing
  overlay.classList.add('fade-out');

  // Wait for CSS transition to complete
  const onTransitionEnd = () => {
    overlay.removeEventListener('transitionend', onTransitionEnd);
    overlay.remove();
  };
  overlay.addEventListener('transitionend', onTransitionEnd);

  // Fallback timeout in case transitionend doesn't fire
  setTimeout(() => {
    overlay.removeEventListener('transitionend', onTransitionEnd);
    overlay.remove();
  }, 300);
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
