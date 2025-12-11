import './style.css';
import { startTyping, calculateWPM, calculateAccuracy } from './typing.ts';
import type { TypingState } from './typing.ts';
import { loadGarden, initGarden, saveGarden, addRun } from './garden.ts';
import type { GardenState } from './garden.ts';
import { render, renderStats, renderContinuePrompt, clearStats, initCursorIdleDetection, resetScroll } from './ui.ts';
import { generateWords } from './words.ts';

// Initialize garden state (load from localStorage or create fresh)
let garden = loadGarden() ?? initGarden();
let waitingForContinue = false;

function onRunComplete(state: TypingState): void {
  const wpm = calculateWPM(state);
  const accuracy = calculateAccuracy(state);
  const wordCount = state.words.length;
  const duration = (state.endTime ?? Date.now()) - (state.startTime ?? Date.now());

  // Show final stats above typing area
  renderStats(wpm, accuracy);

  // Save run to garden
  garden = addRun(garden, {
    timestamp: Date.now(),
    wpm,
    accuracy,
    wordCount,
    duration,
    correctKeystrokes: state.correctKeystrokes,
    incorrectKeystrokes: state.incorrectKeystrokes,
  });
  saveGarden(garden);

  // Show continue prompt and wait for Enter
  renderContinuePrompt();
  waitingForContinue = true;
}

function handleContinue(e: KeyboardEvent): void {
  if (!waitingForContinue) return;
  if (e.key !== ' ') return;

  e.preventDefault();
  waitingForContinue = false;
  clearStats();
  startNewRun();
}

function startNewRun(): void {
  // Render fresh UI
  render(garden);
  resetScroll();

  // Generate words — for now, 50 common words
  // TODO: Tutorial flow will replace this
  const words = generateWords({ type: 'common', count: 50 });

  // Start typing session
  startTyping(words, onRunComplete);
}

// Initial render and start
render(garden);
initCursorIdleDetection();
document.addEventListener('keydown', handleContinue);
startNewRun();
