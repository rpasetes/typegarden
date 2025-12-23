// TutorialStateMachine - Formal state machine for tutorial flow
// Based on State pattern from Game Programming Patterns by Robert Nystrom
//
// States: null (idle) → intro → mechanics → fever → stats → null (complete)
// Each transition has explicit guards and actions

import { eventBus } from '../core/EventBus.ts';
import { feverSystem } from '../systems/FeverSystem.ts';
import type { TutorialPhase, FeverStats } from '../core/types.ts';

// Tutorial prompt text content
export const TUTORIAL_PROMPTS = {
  intro: "welcome to typegarden, a game that grows the more you type: handcrafted by russell antonie pasetes.",
  mechanics: "every correct word you type gains you more sol. think of it as sunlight for your garden. you are free to make any mistakes, as long as you keep moving forward. over time you will notice golden letters appear as you type. catch them in time to gain a sol burst. stay in flow and you will catch more golden letters. sometimes, rarer characters appear that are different from the usual golden letter. type them to trigger something special!",
  fever: "yooo welcome to fever mode lmao every letter is golden now so just go crazy and collect everything you can. dont mess up tho or your chain breaks and thats kinda sad. anyway yeah ive been practicing this demo so many times im actually so tired rn. did i get a perfect streak so far? someone in the audience let me know. especially in the back, idk if yall can read this haha. almost done i think. gg wp see ya"
};

// Phase configuration returned by getConfig()
export interface TutorialPhaseConfig {
  words: string[];
  goldenEnabled: boolean;
  goldenSpawnInterval: number;
  goldenStartWordIndex: number;
  greenLetterPosition: { wordIndex: number; charIndex: number } | null;
  solBarVisible: boolean;
  allLettersGreen: boolean;
}

// Transition event types
export type TransitionEvent =
  | 'START'           // Start tutorial from idle
  | 'PHASE_COMPLETE'  // Current phase typing finished
  | 'GREEN_CAPTURED'  // Green letter captured (mechanics → fever shortcut)
  | 'STATS_DISMISSED' // Stats modal dismissed
  | 'RESET';          // Force reset to idle

// State interface - each phase implements this
interface TutorialState {
  readonly phase: TutorialPhase;

  // Called when entering this state
  onEnter(): void;

  // Called when leaving this state
  onExit(): void;

  // Get configuration for this phase
  getConfig(): TutorialPhaseConfig;

  // Handle a transition event, returns next state or null if not handled
  handleEvent(event: TransitionEvent): TutorialState | null;
}

// Find the position of "!" in mechanics prompt for green letter
function findGreenLetterPosition(): { wordIndex: number; charIndex: number } | null {
  const words = TUTORIAL_PROMPTS.mechanics.split(' ');
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const charIndex = word?.indexOf('!');
    if (charIndex !== undefined && charIndex !== -1) {
      return { wordIndex, charIndex };
    }
  }
  return null;
}

// Find the word index where sentence N starts (1-indexed)
function findSentenceStartWordIndex(sentenceNumber: number): number {
  const words = TUTORIAL_PROMPTS.mechanics.split(' ');
  let currentSentence = 1;

  if (sentenceNumber <= 1) return 0;

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    if (word && /[.!?]$/.test(word)) {
      currentSentence++;
      if (currentSentence === sentenceNumber) {
        return wordIndex + 1;
      }
    }
  }
  return 0;
}

// Idle state - tutorial not started or complete
class IdleState implements TutorialState {
  readonly phase: TutorialPhase = null;

  onEnter(): void {
    // Nothing to do
  }

  onExit(): void {
    // Nothing to do
  }

  getConfig(): TutorialPhaseConfig {
    return {
      words: [],
      goldenEnabled: true,
      goldenSpawnInterval: 20,
      goldenStartWordIndex: 0,
      greenLetterPosition: null,
      solBarVisible: true,
      allLettersGreen: false,
    };
  }

  handleEvent(event: TransitionEvent): TutorialState | null {
    if (event === 'START') {
      return new IntroState();
    }
    return null;
  }
}

// Intro state - welcome message
class IntroState implements TutorialState {
  readonly phase: TutorialPhase = 'intro';

  onEnter(): void {
    feverSystem.reset();
  }

  onExit(): void {
    // Nothing to do
  }

  getConfig(): TutorialPhaseConfig {
    return {
      words: TUTORIAL_PROMPTS.intro.split(' '),
      goldenEnabled: false,
      goldenSpawnInterval: 20,
      goldenStartWordIndex: 0,
      greenLetterPosition: null,
      solBarVisible: false,
      allLettersGreen: false,
    };
  }

