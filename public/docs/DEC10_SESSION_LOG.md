# TypeGarden — Dec 10 Session Log

## Overview

Three PRs landed today, taking the typing interface from functional to polished. Focus was on feel — cursor behavior, error correction, and visual presentation.

---

## PR #3: Typing Polish

**Branch:** `feature/typing-polish`

### Changes
- **Auto-complete on last character** — No need to press space after final word
- **Stats fade-in** — WPM/accuracy animate in after run completion
- **Smooth cursor animation** — CSS transitions instead of discrete jumps
- **Cursor blink on idle** — Triggers on mouse movement and window blur
- **Monkeytype-style blink** — Keyframes tuned to match: 0%/100% opacity 0, 50% opacity 1

### Key Decisions
- Cursor blink only when NOT typing (idle detection via mouse/blur events)
- Blink animation uses `ease-in-out` for smooth pulse

---

## PR #4: Correction Flow

**Branch:** `feature/correction-flow`

### Changes
- **Display inversion** — Gray for untyped (prompt), white for correct (confirmation)
- **Mistaken word tracking** — `mistaken[]` array in TypingState
- **Red underline** — Subtle indicator for incomplete/incorrect words
- **Backspace checkpoint logic** — Can't backspace past correctly typed words
- **Option+Backspace** — Delete entire word at once
- **Clear mistaken on correction** — Jumping back to fix a word removes the underline

### Key Decisions
- Correct words act as "checkpoints" — prevents accidental regression
- Mistaken flag clears when player returns to fix (not permanent shame)
- Past words preserve their typed state (no blanket dimming)

---

## PR #5: Display Upgrade

**Branch:** `feature/display-upgrade`

### Changes
- **Gruvbox Dark palette** — Warm, earthy tones matching Zed editor theme
- **Typography scale** — CSS custom properties for `--font-size-words` (1.75rem) and `--line-height-words` (2)
- **Cursor height anchoring** — `calc(var(--font-size-words) * 1.3)` keeps cursor proportional
- **3-line viewport** — `overflow: hidden` on typing-area, content scrolls via `translateY`
- **Smooth scrolling** — Current word stays centered (line 2), scroll triggers on line change

### Key Decisions
- Viewport on `.typing-area`, transform on `.words` — cursor clips correctly
- Cursor positioning uses `offsetTop` (ignores transforms) minus scroll offset — avoids timing issues with `getBoundingClientRect`
- Scroll state (`scrolledToLine`) persists across renders, resets on new run

### Technical Challenge: Scrolling
Took multiple iterations to get right:
1. First attempt: content jittered on every keystroke
2. Second: cursor decoupled from content
3. Third: cursor jumped out of viewport
4. Fourth: `getBoundingClientRect` had timing issues
5. Final: `offsetTop` + manual scroll offset calculation

Root cause was misunderstanding the relationship between CSS transforms and DOM measurement APIs.

---

## Files Modified

```
src/style.css   — Gruvbox palette, typography scale, viewport clipping
src/ui.ts       — Cursor positioning, scroll logic, resetScroll()
src/typing.ts   — Mistaken tracking, checkpoint backspace, Option+Backspace
src/main.ts     — resetScroll() call on new run, word count for testing
```

---

## Postmortem Notes

### What worked
- Iterative visual feedback loop (change → test → describe → adjust)
- Clean commit separation per logical change
- Reference-driven design (monkeytype, Gruvbox)

### What to improve
- Articulate complex logic (like scroll behavior) before implementing
- Separate test scaffolding from production changes
- Wait for explicit approval before committing

---

*Typing core is solid. Ready for tutorial flow and upgrade system.*
