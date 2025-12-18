import './style.css';
import { startTyping } from './typing.ts';
import { loadGarden, initGarden, saveGarden } from './garden.ts';
import type { GardenState } from './garden.ts';
import { render, renderWords, initCursorIdleDetection, resetScroll, showFocusOverlay, hideFocusOverlay, fadeInWords, fadeOutWords, prepareWordsFadeIn, renderSolBar, hideSolBar, fadeInSolBar, renderTutorialStatsModal } from './ui.ts';
import { generateWords } from './words.ts';
import { initSol, earnBaseSol, earnGoldenSol, setOnSolChange, getSolState } from './sol.ts';
import { setOnGoldenCapture, setOnGoldenExpiry, resetGolden, setGoldenEnabled, setSpawnInterval, resetSpawnInterval } from './golden.ts';
import { getTypingState } from './typing.ts';
import { spawnGoldenParticles, getCharacterPosition, spawnRewardText, spawnCelebrationParticles } from './particles.ts';
import { shouldShowTutorial, startTutorial, getCurrentPhase, getTutorialConfig, advancePhase, trackFeverGoldenCapture, trackFeverKeystroke, getFeverStats, setOnFeverEnd, type TutorialPhase } from './tutorial.ts';
import { setOnGreenCapture, setGreenLetterPosition, resetGreen } from './green.ts';

// Initialize garden state (load from localStorage or create fresh)
let garden = loadGarden() ?? initGarden();
let isRunActive = false;

// Initialize sol state
initSol(garden);

// Set up sol change listener to update UI
setOnSolChange((solState) => {
  renderSolBar(solState.sessionSol);
  // Update garden with sol state
  garden = { ...garden, sessionSol: solState.sessionSol, lifetimeSol: solState.lifetimeSol };
  saveGarden(garden);
});

// Set up golden letter capture callback
setOnGoldenCapture((reward, wordIndex, charIndex) => {
  // Spawn particles from the captured letter's position (scaled by reward)
  const pos = getCharacterPosition(wordIndex, charIndex);
  if (pos) {
    spawnGoldenParticles(pos.x, pos.y, reward as 1 | 2 | 3);
  }

  // Show floating reward text
  spawnRewardText(reward);

  // Earn the sol reward
  earnGoldenSol(reward as 1 | 2 | 3);

  // Track golden captures during fever for stats
  if (getCurrentPhase() === 'fever') {
    trackFeverGoldenCapture();
  }
});

// Set up golden letter expiry callback to trigger re-render
setOnGoldenExpiry(() => {
  const state = getTypingState();
  if (state) renderWords(state);
});

// Set up green letter capture callback (triggers fever mode)
setOnGreenCapture(() => {
  // Green captured during mechanics phase - transition to fever
  if (getCurrentPhase() === 'mechanics') {
    fadeOutWords().then(() => {
      advancePhase(); // moves to 'fever'
      startTutorialPhase('fever');
    });
  }
});

function onWordComplete(): void {
  earnBaseSol();
}

// Tutorial phase handling
function startTutorialPhase(phase: TutorialPhase): void {
  if (!phase) return;

  const config = getTutorialConfig(phase);

  // Configure golden system
  setGoldenEnabled(config.goldenEnabled);
  setSpawnInterval(config.goldenSpawnInterval);

  // Configure green letter if specified
  resetGreen();
  if (config.greenLetterPosition) {
    setGreenLetterPosition(
      config.greenLetterPosition.wordIndex,
      config.greenLetterPosition.charIndex
    );
  }

  // Render fresh UI
  render(garden);
  resetScroll();
  resetGolden();

  // Hide sol bar for intro phase
  if (!config.solBarVisible) {
    hideSolBar();
  }

  // Prepare words element for fade-in transition
  prepareWordsFadeIn();

  // Mark run as active
  isRunActive = true;

  // Start typing with tutorial options
  startTyping(config.words, {
    onWordComplete: () => {
      earnBaseSol();

      // Fade in sol bar at end of intro (typing the final period)
      if (phase === 'intro') {
        fadeInSolBar();
      }
    },
    onComplete: () => {
      // Phase completed - advance to next
      handleTutorialPhaseComplete();
    },
    onKeystroke: (correct) => {
      // Track keystrokes during fever for stats
      if (getCurrentPhase() === 'fever') {
        trackFeverKeystroke(correct);
      }
    },
    isTutorial: true,
  });

  // Initial sol bar render (will be hidden if intro phase)
  renderSolBar(getSolState().sessionSol);

  // Double RAF to ensure browser applies initial fade-out class before removing it
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fadeInWords();
    });
  });
}

function handleTutorialPhaseComplete(): void {
  const currentPhase = getCurrentPhase();

  if (currentPhase === 'intro') {
    // Fade out intro, advance to mechanics
    fadeOutWords().then(() => {
      advancePhase();
      startTutorialPhase('mechanics');
    });
  } else if (currentPhase === 'mechanics') {
    // Mechanics completes when green letter is captured (handled by green callback)
    // But if they finish typing without capturing green, still advance
    fadeOutWords().then(() => {
      advancePhase();
      startTutorialPhase('fever');
    });
  } else if (currentPhase === 'fever') {
    // Fever complete - show stats modal
    advancePhase(); // moves to 'stats'
    const feverStats = getFeverStats();
    const wpm = feverStats ? Math.round((feverStats.correctKeystrokes / 5) / ((Date.now() - feverStats.startTime) / 60000)) : 0;
    const accuracy = feverStats ? Math.round((feverStats.correctKeystrokes / (feverStats.correctKeystrokes + feverStats.incorrectKeystrokes)) * 100) : 100;
    const goldenCaptures = feverStats?.goldenCaptures ?? 0;

    renderTutorialStatsModal(wpm, accuracy, goldenCaptures, () => {
      // Sol burst celebration
      triggerSolBurstCelebration();

      // Mark tutorial complete
      garden = { ...garden, tutorialComplete: true };
      saveGarden(garden);

      // Start endless mode with "enjoy"
      advancePhase(); // moves to null
      startEndlessWithEnjoy();
    });
  }
}

function triggerSolBurstCelebration(): void {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const solAmount = getSolState().sessionSol;

  // Multiple wave bursts
  spawnCelebrationParticles(centerX, centerY, solAmount);
  setTimeout(() => spawnCelebrationParticles(centerX, centerY, Math.floor(solAmount * 0.7)), 150);
  setTimeout(() => spawnCelebrationParticles(centerX, centerY, Math.floor(solAmount * 0.5)), 300);
}

function startEndlessWithEnjoy(): void {
  // Reset golden to normal behavior
  setGoldenEnabled(true);
  resetSpawnInterval();

  // Render fresh UI
  render(garden);
  resetScroll();
  resetGolden();

  // Prepare words element for fade-in transition
  prepareWordsFadeIn();

  // Generate words starting with "enjoy"
  const additionalWords = generateWords({ type: 'common', count: 39 });
  const words = ['enjoy', ...additionalWords];

  // Mark run as active
  isRunActive = true;

  // Start typing session with word complete callback
  startTyping(words, onWordComplete);

  // Render sol bar
  renderSolBar(getSolState().sessionSol);

  // Double RAF to ensure browser applies initial fade-out class before removing it
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fadeInWords();
    });
  });
}

function startTypingSession(): void {
  // Check if tutorial should be shown
  if (shouldShowTutorial(garden)) {
    startTutorial();
    startTutorialPhase('intro');
    return;
  }

  // Regular endless mode
  // Render fresh UI
  render(garden);
  resetScroll();
  resetGolden();

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
