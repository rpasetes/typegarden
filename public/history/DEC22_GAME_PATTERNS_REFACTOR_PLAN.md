# TypeGarden Refactoring Plan (Original)
## Based on Game Programming Patterns by Robert Nystrom

> *"The biggest challenge facing many game programmers is completing their game. Most game projects fizzle out, overwhelmed by the complexity of their own code."*
> — Robert Nystrom, [Game Programming Patterns](https://gameprogrammingpatterns.com/)

### Approach
Single epic branch (`epic/game-patterns-refactor`), all 7 phases, merge when complete.

### Goal
Restructure from callback-centric god object architecture to clean event-driven systems.

---

## Patterns Applied

| Pattern | Solves | Applied To |
|---------|--------|------------|
| **Event Queue** | Callback hell, implicit control flow | New `EventBus` replaces 8+ callbacks |
| **State** | Scattered tutorial logic | `TutorialStateMachine` for phases |
| **Command** | 50+ line handleKeydown | Input commands (TypeChar, Backspace, Space) |
| **Component** | main.ts god object | Focused systems (Golden, Green, Sol, etc.) |
| **Observer** | UI querying game state | RenderSystem subscribes to events |

---

## Proposed Architecture

```
src/
├── core/
│   ├── Game.ts              # Replaces main.ts (10 lines)
│   ├── EventBus.ts          # Centralized pub/sub
│   └── types.ts             # Shared types
├── state/
│   └── TutorialStateMachine.ts
├── input/
│   ├── InputSystem.ts
│   └── commands/            # TypeChar, Backspace, Space
├── systems/
│   ├── TypingSystem.ts
│   ├── GoldenSystem.ts
│   ├── GreenSystem.ts
│   ├── SolSystem.ts
│   ├── FeverSystem.ts
│   └── SpeedTracker.ts      # Breaks typing<->golden circular dep
├── render/
│   ├── RenderSystem.ts      # Subscribes to events
│   ├── WordRenderer.ts
│   └── UIRenderer.ts
└── content/
    ├── words.ts
    └── tutorial-prompts.ts
```

---

## Implementation Phases

### Phase 1: Foundation (Low Risk)
- Create `EventBus` with typed events
- Dual-write: emit events alongside existing callbacks
- No breaking changes

**Files**: NEW `src/core/EventBus.ts`, `src/core/types.ts`

### Phase 2: Extract Systems (Medium Risk)
- Extract focused systems from monoliths
- Order: sol.ts → green.ts → golden.ts → tutorial.ts → typing.ts
- Original modules become thin wrappers

**Files**: NEW `src/systems/*.ts`

### Phase 3: Command Pattern (Medium Risk)
- Create InputCommand interface
- Implement TypeCharacterCommand, BackspaceCommand, SpaceCommand
- Commands emit events, don't call functions directly

**Files**: NEW `src/input/InputSystem.ts`, `src/input/commands/*.ts`

### Phase 4: State Machine (Medium Risk)
- Formalize tutorial phase transitions
- Explicit guards and actions per transition
- Replace scattered advancePhase() logic

**Files**: NEW `src/state/TutorialStateMachine.ts`

### Phase 5: Observer Rendering (High Risk)
- RenderSystem subscribes to events
- Remove all direct state queries from ui.ts
- Break ui.ts into focused renderers

**Files**: NEW `src/render/*.ts`, REFACTOR `src/ui.ts`

### Phase 6: Game Orchestrator (High Risk)
- Game class instantiates all systems
- main.ts becomes `new Game().start()`
- Delete deprecated modules

**Files**: NEW `src/core/Game.ts`, SHRINK `src/main.ts`

### Phase 7: Cleanup
- Remove deprecated callbacks
- Add tests
- Document architecture

---

## CSS Animations Impact

The CSS stays unchanged - animations are class-driven. The refactor changes WHO adds classes, not HOW they work.

| Animation | Trigger | After Refactor |
|-----------|---------|----------------|
| `char-fade-in` | `.char-new` class | WordRenderer adds on new chars |
| `golden-fade` | `.golden` class + `--golden-fade-duration` var | GoldenSystem emits event → RenderSystem applies |
| `green-pop/pulse` | `.green` class | GreenSystem emits event → RenderSystem applies |
| `sol-pop` | `.pop` class on sol-bar | SolSystem emits SOL_EARNED → UIRenderer applies |
| `chain-bump` | `.bump` class on counter | FeverSystem emits CHAIN_UPDATED → UIRenderer applies |
| `screen-flash` | `.screen-glow` element | FeverSystem emits FEVER_ENDED → ParticleRenderer creates |
| `particle-flight` | Dynamic elements from particles.ts | ParticleRenderer (unchanged, already pure) |

**Key change**: Currently ui.ts directly queries `getActiveGolden()`, `isGreenPosition()` to decide classes. After refactor, RenderSystem receives events WITH the data needed (e.g., `GOLDEN_SPAWNED { wordIndex, charIndex }`) and applies classes based on event payload.

**No CSS changes required** - only the JS trigger points move to RenderSystem.

---

## Critical Files to Modify

1. `src/main.ts` (366 lines) → decompose into Game + systems
2. `src/typing.ts` (462 lines) → extract InputSystem + TypingSystem
3. `src/ui.ts` (774 lines) → decompose into RenderSystem + renderers
4. `src/golden.ts` (275 lines) → convert to event-based GoldenSystem
5. `src/tutorial.ts` (257 lines) → extract TutorialStateMachine

---

## Circular Dependency Fix

**Current**: typing.ts ↔ golden.ts

**Solution**: Extract `SpeedTracker` class
- TypingSystem records keystrokes to SpeedTracker
- GoldenSystem queries SpeedTracker for speed
- No circular import

---

## Event Types

```typescript
type GameEvent =
  | { type: 'KEYSTROKE'; key: string; correct: boolean }
  | { type: 'GOLDEN_SPAWNED'; wordIndex: number; charIndex: number }
  | { type: 'GOLDEN_CAPTURED'; reward: number }
  | { type: 'GREEN_CAPTURED' }
  | { type: 'SOL_EARNED'; amount: number; total: number }
  | { type: 'PHASE_CHANGED'; from: Phase; to: Phase }
  | { type: 'CHAIN_UPDATED'; current: number }
  | { type: 'SESSION_STARTED' | 'SESSION_ENDED' };
```

---

## Testing & Commit Strategy

Each phase tracked via `bd create`, tested, then committed to epic.

**Testing approach**: Use `dev-browser` skill to automate browser testing - navigate to localhost, simulate typing, verify animations and state changes visually.

### Phase 1: Foundation
```bash
bd create "Add EventBus with typed events"
```
**Test**: Console log all events, verify existing callbacks still work
**Commit**: `Add EventBus infrastructure (dual-write with callbacks)`

### Phase 2: Extract Systems
```bash
bd create "Extract SolSystem from sol.ts"
bd create "Extract GoldenSystem from golden.ts"
bd create "Extract GreenSystem from green.ts"
bd create "Extract FeverSystem from tutorial.ts"
bd create "Extract TutorialSystem from tutorial.ts"
bd create "Extract TypingSystem from typing.ts"
```
**Test**: Each system in isolation - emit events, verify state changes
**Commits**: One per system extraction

### Phase 3: Command Pattern
```bash
bd create "Implement InputSystem with commands"
```
**Test**: Simulate keystrokes via commands, verify same behavior
**Commit**: `Replace handleKeydown with InputSystem commands`

### Phase 4: State Machine
```bash
bd create "Implement TutorialStateMachine"
```
**Test**: Verify all phase transitions match current behavior
**Commit**: `Formalize tutorial phases with state machine`

### Phase 5: Observer Rendering
```bash
bd create "Implement RenderSystem (event-driven)"
bd create "Extract WordRenderer from ui.ts"
bd create "Extract UIRenderer from ui.ts"
```
**Test**: Full playthrough, verify all animations trigger correctly
**Commits**: One per renderer extraction

### Phase 6: Game Orchestrator
```bash
bd create "Create Game class orchestrator"
```
**Test**: Full tutorial + endless flow, no regressions
**Commit**: `Replace main.ts with Game orchestrator`

### Phase 7: Cleanup
```bash
bd create "Remove deprecated callback code"
```
**Test**: Final playthrough, all tests pass
**Commit**: `Remove deprecated modules and callbacks`

---

## Success Criteria

- [ ] main.ts under 20 lines
- [ ] No circular dependencies
- [ ] All UI updates via events
- [ ] Each system independently testable
- [ ] Tutorial phases in explicit state machine
- [ ] Input handled via commands
- [ ] All beads closed with commit references

---

*Plan created December 22, 2025*
*Based on Game Programming Patterns by Robert Nystrom*
