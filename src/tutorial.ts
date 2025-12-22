// Tutorial System
// Guides new players through intro, mechanics, and fever rush
// TODO: Phase 4 will extract this into TutorialStateMachine

import type { GardenState } from './garden.ts';
import type { FeverStats } from './core/types.ts';
import { feverSystem } from './systems/FeverSystem.ts';
import { eventBus } from './core/EventBus.ts';

export type TutorialPhase = 'intro' | 'mechanics' | 'fever' | 'stats' | null;

export interface TutorialPhaseConfig {
  words: string[];
  goldenEnabled: boolean;
  goldenSpawnInterval: number;
  goldenStartWordIndex: number;
  greenLetterPosition: { wordIndex: number; charIndex: number } | null;
  solBarVisible: boolean;
  allLettersGreen: boolean;  // Every char capturable in fever
}

// Re-export FeverStats for backwards compatibility
export type { FeverStats };

// Tutorial prompt text content
export const TUTORIAL_PROMPTS = {
  intro: "welcome to typegarden, a game that grows the more you type: handcrafted by russell antonie pasetes.",
  mechanics: "every correct word you type gains you more sol. think of it as sunlight for your garden. you are free to make any mistakes, as long as you keep moving forward. over time you will notice golden letters appear as you type. catch them in time to gain a sol burst. stay in flow and you will catch more golden letters. sometimes, rarer characters appear that are different from the usual golden letter. type them to trigger something special!",
  fever: "yooo welcome to fever mode lmao every letter is golden now so just go crazy and collect everything you can. dont mess up tho or your chain breaks and thats kinda sad. anyway yeah ive been practicing this demo so many times im actually so tired rn. did i get a perfect streak so far? someone in the audience let me know. especially in the back, idk if yall can read this haha. almost done i think. gg wp see ya"
};

// Current tutorial state
let currentPhase: TutorialPhase = null;
let tutorialStartTime: number | null = null;

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
  return currentPhase;
}

export function startTutorial(): void {
  currentPhase = 'intro';
  feverSystem.reset();
}

export function advancePhase(): TutorialPhase {
  const previousPhase = currentPhase;

  switch (currentPhase) {
    case 'intro':
      currentPhase = 'mechanics';
      break;
    case 'mechanics':
      currentPhase = 'fever';
      feverSystem.start();
      break;
    case 'fever':
      currentPhase = 'stats';
      feverSystem.end();
      break;
    case 'stats':
      currentPhase = null;
      break;
  }

  // Emit phase change event
  eventBus.emit({
    type: 'PHASE_CHANGED',
    from: previousPhase,
    to: currentPhase,
  });

  if (onPhaseChangeCallback) {
    onPhaseChangeCallback(currentPhase);
  }

  return currentPhase;
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
// Sentences end with . ! or ?
function findSentenceStartWordIndex(sentenceNumber: number): number {
  const words = TUTORIAL_PROMPTS.mechanics.split(' ');
  let currentSentence = 1;

  if (sentenceNumber <= 1) return 0;

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    if (word && /[.!?]$/.test(word)) {
      currentSentence++;
      if (currentSentence === sentenceNumber) {
        return wordIndex + 1; // Next word starts the new sentence
      }
    }
  }
  return 0;
}

export function getTutorialConfig(phase: TutorialPhase): TutorialPhaseConfig {
  switch (phase) {
    case 'intro':
      return {
        words: TUTORIAL_PROMPTS.intro.split(' '),
        goldenEnabled: false,
        goldenSpawnInterval: 20,
        goldenStartWordIndex: 0,
        greenLetterPosition: null,
        solBarVisible: false,
        allLettersGreen: false,
      };

    case 'mechanics':
      return {
        words: TUTORIAL_PROMPTS.mechanics.split(' '),
        goldenEnabled: true,
        goldenSpawnInterval: 20, // Normal spawn rate
        goldenStartWordIndex: findSentenceStartWordIndex(4), // Golden starts at sentence 4
        greenLetterPosition: findGreenLetterPosition(),
        solBarVisible: true,
        allLettersGreen: false,
      };

    case 'fever':
      return {
        words: TUTORIAL_PROMPTS.fever.split(' '),
        goldenEnabled: true,
        goldenSpawnInterval: 5, // High spawn rate for chain bursts
        goldenStartWordIndex: 0,
        greenLetterPosition: null,
        solBarVisible: true,
        allLettersGreen: true,  // Every letter capturable
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
  currentPhase = null;
  feverSystem.reset();
  tutorialStartTime = null;
}

// Tutorial timer - starts on first keystroke
export function startTutorialTimer(): void {
  if (tutorialStartTime === null) {
    tutorialStartTime = Date.now();
  }
}

export function getTutorialElapsedTime(): number {
  if (tutorialStartTime === null) return 0;
  return Date.now() - tutorialStartTime;
}
