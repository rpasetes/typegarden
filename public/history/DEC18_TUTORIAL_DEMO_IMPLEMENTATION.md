# TYPEGARDEN — Tutorial Demo System Implementation

**Date:** December 18, 2025

**Feature:** Tutorial Demo System for TypeGarden

---

## Overview

The Tutorial Demo System is a three-phase onboarding experience that introduces new players to TypeGarden's core mechanics through progressive disclosure. It walks players through typing basics, sol generation, golden letter collection, and fever rush mode before transitioning into endless standard gameplay.

---

## Tutorial Flow

### Phase 1: Intro (Welcome)

**Prompt:**
```
welcome to typegarden, a game that grows the more you type: handcrafted by russell antonie pasetes.
```

**Configuration:**
- Golden letters: DISABLED (`goldenEnabled: false`)
- Sol bar: HIDDEN (`solBarVisible: false`)
- Green letter: None
- Golden spawn interval: 20 (default, unused)

**Behavior:**
- Sol bar fades in when player types the final period
- Introduces basic typing mechanics without distractions
- Clean, focused introduction to the interface

**Transition:** Automatically advances to Phase 2 upon completion

---

### Phase 2: Mechanics (Teaching Core Systems)

**Prompt:**
```
every correct word you type gains you more sol. think of it as sunlight for your garden. you are free to make any mistakes, as long as you keep moving forward. over time you will notice golden letters fade into view as you continue typing. catch them in time and you'll gain a burst of sol for your garden. be sure to stay in flow, these characters can be quite tricky to catch if you're not careful. sometimes, rarer characters appear that are colored differently from the usual golden letter! pop them for something special,
```

**Configuration:**
- Golden letters: ENABLED (`goldenEnabled: true`)
- Sol bar: VISIBLE (`solBarVisible: true`)
- Green letter: Positioned at "!" character (deterministic)
- Golden spawn interval: 20 (normal spawn rate)

**Golden Letter System:**
- Spawns naturally every ~20 characters typed
- Dynamic fade duration based on typing speed (4s base, modified by WPM)
- Reward tiers: 1 sol (11-15 chars ahead), 2 sol (6-10 chars), 3 sol (3-5 chars)
- Fade accelerates by 25% on typo
- Instantly expires when word is skipped with mistakes

