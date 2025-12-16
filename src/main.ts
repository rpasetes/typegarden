import './style.css';
import { startTyping } from './typing.ts';
import { loadGarden, initGarden, saveGarden } from './garden.ts';
import type { GardenState } from './garden.ts';
import { render, initCursorIdleDetection, resetScroll, showFocusOverlay, hideFocusOverlay, fadeInWords, prepareWordsFadeIn, renderSolBar } from './ui.ts';
import { generateWords } from './words.ts';
import { initSol, earnBaseSol, setOnSolChange, getSolState } from './sol.ts';

// Initialize garden state (load from localStorage or create fresh)
let garden = loadGarden() ?? initGarden();
let isRunActive = false;

// Initialize sol state
initSol(garden);

// Set up sol change listener to update UI
setOnSolChange((solState) => {
  renderSolBar(solState.sessionSol);
  // Update garden with lifetime sol
  garden = { ...garden, lifetimeSol: solState.lifetimeSol };
  saveGarden(garden);
});

function onWordComplete(): void {
  earnBaseSol();
}

function startTypingSession(): void {
  // Render fresh UI
  render(garden);
  resetScroll();

  // Prepare words element for fade-in transition
  prepareWordsFadeIn();

  // Generate initial words
  const words = generateWords({ type: 'common', count: 40 });

  // Mark run as active
  isRunActive = true;

  // Start typing session with word complete callback
  startTyping(words, onWordComplete);

  // Initial sol bar render
  renderSolBar(getSolState().sessionSol);

  // Double RAF to ensure browser applies initial fade-out class before removing it
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fadeInWords();
    });
  });
}

export function getIsRunActive(): boolean {
  return isRunActive;
}

// Overlay handler to hide on any keypress
function handleKeyPress(): void {
  hideFocusOverlay();
}

// Initial render and start
render(garden);
initCursorIdleDetection();
document.addEventListener('keydown', handleKeyPress);

// Focus overlay - show only on blur, not on load
window.addEventListener('blur', showFocusOverlay);
window.addEventListener('focus', hideFocusOverlay);

startTypingSession();
