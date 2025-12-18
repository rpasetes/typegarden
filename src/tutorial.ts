// Tutorial System
// Guides new players through intro, mechanics, and fever rush

import type { GardenState } from './garden.ts';

export type TutorialPhase = 'intro' | 'mechanics' | 'fever' | 'stats' | null;

export interface TutorialPhaseConfig {
  words: string[];
  goldenEnabled: boolean;
  goldenSpawnInterval: number;
  goldenStartWordIndex: number;
  greenLetterPosition: { wordIndex: number; charIndex: number } | null;
  solBarVisible: boolean;
}

export interface FeverStats {
  startTime: number;
  goldenCaptures: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
}

// Tutorial prompt text content
export const TUTORIAL_PROMPTS = {
  intro: "welcome to typegarden, a game that grows the more you type: handcrafted by russell antonie pasetes.",
  mechanics: "every correct word you type gains you more sol. think of it as sunlight for your garden. you are free to make any mistakes, as long as you keep moving forward. over time you will notice golden letters appear as you type. catch them in time to gain a sol burst. stay in flow and you will catch more golden letters. sometimes, rarer characters appear that are different from the usual golden letter. type them to trigger something special!",
  fever: "placeholder text for fever mode demo content that will be provided later and should be approximately one hundred words in length to match the fever rush duration specification from the tutorial plan document", // TBD: Custom 100-word demo message
};

// Current tutorial state
let currentPhase: TutorialPhase = null;
let feverStats: FeverStats | null = null;

// Callbacks
let onPhaseChangeCallback: ((phase: TutorialPhase) => void) | null = null;
let onFeverEndCallback: ((stats: FeverStats, wpm: number, accuracy: number) => void) | null = null;

export function setOnPhaseChange(callback: (phase: TutorialPhase) => void): void {
  onPhaseChangeCallback = callback;
}

export function setOnFeverEnd(callback: (stats: FeverStats, wpm: number, accuracy: number) => void): void {
  onFeverEndCallback = callback;
}

export function shouldShowTutorial(garden: GardenState): boolean {
  return !garden.tutorialComplete;
}

export function getCurrentPhase(): TutorialPhase {
  return currentPhase;
}

export function startTutorial(): void {
  currentPhase = 'intro';
  feverStats = null;
}

export function advancePhase(): TutorialPhase {
  switch (currentPhase) {
    case 'intro':
      currentPhase = 'mechanics';
      break;
    case 'mechanics':
      currentPhase = 'fever';
      startFeverTracking();
      break;
    case 'fever':
      currentPhase = 'stats';
      endFeverTracking();
      break;
    case 'stats':
      currentPhase = null;
      break;
  }

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
      };

    case 'mechanics':
      return {
        words: TUTORIAL_PROMPTS.mechanics.split(' '),
        goldenEnabled: true,
        goldenSpawnInterval: 20, // Normal spawn rate
        goldenStartWordIndex: findSentenceStartWordIndex(4), // Golden starts at sentence 4
        greenLetterPosition: findGreenLetterPosition(),
        solBarVisible: true,
      };

    case 'fever':
      return {
        words: TUTORIAL_PROMPTS.fever.split(' '),
        goldenEnabled: true,
        goldenSpawnInterval: 10, // 2x density
        goldenStartWordIndex: 0,
        greenLetterPosition: null,
        solBarVisible: true,
      };

    default:
      return {
        words: [],
        goldenEnabled: true,
        goldenSpawnInterval: 20,
        goldenStartWordIndex: 0,
        greenLetterPosition: null,
        solBarVisible: true,
      };
  }
}

// Fever stats tracking
function startFeverTracking(): void {
  feverStats = {
    startTime: Date.now(),
    goldenCaptures: 0,
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
  };
}

function endFeverTracking(): void {
  if (!feverStats) return;

  const duration = Date.now() - feverStats.startTime;
  const minutes = duration / 60000;
  const wpm = minutes > 0 ? Math.round((feverStats.correctKeystrokes / 5) / minutes) : 0;
  const total = feverStats.correctKeystrokes + feverStats.incorrectKeystrokes;
  const accuracy = total > 0 ? Math.round((feverStats.correctKeystrokes / total) * 100) : 100;

  if (onFeverEndCallback) {
    onFeverEndCallback(feverStats, wpm, accuracy);
  }
}

export function trackFeverGoldenCapture(): void {
  if (feverStats) {
    feverStats.goldenCaptures++;
  }
}

export function trackFeverKeystroke(correct: boolean): void {
  if (feverStats) {
    if (correct) {
      feverStats.correctKeystrokes++;
    } else {
      feverStats.incorrectKeystrokes++;
    }
  }
}

export function getFeverStats(): FeverStats | null {
  return feverStats;
}

export function resetTutorial(): void {
  currentPhase = null;
  feverStats = null;
}
