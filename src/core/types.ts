// Core type definitions for TypeGarden
// Based on Game Programming Patterns by Robert Nystrom

export type TutorialPhase = 'intro' | 'mechanics' | 'fever' | 'stats' | null;

export type GoldenReward = 1 | 2 | 3;

export interface FeverStats {
  startTime: number;
  goldenCaptures: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
  currentChain: number;
  maxChain: number;
}

// All game events - centralized pub/sub replaces callback hell
export type GameEvent =
  // Input events
  | { type: 'KEYSTROKE'; key: string; correct: boolean; wordIndex: number; charIndex: number }
  | { type: 'WORD_COMPLETE'; wordIndex: number }
  | { type: 'SESSION_STARTED'; mode: 'tutorial' | 'endless' }
  | { type: 'SESSION_ENDED' }

  // Golden letter events
  | { type: 'GOLDEN_SPAWNED'; wordIndex: number; charIndex: number; reward: GoldenReward; fadeDuration: number }
  | { type: 'GOLDEN_CAPTURED'; reward: GoldenReward; wordIndex: number; charIndex: number }
  | { type: 'GOLDEN_EXPIRED' }
  | { type: 'GOLDEN_PASSED'; wordIndex: number; charIndex: number }

  // Green letter events
  | { type: 'GREEN_CAPTURED' }
  | { type: 'GREEN_EXPIRED' }

  // Sol/currency events
  | { type: 'SOL_EARNED'; amount: number; total: number; source: 'base' | 'golden' | 'bonus' }

  // Tutorial events
  | { type: 'PHASE_CHANGED'; from: TutorialPhase; to: TutorialPhase }
  | { type: 'TUTORIAL_COMPLETE' }

  // Fever mode events
  | { type: 'FEVER_STARTED' }
  | { type: 'FEVER_ENDED'; stats: FeverStats; wpm: number; accuracy: number }
  | { type: 'CHAIN_UPDATED'; current: number; max: number }

  // UI events
  | { type: 'WORDS_RENDER_REQUESTED' }
  | { type: 'SOL_BAR_POP' }
  | { type: 'SCREEN_GLOW' };

// Extract event type string for type-safe subscriptions
export type GameEventType = GameEvent['type'];

// Helper to extract event payload by type
export type GameEventPayload<T extends GameEventType> = Extract<GameEvent, { type: T }>;
