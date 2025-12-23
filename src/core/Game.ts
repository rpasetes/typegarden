// Game - Central orchestrator for TypeGarden
// Based on Game Programming Patterns by Robert Nystrom
//
// The Game class coordinates all systems and manages the game lifecycle.
// main.ts becomes: new Game().start()

import { eventBus } from './EventBus.ts';
import { loadGarden, initGarden, saveGarden, type GardenState } from '../garden.ts';
import { initSol, getSolState } from '../sol.ts';
import { renderSystem } from '../render/RenderSystem.ts';
import { tutorialStateMachine } from '../state/TutorialStateMachine.ts';
import { initTyping } from '../typing.ts';

export class Game {
  private garden: GardenState;
  private initialized = false;

  constructor() {
    // Load or create garden state
    this.garden = loadGarden() ?? initGarden();
  }

  // Initialize all systems
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Initialize core systems
    initSol(this.garden);
    initTyping(this.garden);
    renderSystem.init();

    // Enable debug mode in development
    if (import.meta.env?.DEV) {
      eventBus.setDebug(true);
      console.log('[TypeGarden] Game initialized with debug mode');
    }

    // Subscribe to events for garden state updates
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Update garden when sol changes
    eventBus.on('SOL_EARNED', (event) => {
      this.garden = {
        ...this.garden,
        sessionSol: event.total,
        lifetimeSol: this.garden.lifetimeSol + event.amount,
      };
      saveGarden(this.garden);
    });

    // Mark tutorial complete when it ends
    eventBus.on('PHASE_CHANGED', (event) => {
      if (event.from === 'stats' && event.to === null) {
        this.garden = { ...this.garden, tutorialComplete: true };
        saveGarden(this.garden);
      }
    });
  }

  // Get current garden state
  getGarden(): GardenState {
    return this.garden;
  }

  // Check if tutorial should be shown
  shouldShowTutorial(): boolean {
    return !this.garden.tutorialComplete;
  }

  // Start the game
  start(): void {
    this.init();

    // Emit session started event
    eventBus.emit({
      type: 'SESSION_STARTED',
      mode: this.shouldShowTutorial() ? 'tutorial' : 'endless',
    });
  }

  // Reset tutorial progress (for Ctrl+Shift+Backspace)
  resetTutorial(): void {
    this.garden = { ...initGarden(), sessionSol: 0, lifetimeSol: 0 };
    saveGarden(this.garden);
    tutorialStateMachine.reset();
  }
}

// Singleton instance for easy access
export const game = new Game();
