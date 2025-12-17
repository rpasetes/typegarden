# Standard Mode Implementation Plan

## Overview

Implement the core standard mode gameplay loop: endless typing with sol economy.

**Scope (per user):**
- Base sol + golden letters only (defer streaks, accuracy modifier)
- No event letters (defer to separate PR)
- No upgrade modal (defer to design review)
- Mode switching punted (standard mode only for now)

---

## PR Breakdown

### PR 1: Standard Mode + Sol Collection
**Goal:** Endless typing stream with base sol earning and sol bar display

**New Files:**
- `src/sol.ts` - Sol state management and persistence

**Modified Files:**
- `src/garden.ts` - Add `lifetimeSol: number` to GardenState
- `src/typing.ts` - Add `appendWords()`, remove run termination for standard mode, add sol earning hook
- `src/words.ts` - Support dynamic word generation batches
- `src/ui.ts` - Add sol bar display (garden icon + circular progress ring)
- `src/main.ts` - Start standard mode by default
- `src/style.css` - Sol bar styling

**Key Changes:**
1. **Endless stream:** Words append when player approaches end of current batch (10 words remaining → generate 20 more)
2. **Sol earning:** 1 sol per word completed
3. **Sol bar:** Garden icon (bottom-right) with circular progress ring showing session sol
4. **Persistence:** Lifetime sol saved to localStorage via GardenState

**Commits:**
1. Add sol state module with session/lifetime tracking
2. Add word appending to typing engine
3. Remove run termination, make typing endless
4. Add sol bar UI (garden icon + ring)
5. Wire sol earning to word completion

---

### PR 2: Golden Letters
**Goal:** Primary sol earning mechanic - chase golden letters ahead of cursor

**New Files:**
- `src/golden.ts` - Golden letter spawn logic, capture detection, reward calculation

**Modified Files:**
- `src/typing.ts` - Track golden positions, detect captures on keystroke
- `src/ui.ts` - Golden letter styling
- `src/sol.ts` - Golden capture rewards (tiered by distance)
- `src/style.css` - Golden glow effect

**Key Changes:**
1. **Spawn logic:** Every ~20 characters typed, spawn golden letter 3-15 chars ahead
2. **Visual:** Character glows gold (CSS glow/pulse)
3. **Capture:** When player types the golden character, reward sol based on distance tier
4. **Distance tiers (farther = harder = more reward):**
   - 3-5 chars ahead: 1 sol (easy catch)
   - 6-10 chars ahead: 2 sol (medium)
   - 11-15 chars ahead: 3 sol (hard catch)
5. **Expiry:** Golden letters fade after ~5 seconds if not reached

**Commits:**
1. Add golden letter state tracking
2. Implement spawn logic (every N chars, random position ahead)
3. Add golden letter rendering (gold glow)
4. Implement capture detection and tiered rewards
5. Add expiry/fade for missed golden letters

---

## Architecture

### Sol State
```typescript
// src/sol.ts
interface SolState {
  sessionSol: number;      // Current session earnings (resets on reload)
  lifetimeSol: number;     // Persisted total
}

// Earning functions
function earnBaseSol(): void;           // +1 sol per word
function earnGoldenSol(tier: number): void;  // +1/2/3 sol by tier
```

### Golden Letter Tracking
```typescript
// src/golden.ts
interface GoldenLetter {
  wordIndex: number;
  charIndex: number;
  spawnedAt: number;       // Timestamp for expiry
  reward: 1 | 2 | 3;       // Sol reward (based on distance at spawn)
}

// Track active golden letters (usually just 1 at a time)
let activeGolden: GoldenLetter | null = null;
```

### Typing Integration
```typescript
// Modified handleSpace() in typing.ts
function handleSpace(): void {
  // ... existing word completion logic ...

  // Sol earning hook
  onWordComplete?.();  // Triggers earnBaseSol()

  // Check for word append
  if (wordsRemaining() < 10) {
    appendWords(generateWords({ type: 'common', count: 20 }));
  }
}

// Modified handleCharacter() in typing.ts
function handleCharacter(char: string): void {
  // ... existing logic ...

  // Golden capture check
  if (isGoldenPosition(wordIndex, charIndex)) {
    captureGolden();  // Triggers earnGoldenSol()
  }
}
```

---

## Files Changed Summary

| File | PR 1 | PR 2 |
|------|------|------|
| `src/sol.ts` | new | modify |
| `src/golden.ts` | - | new |
| `src/garden.ts` | modify | - |
| `src/typing.ts` | modify | modify |
| `src/words.ts` | modify | - |
| `src/ui.ts` | modify | modify |
| `src/main.ts` | modify | - |
| `src/style.css` | modify | modify |

---

## Design Decisions Made

- **Word append trigger:** 10 words remaining → generate 20 more
- **Golden spawn rate:** Every ~20 characters typed
- **Distance rewards:** Inverted (farther = harder = more sol)
- **Mode switching:** Punted (standard mode only, classic mode preserved in code for future)
- **Upgrades:** Punted (just collect sol, no upgrade modal)

---

## Future PRs (Deferred)

### PR 3: Sol Bar → Tree Growth
- Sol bar fills → tree count increases
- Visual: tree grows/changes state on threshold
- Threshold scaling TBD

### PR 4: Time Trial Event (Green Letter)
- Green letter spawns further ahead than gold
- Catching triggers 50-word harvest run
- Denser golden spawns during trial
- Results flash on completion

### PR 5: Streak System
- Track consecutive golden captures
- Multiplier tiers: 3→1.25x, 5→1.5x, 10→2x, 20+→2.5x
- Streak breaks on: missed golden, backspace error
- Streak counter UI (appears at 3+)

### PR 6: Accuracy Modifier
- Rolling accuracy over last 50 characters
- Modifier applied to all sol gains:
  - 98%+: 1.5x
  - 95-97%: 1.25x
  - 90-94%: 1x
  - 80-89%: 0.75x
  - <80%: 0.5x

---

## Open Design Questions

- **Mode switching:** How to toggle between standard/classic mode (command palette? keyboard shortcut? menu?)
- **Command palette:** General input system for commands/modes?
- **Upgrade modal:** When/how upgrades are surfaced (sol threshold? tree milestones? separate flow?)
- **Additional events:** Blue (Zen), Purple (Rhythm), Red (Chaos) - mechanics TBD
