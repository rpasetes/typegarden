# Game Programming Patterns — TypeGarden Refactor

## Overview

This refactor applies patterns from *Game Programming Patterns* by Robert Nystrom to restructure TypeGarden from callback-centric architecture to clean event-driven systems.

### Patterns Applied

| Pattern | Solves | Applied To |
|---------|--------|------------|
| **Event Queue** | Callback hell, implicit control flow | `EventBus` replaces 8+ callbacks |
| **State** | Scattered tutorial logic | `TutorialStateMachine` for phases |
| **Command** | 50+ line handleKeydown | Input commands (TypeChar, Backspace, Space) |
| **Component** | main.ts god object | Focused systems (Golden, Green, Sol, etc.) |
| **Observer** | UI querying game state | `RenderSystem` subscribes to events |

---

## State Pattern

The State pattern formalizes phase transitions into explicit state classes. Each state knows:
- What actions to perform on enter/exit
- Which events it handles
- Which state to transition to

## Current Implementation

```
TutorialStateMachine
├── IdleState (null)
├── IntroState
├── MechanicsState
├── FeverState
└── StatsState
```

### Transition Events
- `START` — Begin tutorial from idle
- `PHASE_COMPLETE` — Typing finished
- `GREEN_CAPTURED` — Special letter captured (mechanics → fever shortcut)
- `STATS_DISMISSED` — Modal closed
- `RESET` — Force return to idle

### State Interface
```typescript
interface TutorialState {
  readonly phase: TutorialPhase;
  onEnter(): void;
  onExit(): void;
  getConfig(): TutorialPhaseConfig;
  handleEvent(event: TransitionEvent): TutorialState | null;
}
```

## Why This Pattern?

### Before (scattered logic)
```typescript
function advancePhase() {
  switch (currentPhase) {
    case 'intro':
      currentPhase = 'mechanics';
      break;
    case 'mechanics':
      currentPhase = 'fever';
      feverSystem.start(); // action buried in switch
      break;
    // ...
  }
}
```

### After (explicit states)
```typescript
class MechanicsState implements TutorialState {
  handleEvent(event: TransitionEvent): TutorialState | null {
    if (event === 'GREEN_CAPTURED' || event === 'PHASE_COMPLETE') {
      return new FeverState(); // transition explicit
    }
    return null; // guard: ignore other events
  }
}

class FeverState implements TutorialState {
  onEnter() {
    feverSystem.start(); // action on enter
  }
}
```

## Benefits

1. **Testable** — Pure TypeScript, no DOM dependencies
2. **Explicit** — All transitions visible in state classes
3. **Guarded** — Invalid transitions return null
4. **Extensible** — Add new states without modifying existing ones

## Extensibility to V1 Spec

The DEC11 spec describes a more complex flow:
```
IDLE → PROMPT_1 → MODAL_COSMETIC → PROMPT_2 → MODAL_ANALYTIC →
PROMPT_3 → MODAL_MECHANIC → GENRE_IMMERSION → END_SCREEN → (loop)
```

The pattern extends by:
1. Adding new state classes (`ModalCosmeticState`, `GenreImmersionState`)
2. States can carry data (e.g., selected mechanic type)
3. New events (`CHOICE_MADE`, `TIMER_COMPLETE`)
4. Guards validate choices before transitions

```typescript
class ModalCosmeticState implements TutorialState {
  handleEvent(event: TransitionEvent): TutorialState | null {
    if (event.type === 'CHOICE_MADE') {
      return new Prompt2State(event.choice);
    }
    return null;
  }
}
```

## Test Coverage

28 unit tests verify:
- Initial state
- All valid transitions
- Invalid transition rejection
- Full flow completion
- Edge cases (reset, restart)
- Config consistency per phase

Tests run in ~83ms without browser.

## Files

- `src/state/TutorialStateMachine.ts` — State machine implementation
- `src/tutorial.ts` — Thin wrapper delegating to state machine
- `tests/tutorial-state-machine.test.ts` — Unit tests

---

## Phase 5: Observer Rendering (Incremental)

Phase 5 introduced `RenderSystem` as an Observer for event-driven UI updates.

### What's Event-Driven Now
- Sol bar updates (`SOL_EARNED` → `renderSolBar()`)
- Chain counter (`CHAIN_UPDATED` → `renderChainCounter()`)
- Fever mode styling (`PHASE_CHANGED` → `setFeverMode()`)

### What's NOT Event-Driven (Intentionally Deferred)
- `renderWords()` - Still receives `TypingState` directly
- Special character detection - Still queries `getActiveGolden()`, `isGreenPosition()`
- Character class application - Hardcoded for golden/green only

### Why Deferred?
The word renderer is 200+ lines handling:
- Static word display
- Typed character state (correct/incorrect)
- Special character highlighting
- Animation timing
- Cursor positioning

Future features (rhythm mode, chaos mode) will require fundamental changes:
- Multiple special character types (purple `+`, red `*`)
- Mutable display layer (chaos mode mutations)
- Dynamic word insertion

This warrants a dedicated **Phase 8: Typing Engine Refactor** on its own branch.

---

*Part of the Game Programming Patterns refactor (Phases 1-7)*
