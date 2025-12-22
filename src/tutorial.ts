// Tutorial System
// Guides new players through intro, mechanics, and fever rush
// Now delegates to TutorialStateMachine for state management

import type { GardenState } from './garden.ts';
import type { FeverStats } from './core/types.ts';
import { feverSystem } from './systems/FeverSystem.ts';
import { eventBus } from './core/EventBus.ts';
import { tutorialStateMachine, TUTORIAL_PROMPTS as STATE_MACHINE_PROMPTS } from './state/TutorialStateMachine.ts';
import type { TutorialPhaseConfig } from './state/TutorialStateMachine.ts';

export type TutorialPhase = 'intro' | 'mechanics' | 'fever' | 'stats' | null;

// Re-export types for backwards compatibility
export type { TutorialPhaseConfig };
export type { FeverStats };

// Re-export prompts for backwards compatibility
export const TUTORIAL_PROMPTS = STATE_MACHINE_PROMPTS;

// Legacy callbacks - still used by main.ts during dual-write phase
let onPhaseChangeCallback: ((phase: TutorialPhase) => void) | null = null;
let onFeverEndCallback: ((stats: FeverStats, wpm: number, accuracy: number) => void) | null = null;

export function setOnPhaseChange(callback: (phase: TutorialPhase) => void): void {
  onPhaseChangeCallback = callback;
}

export function setOnFeverEnd(callback: (stats: FeverStats, wpm: number, accuracy: number) => void): void {
  onFeverEndCallback = callback;

  // Subscribe to FEVER_ENDED events and forward to legacy callback
  eventBus.on('FEVER_ENDED', (event) => {
    if (onFeverEndCallback) {
      onFeverEndCallback(event.stats, event.wpm, event.accuracy);
    }
  });
}

export function shouldShowTutorial(garden: GardenState): boolean {
  return !garden.tutorialComplete;
}

export function getCurrentPhase(): TutorialPhase {
  return tutorialStateMachine.getPhase();
}

export function startTutorial(): void {
  tutorialStateMachine.start();
}

export function advancePhase(): TutorialPhase {
  // Delegate to state machine - it handles the transition and emits events
  tutorialStateMachine.completePhase();

  // Legacy callback support
  const newPhase = tutorialStateMachine.getPhase();
  if (onPhaseChangeCallback) {
    onPhaseChangeCallback(newPhase);
  }

  return newPhase;
}

// getTutorialConfig now delegates to state machine
// The phase parameter is kept for backwards compatibility but we use current state
export function getTutorialConfig(phase: TutorialPhase): TutorialPhaseConfig {
  // If asking for current phase config, use state machine directly
  if (phase === tutorialStateMachine.getPhase()) {
    return tutorialStateMachine.getConfig();
  }

  // For specific phase lookup (used during transitions), create temp state
  // This maintains backwards compatibility with how main.ts calls this
  const tempMachine = new (class {
    getConfigForPhase(p: TutorialPhase): TutorialPhaseConfig {
      const prompts = TUTORIAL_PROMPTS;

      switch (p) {
        case 'intro':
          return {
            words: prompts.intro.split(' '),
            goldenEnabled: false,
            goldenSpawnInterval: 20,
            goldenStartWordIndex: 0,
            greenLetterPosition: null,
            solBarVisible: false,
            allLettersGreen: false,
          };

        case 'mechanics': {
          const words = prompts.mechanics.split(' ');
          // Find green letter position (!)
          let greenPos: { wordIndex: number; charIndex: number } | null = null;
          for (let wi = 0; wi < words.length; wi++) {
            const ci = words[wi]?.indexOf('!');
            if (ci !== undefined && ci !== -1) {
              greenPos = { wordIndex: wi, charIndex: ci };
              break;
            }
          }
          // Find sentence 4 start
          let currentSentence = 1;
          let goldenStart = 0;
          for (let wi = 0; wi < words.length; wi++) {
            if (/[.!?]$/.test(words[wi] ?? '')) {
              currentSentence++;
              if (currentSentence === 4) {
                goldenStart = wi + 1;
                break;
              }
            }
          }
          return {
            words,
            goldenEnabled: true,
            goldenSpawnInterval: 20,
            goldenStartWordIndex: goldenStart,
            greenLetterPosition: greenPos,
            solBarVisible: true,
            allLettersGreen: false,
          };
        }

        case 'fever':
          return {
            words: prompts.fever.split(' '),
            goldenEnabled: true,
            goldenSpawnInterval: 5,
            goldenStartWordIndex: 0,
            greenLetterPosition: null,
            solBarVisible: true,
            allLettersGreen: true,
          };

        default:
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
    }
  })();

  return tempMachine.getConfigForPhase(phase);
}

// Fever stats tracking - delegates to FeverSystem
export function trackFeverGoldenCapture(): void {
  feverSystem.trackGoldenCapture();
}

export function trackFeverKeystroke(correct: boolean): void {
  feverSystem.trackKeystroke(correct);
}

export function getFeverStats(): FeverStats | null {
  return feverSystem.getStats();
}

// Chain tracking - delegates to FeverSystem
export function incrementChain(): number {
  return feverSystem.incrementChain();
}

export function breakChain(): void {
  feverSystem.breakChain();
}

export function getCurrentChain(): number {
  return feverSystem.getCurrentChain();
}

export function getMaxChain(): number {
  return feverSystem.getMaxChain();
}

export function resetTutorial(): void {
  tutorialStateMachine.reset();
}

// Tutorial timer - delegates to state machine
export function startTutorialTimer(): void {
  tutorialStateMachine.startTimer();
}

export function getTutorialElapsedTime(): number {
  return tutorialStateMachine.getElapsedTime();
}
