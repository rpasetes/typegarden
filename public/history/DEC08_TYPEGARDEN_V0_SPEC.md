# TYPEGARDEN v0 — Capstone Spec

## Concept

A minimalist typing test that secretly grows into something else. Players begin with a familiar monkeytype-style experience, complete a tutorial by typing the game's own rules, then encounter a roguelike progression system where every choice shapes what the software becomes.

The core philosophy: **typing is simultaneously the gameplay mechanic, the progression currency, and the discovery system.**

---

## v0 Scope (2 weeks)

### What we're building
1. A functional typing test that looks and feels like monkeytype zen mode
2. A tutorial sequence where players type the game's conceit
3. A first roguelike choice after tutorial completion
4. 3 seed trees with 2-3 upgrades each (proof of concept)
5. localStorage persistence

### What we're NOT building (yet)
- Account system
- Social features
- The full upgrade tree (hundreds of endpoints)
- Pruning mechanics
- Wishlist/freeform input
- Rarity system

---

## Technical Stack

```
vite + typescript
vanilla DOM (no framework needed for v0)
localStorage for state
```

No backend. No build complexity. Ship fast.

---

## Visual Design

### Aesthetic Target
Monkeytype zen mode — minimal, typographic, void-like.

### Color Palette
```css
--bg: #232427;           /* dark background */
--text-primary: #d1d0c5; /* upcoming text */
--text-typed: #ffffff;   /* correctly typed */
--text-error: #ca4754;   /* errors, incorrect */
--text-dim: #646669;     /* already typed / inactive */
--accent: #e2b714;       /* optional highlight, cursor */
```

### Typography
- Font: `Roboto Mono`, `JetBrains Mono`, or system monospace
- Size: ~1.25rem for typing area
- Line height: ~1.75 for readability
- Letter spacing: slight positive tracking

### Layout
- Centered content, max-width ~900px
- No borders, no boxes, no chrome
- Text floats in negative space
- Minimal UI elements (mode/word count in corner, subtle)

---

## Core Mechanics

### Typing Engine

**State:**
```typescript
interface TypingState {
  words: string[];           // words to type
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string[];           // what user has typed per word
  errors: number;
  startTime: number | null;
  endTime: number | null;
}
```

**Behavior:**
- Characters appear as user types (in-place, not input field)
- Correct chars → white
- Incorrect chars → red, stays visible
- Space advances to next word
- Backspace deletes within current word only (no going back to previous words)
- Word errors persist visually until word is retyped

**Metrics (tracked, not necessarily displayed):**
- WPM: `(characters / 5) / minutes`
- Raw WPM: includes incorrect
- Accuracy: `correct / total`
- Consistency: variance of WPM over time

### Word Generation

**v0 sources:**
- Common English words (top 200-1000)
- Tutorial text (hardcoded, handwritten)
- Quote mode (stretch goal)

**Structure:**
```typescript
type WordSource = 
  | { type: 'common'; count: number }
  | { type: 'tutorial' }
  | { type: 'custom'; words: string[] }
```

---

## Game Flow

### Phase 1: First Impression
Player opens the game. Sees a monkeytype-style interface.
No indication anything is different.
Default mode: 25 random common words.

### Phase 2: Tutorial Trigger
After completing 1-3 standard runs, the game surfaces the tutorial.
Could be: automatic, or a subtle prompt, or a "?" appearing.

**Tutorial text:** Player types the rules of the game itself.
This text is TBD (Russell writing it), but structurally:
- ~100-200 words
- Explains: this game grows, choices matter, what you type shapes what it becomes
- Ends with a prompt to make the first choice

