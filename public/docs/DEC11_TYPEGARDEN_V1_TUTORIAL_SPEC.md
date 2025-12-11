# TYPEGARDEN v1 — Tutorial Spec

## Overview

The tutorial is a three-prompt typing sequence that introduces players to the game's core mechanic: **typing is how you choose, and choosing is how the game evolves.**

Each prompt ends with a modal offering three options within a category. The player types the option name to select it (or uses number keys for speedrunners). By the end of the tutorial, they've made three choices (cosmetic → analytic → mechanic) and experienced a 2-minute genre immersion. Then they loop back to the start, accumulating paths in a leaf tracker.

---

## Tutorial Prompts

**Prompt 1 — Cosmetic**
```
welcome to typegarden, a game that grows the more you type.
```
→ On completion, modal appears with cosmetic choices

**Prompt 2 — Analytic**
```
each choice you make changes the way you play. choose what feels best for you.
```
→ On completion, modal appears with analytic choices (cosmetic choice still active)

**Prompt 3 — Mechanic**
```
you can always make new choices as you continue playing. nothing is permanent. everything can be changed. all you have to do is keep typing.
```
→ On completion, modal appears with mechanic choices → leads to 2-minute genre immersion

---

## Choice Modals

Player types the option word to select. Number keys 1/2/3 work as hidden shortcuts for speedrunners. No descriptions — the words speak for themselves.

**Cosmetic Modal**
```
TYPE YOUR CHOICE

focused     terminal     comical
```

**Analytic Modal**
```
WHAT'S WORTH TRACKING?

heat     speed     accuracy
```

**Mechanic Modal**
```
HOW DO YOU WANT TO PLAY?

rhythm     zen     chaos
```

---

## The 9 Upgrades

### Cosmetic (applied immediately, persists through run)

| ID | Name | Effect |
|----|------|--------|
| `focused` | Focused | All words except current are dimmed to ~20% opacity. Current word highlighted. |
| `terminal` | Terminal | Background: `#0d0d0d`. Text: `#a8c0a8` (pale green, not neon). Cursor blinks with deliberate rhythm (0.8s on, 0.4s off). Monospace enforced. |
| `comical` | Comical | Font swap to Comic Code or similar. Ligatures enabled. Slightly larger size. Warmer bg (`#faf8f5`). |

### Analytic (applied immediately, persists through run)

| ID | Name | Effect |
|----|------|--------|
| `heat` | Heat | Fixed position element. Starts empty. Each correct keystroke at >90% rolling accuracy adds 🔥. Caps at 🔥🔥🔥🔥🔥. Dropping below 80% accuracy removes one fire. Below 60% clears all. |
| `speed` | Speed | Fixed position counter. Live WPM calculation. Updates every 500ms or per word completion. |
| `accuracy` | Accuracy | Single dot indicator, fixed position. Green (`#22c55e`) >95%, yellow (`#eab308`) 80-95%, red (`#ef4444`) <80%. Smooth transitions. |

### Mechanic (2-minute immersion, recoverable failure)

| ID | Name | Implementation |
|----|------|----------------|
| `rhythm` | Rhythm | BPM: 90. Beat indicator pulses. Timing window: ±150ms. Hits build streak, misses break it but don't stop play. Display current streak and best streak. Full 2 minutes always plays out. |
| `zen` | Zen | No prompts. Empty field. Freeform typing. Previous words fade with age. No failure possible. Word count shown subtly. 2 minutes of quiet. |
| `chaos` | Chaos | Characters in untyped words mutate every 500-1500ms. Player types current state. Errors recoverable via backspace. Mutations accelerate. Full 2 minutes always plays out. Score = accuracy under pressure. |

---

## Genre Immersion Flow

```
mechanic choice typed
         ↓
   transition (brief)
         ↓
   2:00 countdown visible
         ↓
   genre-specific gameplay
   (all failures recoverable)
         ↓
   time runs out
         ↓
   end screen:
   - choices made
   - performance summary
         ↓
   [play again]
         ↓
   leaf updates → loop to prompt 1
```

---

## Leaf Tracker

**Position:** Fixed, bottom-right corner

**Visual States:**
```
🌱  0-2 unique paths touched
🌿  3-5 unique paths touched
🪴  6-8 unique paths touched
🌳  9 paths (all discovered)
```

**Interaction:** Click/tap to expand:
```
┌─────────────────────────────────┐
│  your garden has seen:          │
│                                 │
│  cosmetic   ● ○ ○               │
│  analytic   ● ● ○               │
│  mechanic   ● ○ ○               │
│                                 │
│  runs: 3                        │
└─────────────────────────────────┘
```

**localStorage Schema:**
```typescript
interface LeafState {
  runs: number;
  touched: {
    cosmetic: ('focused' | 'terminal' | 'comical')[];
    analytic: ('heat' | 'speed' | 'accuracy')[];
    mechanic: ('rhythm' | 'zen' | 'chaos')[];
  };
}

const STORAGE_KEY = 'typegarden_leaf';
```

---

## State Machine

```
IDLE
  ↓
PROMPT_1
  ↓
MODAL_COSMETIC → "TYPE YOUR CHOICE"
  ↓
PROMPT_2 [cosmetic active]
  ↓
MODAL_ANALYTIC → "WHAT'S WORTH TRACKING?"
  ↓
PROMPT_3 [cosmetic + analytic active]
  ↓
MODAL_MECHANIC → "HOW DO YOU WANT TO PLAY?"
  ↓
GENRE_IMMERSION [2 min]
  ↓
END_SCREEN
  ↓
PROMPT_1 [leaf updated]
```

---

## File Structure (suggested)

```
src/
├── main.ts                 # entry, orchestrates flow
├── typing.ts               # core typing engine
├── tutorial/
│   ├── prompts.ts          # the three prompt texts
│   ├── modal.ts            # choice modal UI
│   └── flow.ts             # tutorial state machine
├── upgrades/
│   ├── cosmetic/
│   │   ├── focused.ts
│   │   ├── terminal.ts
│   │   └── comical.ts
│   ├── analytic/
│   │   ├── heat.ts
│   │   ├── speed.ts
│   │   └── accuracy.ts
│   └── mechanic/
│       ├── rhythm.ts
│       ├── zen.ts
│       └── chaos.ts
├── leaf/
│   ├── tracker.ts          # UI component
│   └── state.ts            # localStorage logic
├── style.css
└── types.ts                # shared types
```

---

## Success Criteria

- [ ] Typing option words feels like casting a spell
- [ ] No descriptions forces players to trust their instincts
- [ ] Modal prompts escalate: command → values → desire
- [ ] Each cosmetic is immediately distinct
- [ ] Heat bar builds visible pride
- [ ] Accuracy dot feels like quiet judgment
- [ ] Mechanic modes feel like different games
- [ ] Failure stings but never ejects
- [ ] Empty leaf circles create hunger
- [ ] Players loop to fill them

---

*"the more you type, the more you get to choose how to type"*
