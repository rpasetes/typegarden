# Beads Workflow Integration - December 17, 2025

## Context

After an intensive session implementing the Golden Letters epic (24 commits, 5 branches, 5 PRs), we realized that commit history alone doesn't tell the story of *why* work was done or *how* it evolved. Beads solves this.

## The Problem

**Yesterday's workflow:**
```
commits → branches → PRs → read commit history or Greptile summaries
```

Reading 24 commits across 5 PRs to understand what happened is painful. The user wants high-level summaries, not git archaeology.

## The Solution: Beads as External Memory

**New workflow:**
```
bd create → work → bd close (with summary) → commit (code + .beads/)
```

### Key Principles

1. **Every commitable work = a bead issue**
2. **Discovered work from conversation = bead with `--deps discovered-from:<parent>`**
3. **Features that balloon = promote to epic with `bd update <id> --type epic`**
4. **Close reasons = the changelog** - written in the moment, not reconstructed later

## Golden Letters Epic Retrospective

Created retroactively to demonstrate what the workflow *would* have looked like:

```
🏔️  EPIC: Golden letters bonus system (typegarden-mde)
│
├── ⭐ Performance optimizations (typegarden-hx6)
│   ├── 📋 Hoist getActiveGolden() outside loop
│   ├── 📋 Remove setInterval re-render
│   └── 📋 Remove text-shadow for performance
│
├── ⭐ Dynamic fade animation (typegarden-9u1)
│   ├── 📋 Add typing speed tracking (rolling window)
│   ├── 📋 Calculate dynamic fade duration
│   ├── 📋 Add CSS golden fade animation
│   ├── 📋 Sync fade with expiry timeout
│   ├── 📋 Trigger re-render on expiry
│   ├── 🐛 Fix golden flicker on backspace (discovered)
│   └── 🐛 Fix division by zero in getTypingSpeed() (Greptile)
│
├── ⭐ Mistake penalties (typegarden-8eu)
│   ├── 📋 Speed up fade by 25% on typo
│   ├── 📋 Instant expire on mistaken word skip
│   ├── 📋 Mistyping golden letter expires without bonus
│   ├── 📋 Add 2s cooldown after mistakes
│   ├── 🐛 Fix timer leak in expireGolden() (Greptile)
│   └── 🐛 Fix negative timeout in onTypo() (Greptile)
│
├── ⭐ Particle effects (typegarden-bdj)
│   ├── 📋 Add particle system with CSS animations
│   ├── 📋 Scale particles by reward tier
│   └── 📋 Add floating +X reward text
│
└── 📋 Sol fixes (discovered from epic)
    ├── 📋 Only award sol for fully correct words
    ├── 📋 Persist session sol across refresh
    └── 🐛 Fix main.ts overwriting sol save
```

### Stats

| Type | Count |
|------|-------|
| Epic | 1 |
| Features | 4 |
| Tasks | 21 |
| Bugs Fixed | 6 |

### Priority Distribution

- **P0 (Critical):** 4 bugs (all from Greptile or testing)
- **P1 (High):** 18 issues
- **P2 (Medium):** 9 issues
- **P3 (Low):** 1 issue

## Benefits Realized

1. **Conversation-driven development** - User says something → immediately becomes tracked issue
2. **Dependency graphs** - `discovered-from` links show how bugs emerged from features
3. **Epic promotion** - Features can grow into epics mid-flight, same ID
4. **Session persistence** - `bd ready` shows unblocked work across sessions
5. **Parallel work coordination** - Subagents can claim issues, no conflicts
6. **One-paragraph changelogs** - Epic close reason = the summary

## Commands Reference

```bash
# Start work
bd create "Feature name" -t feature -p 1 --json
bd update <id> --status in_progress

# Discover sub-work
bd create "Found bug" -t bug -p 0 --deps discovered-from:<parent-id>

# Promote to epic
bd update <id> --type epic
bd create "Sub-feature" -t feature --deps parent-child:<epic-id>

# Complete work
bd close <id> --reason "Summary of what was done and why"

# Check status
bd ready --json          # What's unblocked?
bd list --status open    # What's in flight?
bd show <id>             # Details + close reason
```

## Key Insight

> Beads isn't just issue tracking. It's **externalized memory** that syncs with git.
> The conversation is ephemeral, but beads persists.
> I stop being a stateless tool and start being a collaborator with continuity.

## Files

- `.beads/` - Issue database (committed with code)
- `AGENTS.md` - Workflow documentation for AI agents