**Green Letter Trigger:**
- Positioned deterministically at the "!" character in prompt
- Renders with green color (#b8bb26) and infinite pulse animation
- Glowing text-shadow effect (0 0 8px)
- Capturing green letter triggers transition to Phase 3 (Fever Rush)

**Transition:** Green letter capture triggers Phase 3

---

### Phase 3: Fever Rush (High-Density Golden Letters)

**Prompt:**
```
placeholder text for fever mode demo content that will be provided later and should be approximately one hundred words in length to match the fever rush duration specification from the tutorial plan document
```
(Note: Final 100-word message TBD)

**Configuration:**
- Golden letters: ENABLED with 2x density (`goldenSpawnInterval: 10`)
- Sol bar: VISIBLE
- Green letter: None
- Golden spawn interval: 10 (doubled spawn rate for intense experience)

**Fever Stats Tracking:**
- Start time recorded when phase begins
- Tracks golden captures (incremented on each capture)
- Tracks correct keystrokes
- Tracks incorrect keystrokes
- Calculates WPM: `(correctKeystrokes / 5) / minutes`
- Calculates accuracy: `(correctKeystrokes / totalKeystrokes) * 100`

**Transition:** Automatically advances to Phase 4 upon completion

---

### Phase 4: Stats Modal & Sol Redemption

**Modal Display:**
```
┌─────────────────────────────────┐
│         [WPM]  [ACC%]  [GOLDEN] │
│       3-column stat display     │
│                                 │
│  press space to redeem sol      │
└─────────────────────────────────┘
```

**Visual Design:**
- Large accent-colored stat values (3rem font-size)
- Small uppercase gray labels (0.875rem)
- Pulsing "press space to redeem sol" prompt (opacity 0.5-1)
- Dark overlay background (rgba(40, 40, 40, 0.95))

**Behavior:**
- Shows WPM, accuracy %, and golden captures from fever rush
- Space key triggers sol burst celebration
- Modal fades out (300ms)
- Celebration particles would spawn (CSS defined, JS hook pending)

**Transition:** Marks tutorial as complete, transitions to endless standard mode with "enjoy" as first word

---

## System Architecture

### State Management

**Tutorial State** (`src/tutorial.ts`):
```typescript
type TutorialPhase = 'intro' | 'mechanics' | 'fever' | 'stats' | null;

interface TutorialPhaseConfig {
  words: string[];
  goldenEnabled: boolean;
  goldenSpawnInterval: number;
  greenLetterPosition: { wordIndex: number; charIndex: number } | null;
  solBarVisible: boolean;
}

interface FeverStats {
  startTime: number;
  goldenCaptures: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
}
```

**Garden State** (`src/garden.ts`):
```typescript
interface GardenState {
  tutorialComplete: boolean;  // Persisted to localStorage
  tutorialBeat: 0 | 1 | 2 | 3;
  // ... other state
}
```

Tutorial completion is persisted across page refreshes via localStorage (`tutorialComplete` flag).

---

## Files Modified

### New Files

**`src/tutorial.ts`**
- Tutorial state machine (phase management)
- Prompt text constants (TUTORIAL_PROMPTS)
- Phase configuration system (getTutorialConfig)
- Fever stats tracking (FeverStats interface)
- Phase transition logic (advancePhase)
- Green letter position finder (findGreenLetterPosition)
- Callbacks: onPhaseChange, onFeverEnd

**`src/green.ts`**
- Green letter state management
- Position tracking (wordIndex, charIndex)
- Capture detection and callback
- Active green letter getter/setter

---

### Modified Files

**`src/golden.ts`**
- Added `setGoldenEnabled(boolean)` for tutorial control
- Added `setSpawnInterval(number)` for fever mode 2x density
- Added `resetSpawnInterval()` to restore default (20)
- Existing spawn logic adapted for configurable intervals

**`src/ui.ts`**
- Added `hideSolBar()` for intro phase
- Added `fadeInSolBar()` for mechanics phase transition
- Added `renderTutorialStatsModal()` for fever results display
- Green letter rendering in `renderWords()`:
  - Checks `isGreenPosition(wordIndex, charIndex)`
  - Applies `.green` CSS class for styling
  - Preserves green animation state across renders

**`src/typing.ts`**
- Added green letter capture detection in `handleCharacter()`
- Calls `captureGreen()` when green position typed correctly
- Tutorial mode flag (currently unused, reserved for future)

**`src/main.ts`**
- Tutorial orchestration (not yet implemented)
- Will integrate tutorial system with main game loop
- Will handle phase transitions and callbacks

**`src/particles.ts`**
- Existing: `spawnGoldenParticles()` for golden letter captures
- Existing: `spawnRewardText()` for floating +X sol text
- Reserved: Celebration burst particles (CSS defined, JS pending)

---

### Styling

**`src/style.css`**

**Green Letter Animation:**
```css
.char.green {
  color: #b8bb26;
  animation: green-pulse 1s ease-in-out infinite;
  text-shadow: 0 0 8px #b8bb26;
}

@keyframes green-pulse {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 8px #b8bb26;
  }
  50% {
    opacity: 0.8;
    text-shadow: 0 0 16px #b8bb26, 0 0 24px #b8bb26;
  }
}
```

**Sol Bar Hidden State:**
```css
.sol-bar.hidden {
  opacity: 0;
  transition: opacity 0.5s ease;
}
```

**Tutorial Stats Modal:**
```css
.tutorial-stats-modal {
  position: fixed;
  inset: 0;
  background: rgba(40, 40, 40, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.5s ease;
}

.tutorial-stats-grid {
  display: flex;
  gap: 3rem;
  margin-bottom: 2rem;
}

.tutorial-stat-value {
  font-size: 3rem;
  font-weight: 500;
  color: var(--accent);
}

.tutorial-redeem-prompt {
  color: var(--text-dim);
  font-size: 1rem;
  animation: pulse 2s ease-in-out infinite;
}
```

**Celebration Particles:**
```css
.celebration-particle {
  position: fixed;
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 0 15px var(--accent), 0 0 30px var(--accent);
  animation: celebration-flight 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes celebration-flight {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  20% {
    transform: translate(var(--burst-x), var(--burst-y)) scale(1.5);
    opacity: 1;
  }
  100% {
    transform: translate(var(--target-x), var(--target-y)) scale(0.3);
    opacity: 0;
  }
}
```

---

## Key Implementation Details

### Tutorial Detection

Tutorial is shown when `GardenState.tutorialComplete === false` (loaded from localStorage).

Check function:
```typescript
export function shouldShowTutorial(garden: GardenState): boolean {
  return !garden.tutorialComplete;
}
```

### Phase Transitions

State machine in `tutorial.ts`:
```typescript
export function advancePhase(): TutorialPhase {
  switch (currentPhase) {
    case 'intro': return 'mechanics';
    case 'mechanics': return 'fever' (also calls startFeverTracking());
    case 'fever': return 'stats' (also calls endFeverTracking());
    case 'stats': return null (tutorial complete);
  }
}
```

### Green Letter Mechanics

**Position Finding:**
```typescript
function findGreenLetterPosition(): { wordIndex, charIndex } | null {
  // Searches for "!" in mechanics prompt
  // Returns position for deterministic green letter placement
}
```

**Rendering:**
- UI checks `isGreenPosition(wordIndex, charIndex)` during character render
- Applies `.green` CSS class
- Preserves animation state to prevent re-triggering on each render

**Capture:**
- Detected in typing system when correct character typed at green position
- Calls `captureGreen()` → triggers phase transition callback

### Fever Mode Stats

**Tracking:**
```typescript
interface FeverStats {
  startTime: number;
  goldenCaptures: number;        // Incremented on each golden capture
  correctKeystrokes: number;     // For WPM and accuracy
  incorrectKeystrokes: number;   // For accuracy calculation
}
```

**WPM Calculation:**
```typescript
const duration = Date.now() - feverStats.startTime;
const minutes = duration / 60000;
const wpm = Math.round((correctKeystrokes / 5) / minutes);
```

**Accuracy Calculation:**
```typescript
const total = correctKeystrokes + incorrectKeystrokes;
const accuracy = Math.round((correctKeystrokes / total) * 100);
```

### Golden Letter Spawn Rate

**Normal (Phase 2):** 20 characters between spawns
**Fever (Phase 3):** 10 characters between spawns (2x density)

Configured per-phase via `goldenSpawnInterval` in `TutorialPhaseConfig`.

### Sol Burst Celebration

**Planned Implementation:**
1. Stats modal shows fever results
2. Player presses Space
3. Modal fades out
4. Celebration particles spawn from center screen
5. Particles burst outward then converge on sol bar
6. Sol count animates up to final total
7. Transition to endless mode

**Current Status:**
- CSS animations defined (`.celebration-particle`)
- Modal rendering implemented (`renderTutorialStatsModal()`)
- Space key handler implemented (triggers `onRedeem()` callback)
- Particle spawn function pending (reserved in `particles.ts`)

---

## Integration Points

### Main Game Loop

Tutorial system integrates via callbacks:

```typescript
// Phase change callback
setOnPhaseChange((phase: TutorialPhase) => {
  // Update UI based on phase
  // Configure systems (golden, sol bar visibility)
});

// Fever end callback
setOnFeverEnd((stats: FeverStats, wpm: number, accuracy: number) => {
  // Show stats modal
  // Prepare for sol redemption celebration
});
```

### Green Letter → Fever Transition

```typescript
// In green.ts
setOnGreenCapture(() => {
  // Tutorial system advances from 'mechanics' to 'fever'
  advancePhase();
});
```

### Tutorial Completion → Standard Mode

After stats modal space press:
1. Mark `tutorialComplete: true` in GardenState
2. Save to localStorage
3. Generate new words starting with "enjoy"
4. Reset tutorial state machine
5. Enable all standard mode features

---

## Design Principles

### Progressive Disclosure
- Intro: Just type, no distractions
- Mechanics: Introduce sol and golden letters gradually
- Fever: Show what mastery feels like at 2x density
- Stats: Celebrate achievement before open gameplay

### Deterministic Green Letter
- Always spawns at "!" in mechanics prompt
- Ensures every player experiences fever rush trigger
- No RNG in tutorial—predictable, reliable teaching

### Natural Teaching
- No explicit instructions or tutorials text
- Learn by experiencing
- Green letter presence implies "something special"
- Fever rush teaches golden letter value through density

### Graceful Transition
- Stats modal provides closure on tutorial
- "press space to redeem sol" implies agency
- Celebration particles reward completion
- "enjoy" as first endless word sets tone for continued play

---

## Future Enhancements

### Pending Implementation
- [ ] Tutorial orchestration in `main.ts`
- [ ] Celebration particle spawn function in `particles.ts`
- [ ] Final 100-word fever prompt text
- [ ] Sol count animation on redemption
- [ ] Audio cues for green letter spawn and fever start

### Potential Extensions
- Skip tutorial option for returning players (localStorage check)
- Tutorial replay command for testing
- Alternative tutorial paths based on detected skill level
- Contextual hints for struggling players (>5 mistakes in intro)

---

## Testing Notes

### Manual Test Flow
1. Clear localStorage to reset `tutorialComplete` flag
2. Refresh page → should start at intro phase
3. Type intro prompt → sol bar should fade in at final period
4. Complete intro → should advance to mechanics phase
5. Type until green "!" appears → should have pulse animation
6. Capture green letter → should transition to fever phase
7. Complete fever prompt → should show stats modal
8. Press Space → should trigger celebration and transition to endless

### Edge Cases
- Backspacing past green letter position (should preserve green state)
- Typo on green letter itself (should not capture, continue as normal)
- Multiple golden letters during fever (should track all captures)
- Player tabs away during fever (activeTime tracking excludes AFK)

---

## Performance Considerations

### Render Optimization
- Green letter state preservation prevents animation restart on re-render
- Golden fade duration calculated once on spawn, not per frame
- Particle cleanup scheduled via setTimeout to prevent memory leaks
- Stats tracked incrementally, calculated once at phase end

### State Management
- Tutorial state isolated in dedicated module
- Minimal coupling with main game state
- Callbacks prevent tight integration dependencies
- LocalStorage sync only on tutorial completion

---

## Accessibility

### Keyboard-Only Navigation
- Entire tutorial completable via typing
- No mouse interaction required
- Space key for modal progression (universal)

### Visual Feedback
- Green letter: High-contrast pulse animation with text-shadow
- Golden letters: Fade animation indicates urgency
- Stats modal: Large text, clear hierarchy
- Sol bar: Persistent visual feedback for progress

### Error Tolerance
- Mistakes allowed, explicitly stated in mechanics prompt
- No failure states in tutorial
- Backspace always available
- Green letter remains visible until captured

---

## Related Documentation

- `DEC11_TYPEGARDEN_V1_TUTORIAL_SPEC.md` - Original tutorial design
- `DEC16_TYPEGARDEN_STANDARD_MODE.md` - Post-tutorial endless mode spec
- `DEC16_TYPEGARDEN_STANDARD_PLAN.md` - Standard mode implementation plan

---

## Implementation Status

**Phase 1 (Intro):** ✅ Complete
- Prompt defined
- Configuration system working
- Sol bar fade-in implemented

**Phase 2 (Mechanics):** ✅ Complete
- Prompt defined
- Golden letter system integrated
- Green letter rendering working
- Green letter positioning deterministic

**Phase 3 (Fever Rush):** ⚠️ Partially Complete
- Configuration system working (2x density)
- Stats tracking implemented
- Placeholder prompt (final text pending)

**Phase 4 (Stats Modal):** ⚠️ Partially Complete
- Modal rendering implemented
- Space key handler working
- Celebration particles CSS defined
- Particle spawn function pending

**Integration:** 🚧 In Progress
- Tutorial state machine complete
- Callbacks defined
- Main.ts orchestration pending
- Endless mode transition pending

---

**Last Updated:** December 18, 2025
**Status:** Core systems implemented, integration in progress
**Next Steps:** Main.ts orchestration, celebration particles, final fever prompt text