### Phase 3: First Roguelike Choice
After tutorial completion, player sees 3 options:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   choose how your garden grows:                 │
│                                                 │
│   [1] COSMETIC  — change how it looks          │
│   [2] MECHANIC — change how it plays           │
│   [3] ANALYTIC — change what it tells you      │
│                                                 │
└─────────────────────────────────────────────────┘
```

Player types "1", "2", or "3" (or the word) to select.
**The selection mechanic is still typing.**

### Phase 4: Tree Progression
After seed selection, player returns to typing.
After each run (or every N runs), a new upgrade choice appears.
Upgrades branch based on seed.

---

## Upgrade Trees (v0 — Proof of Concept)

Each seed has 2-3 upgrades to demonstrate branching.

### COSMETIC Seed
```
cosmetic
├── minimal → removes all UI except text
├── dark → inverts to light-on-dark (if not already)
└── focus → dims untyped words, highlights current
```

### MECHANICAL Seed
```
mechanical
├── timed → adds countdown timer mode
├── endless → infinite mode, no word limit
└── strict → errors must be corrected before continuing
```

### DATA Seed
```
data
├── wpm-display → shows live WPM while typing
├── heatmap → shows which keys you miss most (end of run)
└── history → shows last 5 run results
```

---

## State Management

### Garden State (persisted)
```typescript
interface GardenState {
  tutorialComplete: boolean;
  seed: 'cosmetic' | 'mechanical' | 'data' | null;
  unlockedUpgrades: string[];  // e.g., ['cosmetic.minimal', 'cosmetic.focus']
  activeUpgrades: string[];    // currently enabled
  runHistory: RunResult[];
  totalWordsTyped: number;
}

interface RunResult {
  timestamp: number;
  wpm: number;
  accuracy: number;
  wordCount: number;
  duration: number;
}
```

### Persistence
```typescript
const STORAGE_KEY = 'typegarden';

function saveGarden(state: GardenState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGarden(): GardenState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}
```

---

## File Structure

```
typegarden/
├── index.html
├── src/
│   ├── main.ts           # entry point
│   ├── typing.ts         # core typing engine
│   ├── words.ts          # word generation
│   ├── garden.ts         # progression state
│   ├── upgrades.ts       # upgrade definitions & effects
│   ├── ui.ts             # DOM manipulation
│   └── style.css         # styles
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Implementation Phases

### Week 1: The Shell
**Days 1-2:** Project setup, basic typing engine
- Vite + TS scaffold
- Render words, capture keystrokes
- Basic correct/incorrect highlighting

**Days 3-4:** Polish typing feel
- Cursor/caret behavior
- Word completion logic
- Metrics calculation (WPM, accuracy)

**Days 5-7:** Visual polish
- Match monkeytype aesthetic
- Responsive layout
- Smooth animations (optional)

### Week 2: The Secret
**Days 8-9:** Tutorial system
- Tutorial text integration
- Tutorial trigger logic
- Tutorial completion detection

**Days 10-11:** Roguelike layer
- Choice UI
- Seed selection
- Tree state management

**Days 12-13:** Upgrades
- Implement 3 seeds × 2-3 upgrades each
- Upgrade effects actually modify behavior
- Persistence

**Day 14:** Polish & ship
- Bug fixes
- Edge cases
- Deploy

---

## Future Vision (Post-Capstone)

This section is not for v0, but captures the full dream:

### Expanded Trees
- Hundreds of endpoints
- Genre mutations (incremental, rhythm, social)
- Rare/legendary unlocks

### Meta-Progression
- Hades-style rerolls
- Skip upgrades for rarity boost
- Weighted upgrade preferences

### Pruning
- Remove upgrades from your garden
- Curation as gameplay
- "Your garden, your tool"

### Wishlist Mode
- Freeform typing between runs
- Influence what upgrades appear
- "I wish this had vim keybindings" → `hjkl` appears later

### Social Layer
- Showcase gardens
- "YOU CAN GROW THAT??"
- Garden sharing unlocked as late-game feature

### Persistence Evolution
- Saving is itself an unlock
- Account system as optional late feature
- Local-first by default

---

## Open Questions

1. **Tutorial trigger:** Automatic after N runs? Prompted? Always first?
2. **Choice presentation:** How much to reveal about what each seed leads to?
3. **Upgrade pacing:** Every run? Every N runs? Based on words typed?
4. **Visual feedback:** How do upgrades manifest? Subtle or obvious?
5. **Name:** "typegarden"? Something else?

---

## Success Criteria

v0 is successful if:
- [ ] Typing feels good (responsive, accurate, satisfying)
- [ ] Visually indistinguishable from "just another typing test" at first glance
- [ ] Tutorial creates an "oh wait, what?" moment
- [ ] At least one upgrade path feels meaningfully different
- [ ] Someone who sees it wants to know what other paths exist

---

*"the more you play, the more you get to choose how to play"*
