import type { GardenState } from './garden.ts';
import type { TypingState } from './typing.ts';
import { applyUpgradeEffects } from './upgrades.ts';
import { getIsRunActive } from './main.ts';
import { getActiveGolden, getFadeDuration } from './golden.ts';

// Track the highest word index we've rendered (for detecting new words)
let highestRenderedIndex = -1;

// Track when each word's animation completes (wordIndex -> completion timestamp)
const animatingUntil = new Map<number, number>();

// Animation duration in ms (matches CSS: 0.4s animation + max stagger delay)
const ANIMATION_DURATION_MS = 600;

// Reset when starting new session
export function resetRenderedTracking(): void {
  highestRenderedIndex = -1;
  animatingUntil.clear();
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

// Only animate words within this range of current position
const ANIMATE_AHEAD = 30;

export function renderWords(state: TypingState): void {
  const wordsEl = document.getElementById('words');
  if (!wordsEl) return;

  const now = Date.now();
  const isInitialRender = highestRenderedIndex === -1;
  let cursorAtEnd = false;

  // Get existing word elements
  const existingWords = wordsEl.querySelectorAll('.word');

  // Track char offset for new word animations
  let newCharOffset = 0;

  // Get active golden letter once outside the loop
  const activeGolden = getActiveGolden();

  for (let wordIndex = 0; wordIndex < state.words.length; wordIndex++) {
    const word = state.words[wordIndex] ?? '';
    const typed = state.typed[wordIndex] ?? '';
    const isCurrentWord = wordIndex === state.currentWordIndex;
    const isPastWord = wordIndex < state.currentWordIndex;
    const isMistaken = state.mistaken[wordIndex] ?? false;
    const isNewWord = wordIndex > highestRenderedIndex;

    // Schedule animation for new words
    if (isNewWord && (isInitialRender || wordIndex < state.currentWordIndex + ANIMATE_AHEAD)) {
      const animationEndTime = now + ANIMATION_DURATION_MS + (newCharOffset + word.length) * 12;
      animatingUntil.set(wordIndex, animationEndTime);
    }

    const isAnimating = animatingUntil.has(wordIndex) && now < (animatingUntil.get(wordIndex) ?? 0);

    // Check if word element already exists
    let wordEl = existingWords[wordIndex] as HTMLElement | undefined;

    if (!wordEl) {
      // Create new word element
      wordEl = document.createElement('span');
      wordEl.className = 'word';

      // Create character spans
      for (let charIndex = 0; charIndex < word.length; charIndex++) {
        const charEl = document.createElement('span');
        charEl.className = 'char untyped';
        charEl.textContent = word[charIndex] ?? '';

        if (isAnimating) {
          const charOffset = newCharOffset + charIndex;
          charEl.classList.add('char-new');
          charEl.style.animationDelay = `${charOffset * 12}ms`;
        }

        wordEl.appendChild(charEl);
      }

      // Add space text node between words (except for first word)
      if (wordIndex > 0) {
        wordsEl.appendChild(document.createTextNode(' '));
      }
      wordsEl.appendChild(wordEl);
    }

    // Update word classes
    wordEl.className = `word${isCurrentWord ? ' current' : ''}${isPastWord ? ' past' : ''}${isMistaken ? ' mistaken' : ''}`;

    // Update character states
    const charEls = wordEl.querySelectorAll('.char:not(.extra)');
    for (let charIndex = 0; charIndex < word.length; charIndex++) {
      const charEl = charEls[charIndex] as HTMLElement | undefined;
      if (!charEl) continue;

      const typedChar = typed[charIndex];
      const isCorrect = typedChar === word[charIndex];
      const isTyped = typedChar !== undefined;
      const isGolden = activeGolden &&
        activeGolden.wordIndex === wordIndex &&
        activeGolden.charIndex === charIndex &&
        !isTyped;

      // Update typing state classes
      const hasCharNew = charEl.classList.contains('char-new') && !isGolden;
      const wasGolden = charEl.classList.contains('golden');

      // Preserve golden animation - skip class updates if element should stay golden
      if (wasGolden && isGolden) {
        // Don't touch className - preserve animation
      } else if (isGolden && !wasGolden) {
        // Becoming golden - set class and fade duration
        charEl.className = `char untyped golden`;
        const fadeDuration = getFadeDuration();
        charEl.style.setProperty('--golden-fade-duration', `${fadeDuration}ms`);
      } else if (wasGolden && !isGolden) {
        // No longer golden - remove golden styling and reset opacity
        charEl.className = `char ${isTyped ? (isCorrect ? 'correct' : 'incorrect') : 'untyped'}${hasCharNew ? ' char-new' : ''}`;
        charEl.style.removeProperty('--golden-fade-duration');
        charEl.style.removeProperty('opacity');
        // Force browser to recalculate by removing animation property
        charEl.style.animation = 'none';
        void charEl.offsetWidth;  // Trigger reflow
        charEl.style.removeProperty('animation');
      } else {
        // Normal update (not golden)
        charEl.className = `char ${isTyped ? (isCorrect ? 'correct' : 'incorrect') : 'untyped'}${hasCharNew ? ' char-new' : ''}`;
      }

      // Update cursor target
      charEl.removeAttribute('data-cursor-target');
      charEl.removeAttribute('data-cursor-end');

      if (isCurrentWord && charIndex === state.currentCharIndex) {
        charEl.setAttribute('data-cursor-target', 'true');
      }

      if (isCurrentWord && charIndex === state.currentCharIndex - 1 &&
          state.currentCharIndex === typed.length && typed.length <= word.length) {
        charEl.setAttribute('data-cursor-target', 'true');
        charEl.setAttribute('data-cursor-end', 'true');
        cursorAtEnd = true;
      }
    }

    // Handle extra characters (typed beyond word length)
    const existingExtras = wordEl.querySelectorAll('.char.extra');
    const extraCount = Math.max(0, typed.length - word.length);

    // Remove excess extras
    for (let i = existingExtras.length - 1; i >= extraCount; i--) {
      existingExtras[i]?.remove();
    }

    // Add/update extras
    for (let i = 0; i < extraCount; i++) {
      let extraEl = existingExtras[i] as HTMLElement | undefined;
      const extraChar = typed[word.length + i] ?? '';

      if (!extraEl) {
        extraEl = document.createElement('span');
        extraEl.className = 'char extra incorrect';
        wordEl.appendChild(extraEl);
      }

      extraEl.textContent = extraChar;
      extraEl.removeAttribute('data-cursor-target');
      extraEl.removeAttribute('data-cursor-end');

      const isLastExtra = i === extraCount - 1;
      if (isCurrentWord && isLastExtra && state.currentCharIndex === typed.length) {
        extraEl.setAttribute('data-cursor-target', 'true');
        extraEl.setAttribute('data-cursor-end', 'true');
        cursorAtEnd = true;
      }
    }

    if (isNewWord) {
      newCharOffset += word.length + 1;
    }
  }

  // Update highest rendered index
  highestRenderedIndex = Math.max(highestRenderedIndex, state.words.length - 1);

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

  // Scroll when cursor moves past the middle line
  // This keeps upcoming text visible while maintaining context above
  const middleLine = scrolledToLine + 1;

  if (currentLine > middleLine) {
    // Cursor went past middle - scroll so current line is the middle
    scrolledToLine = currentLine - 1;
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
