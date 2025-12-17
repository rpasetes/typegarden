# TYPEGARDEN — Standard Mode Spec

## Philosophy

Standard mode is the ground. The home. An endless stream of words that you type, and in typing, grow. Everything else — modes, events, upgrades — emerges from this foundation.

The player is never *waiting* for something to happen. They're typing. Sol is always accumulating. The game is always responding.

---

## The Endless Stream

Words appear. You type them. More appear. No timer. No end state. Just practice, forever, until you decide to stop.

```
the quick brown fox jumps over the lazy dog and then
    ▲
    cursor
```

Prompts pull from word pools (initially generic, upgradable to themed pools later — code, poetry, quotes, custom).

---

## Sol Generation (Priority Order)

### 1. Golden Letter Capture (Primary)

Golden letters appear **ahead** of your cursor — close enough to chase, far enough to stretch.

| Distance from cursor | Sol reward | Window |
|---------------------|------------|--------|
| 3-5 chars ahead | 3 sol | tight |
| 6-10 chars ahead | 2 sol | comfortable |
| 11-15 chars ahead | 1 sol | generous |

**Spawn logic:** Every N characters typed, a new golden letter spawns in the "reachable future." Faster typing = more spawns = more opportunities.

**Visual:** Letter glows gold. On capture, particle burst arcs toward garden icon. Subtle *ting* sound, pitch varies by reward tier.

### 2. Streak Bonus (Secondary)

Consecutive golden captures without missing one:

| Streak | Multiplier |
|--------|------------|
| 3 | 1.25x |
| 5 | 1.5x |
| 10 | 2x |
| 20+ | 2.5x |

Streak breaks on: missed golden letter, or error that requires backspace.

**Visual:** Streak counter appears after 3, pulses gently. Garden icon glows warmer with higher streaks.

### 3. Base Typing (Passive)

Even without catching gold, typing accrues sol:

- 1 sol per word completed
- Small, steady, never zero
- Rewards presence even when not chasing

### 4. Accuracy Bonus (Modifier)

Applied to all sol gains:

| Rolling accuracy (last 50 chars) | Modifier |
|----------------------------------|----------|
| 98%+ | 1.5x |
| 95-97% | 1.25x |
| 90-94% | 1x |
| 80-89% | 0.75x |
| <80% | 0.5x |

Sloppy typing still earns. But precision compounds.

---

## Sol Bar & Upgrades

Sol fills a circular bar around the garden icon.

```
     ╭──────╮
    ╱   🌱   ╲      ← icon in center
   │  ████░░  │     ← sol progress (yellow arc)
    ╲        ╱
     ╰──────╯
```

When full:

1. Typing pauses (current word can finish)
2. Modal rises with three upgrade choices
3. Player types choice to select
4. Bar resets, threshold increases slightly
5. Typing resumes

**Threshold scaling:**

| Upgrade # in session | Sol required |
|---------------------|--------------|
| 1 | 50 |
| 2 | 75 |
| 3 | 100 |
| 4 | 150 |
| 5+ | +50 each |

---

## Event Letters

Colored letters occasionally spawn in the stream, further ahead than gold — harder to catch, optional to chase.

| Color | Event | On catch |
|-------|-------|----------|
| 🟢 Green | Time Trial | 50-word harvest run |
| 🔵 Blue | Zen | 30 sec ambient session |
| 🟣 Purple | Rhythm | 30 sec beat-synced session |
| 🔴 Red | Chaos | 30 sec high-risk session |

**Miss the letter?** It fades. Another will come. No punishment, just missed opportunity.

**Mastery:** Catch the same color 5 times → mode "takes root" → can spend sol to buy extended sessions.

---

## Event: Time Trial (50 Words)

**Trigger:** Catch a 🟢 green letter

**Format:** Type 50 words. No timer visible.

**Feel:** Golden letters spawn ahead as usual, but denser — more opportunities, more pressure. Your speed reveals itself through what you catch. Fast typists see gold everywhere, snatching letter after letter. Slower typists watch gold fade before they arrive.

The absence of a timer makes it *felt* rather than *measured*. You know how you did by how much light you gathered on the way.

**Sol Reward:**

- Base: 25 sol for completion
- Plus: all golden letters captured during the trial
- Accuracy modifier applies

**On completion:** Results flash (words completed, gold captured), particles cascade to garden, return to standard mode.

---

## Session Flow

```
player opens game
        │
        ▼
   standard mode begins
   (endless words, sol accruing)
        │
        ├── golden letters → catch for sol bursts
        │
        ├── streak building → multipliers climb
        │
        ├── sol bar fills → upgrade modal → choice → continue
        │
        ├── colored letter appears → optional event catch
        │       │
        │       └── event plays → returns to standard
        │
        └── player closes game → progress saved
                │
                └── next session: upgrades retained,
                    sol bar progress retained, streak reset
```

---

## Visual State

Always visible in standard mode:

- **Garden icon** (bottom-right) with sol ring
- **Current streak** (appears at 3+, fades when broken)
- **Active upgrades** (cosmetic applied, analytic displayed per choice)

Minimal chrome. The words are the focus. Everything else orbits.

---

## Open Questions

1. **Word pool curation** — start with common English? Themed pools as upgrades?
2. **Golden letter spawn rate** — needs playtesting. Too frequent = no chase. Too rare = frustrating.
3. **Event letter rarity** — every ~100 words? Time-based instead?
4. **Session persistence** — does sol bar carry across sessions or reset?

---

*The more you type, the more light you gather.*
