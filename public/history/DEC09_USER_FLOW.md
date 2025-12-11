# TypeGarden — User Flow

## Overview

The tutorial is a 3-beat introduction that teaches by doing. Players type to proceed, choose to upgrade, and emerge with a unique fingerprint of three upgrades that define their starting garden.

---

## Tutorial Flow

### Beat 1: The Hook
**Text length:** Short (~20-30 words)
**Purpose:** Get to the upgrade modal fast. Show players this isn't just a typing test.

**After completion:** First upgrade choice appears
- **Cosmetic:** Palette change
- **Mechanical:** Timer mode
- **Data:** Live WPM indicator

### Beat 2: The Settle
**Text length:** Medium (~50-70 words)
**Purpose:** Let players feel the typing. Get comfortable with the rhythm.

**After completion:** Second upgrade choice appears
- Second-tier options from each seed
- Player now has 2 upgrades active

### Beat 3: The Commit
**Text length:** Longer (~100+ words)
**Purpose:** Full immersion. This is what playing feels like.

**After completion:** Third upgrade choice — **seed lock-in**
- This choice determines which tree grows going forward
- Player now has 3 upgrades (their "fingerprint")
- Tutorial complete

---

## Error Handling (Tutorial Mode)

The tutorial gently nudges correction without blocking:

1. Incorrect characters highlight in red
2. Player can continue typing
3. At word end, if errors exist, cursor stays on that word
4. Subtle visual feedback (pulse/shake) suggests "go back"
5. No hard walls — friction is discoverable, not enforced

This keeps the experience inviting and curious.

---

## Post-Tutorial: The Garden Grows

### Progression Currency
`totalWordsTyped` is the underlying currency, not runs completed.

The more you type → the more seeds you encounter → the more your garden grows.

### Upgrade Pacing
- Upgrades appear based on word thresholds (e.g., every ~500 words typed)
- Not tied to run completion — rewards engagement over task completion

### The Fingerprint
Your first three choices persist as your initial garden configuration.

```typescript
interface GardenState {
  // Your permanent collection
  unlockedUpgrades: string[];  // e.g., ['cosmetic.palette', 'mechanical.timer', 'data.wpm']

  // Your current configuration (can toggle)
  activeUpgrades: string[];

  // The currency
  totalWordsTyped: number;
}
```

### Pruning
- Any upgrade can be toggled off
- `unlockedUpgrades` is permanent — you earned it
- `activeUpgrades` is your current garden — reshape it anytime
- Pruning is curation, not loss

---

## The Loop

```
type more
  → encounter more seeds
    → grow your garden
      → prune what doesn't fit
        → repeat
```

---

## Open Questions (for playtesting)

1. What word threshold feels right for upgrade pacing?
2. How obvious should the error correction nudge be?
3. Should the third choice explicitly say "this shapes your path"?
4. Do players understand they can prune, or does it need tutorialization?

---

*"Your garden. Reshape it."*