  handleEvent(event: TransitionEvent): TutorialState | null {
    if (event === 'PHASE_COMPLETE') {
      return new MechanicsState();
    }
    if (event === 'RESET') {
      return new IdleState();
    }
    return null;
  }
}

// Mechanics state - teaching golden/green letters
class MechanicsState implements TutorialState {
  readonly phase: TutorialPhase = 'mechanics';

  onEnter(): void {
    // Nothing special
  }

  onExit(): void {
    // Nothing special
  }

  getConfig(): TutorialPhaseConfig {
    return {
      words: TUTORIAL_PROMPTS.mechanics.split(' '),
      goldenEnabled: true,
      goldenSpawnInterval: 20,
      goldenStartWordIndex: findSentenceStartWordIndex(4),
      greenLetterPosition: findGreenLetterPosition(),
      solBarVisible: true,
      allLettersGreen: false,
    };
  }

  handleEvent(event: TransitionEvent): TutorialState | null {
    // Green capture is the fast path to fever
    if (event === 'GREEN_CAPTURED' || event === 'PHASE_COMPLETE') {
      return new FeverState();
    }
    if (event === 'RESET') {
      return new IdleState();
    }
    return null;
  }
}

// Fever state - all letters are golden, chain tracking
class FeverState implements TutorialState {
  readonly phase: TutorialPhase = 'fever';

  onEnter(): void {
    feverSystem.start();
  }

  onExit(): void {
    feverSystem.end();
  }

  getConfig(): TutorialPhaseConfig {
    return {
      words: TUTORIAL_PROMPTS.fever.split(' '),
      goldenEnabled: true,
      goldenSpawnInterval: 5,
      goldenStartWordIndex: 0,
      greenLetterPosition: null,
      solBarVisible: true,
      allLettersGreen: true,
    };
  }

  handleEvent(event: TransitionEvent): TutorialState | null {
    if (event === 'PHASE_COMPLETE') {
      return new StatsState();
    }
    if (event === 'RESET') {
      return new IdleState();
    }
    return null;
  }
}

// Stats state - showing performance modal
class StatsState implements TutorialState {
  readonly phase: TutorialPhase = 'stats';

  onEnter(): void {
    // Stats are calculated and displayed by main.ts
  }

  onExit(): void {
    // Nothing special
  }

  getConfig(): TutorialPhaseConfig {
    return {
      words: [],
      goldenEnabled: false,
      goldenSpawnInterval: 20,
      goldenStartWordIndex: 0,
      greenLetterPosition: null,
      solBarVisible: true,
      allLettersGreen: false,
    };
  }

  handleEvent(event: TransitionEvent): TutorialState | null {
    if (event === 'STATS_DISMISSED') {
      return new IdleState();
    }
    if (event === 'RESET') {
      return new IdleState();
    }
    return null;
  }
}

// The state machine itself
export class TutorialStateMachine {
  private currentState: TutorialState = new IdleState();
  private startTime: number | null = null;

  // Get current phase
  getPhase(): TutorialPhase {
    return this.currentState.phase;
  }

  // Get configuration for current phase
  getConfig(): TutorialPhaseConfig {
    return this.currentState.getConfig();
  }

  // Check if tutorial is active (not idle)
  isActive(): boolean {
    return this.currentState.phase !== null;
  }

  // Send an event to the state machine
  send(event: TransitionEvent): boolean {
    const nextState = this.currentState.handleEvent(event);

    if (nextState) {
      const previousPhase = this.currentState.phase;

      // Exit current state
      this.currentState.onExit();

      // Transition
      this.currentState = nextState;

      // Enter new state
      this.currentState.onEnter();

      // Emit phase change event
      eventBus.emit({
        type: 'PHASE_CHANGED',
        from: previousPhase,
        to: this.currentState.phase,
      });

      return true;
    }

    return false;
  }

  // Convenience methods for common transitions
  start(): boolean {
    return this.send('START');
  }

  completePhase(): boolean {
    return this.send('PHASE_COMPLETE');
  }

  captureGreen(): boolean {
    return this.send('GREEN_CAPTURED');
  }

  dismissStats(): boolean {
    return this.send('STATS_DISMISSED');
  }

  reset(): boolean {
    this.startTime = null;
    return this.send('RESET');
  }

  // Tutorial timer
  startTimer(): void {
    if (this.startTime === null) {
      this.startTime = Date.now();
    }
  }

  getElapsedTime(): number {
    if (this.startTime === null) return 0;
    return Date.now() - this.startTime;
  }
}

// Singleton instance
export const tutorialStateMachine = new TutorialStateMachine();
