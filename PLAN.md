# Plan: Create Leaderboard with Persistent High Scores

## Overview

Add a persistent leaderboard system using browser localStorage. Introduce a `gameover` state to the existing state machine that intercepts the automatic reset flow when the ball falls. Display game-over UI with optional name entry for top-10 scores, and a leaderboard view accessible at any time.

## Codebase Analysis

- **Tech stack**: Pure static HTML+JS (ES modules), Three.js v0.183.2 via CDN importmap, served by nginx in Docker
- **State machine** (`main.js`): `loading | permission | playing | falling` → adding `gameover`
- **Reset flow** (`main.js:121-138`): On `result.needsReset && state === 'falling'`, a 500ms `setTimeout` regenerates the level, resets physics, resets score, and sets state to `playing`
- **Score tracking**: `score` variable in `main.js`, displayed via `#score` div
- **Overlay system**: `#overlay` div with `.title`/`.subtitle`, toggled via `.hidden` class
- **No existing localStorage usage**

## Architecture

### Files to Modify

1. **`index.html`** — Add game-over overlay, name entry form, leaderboard panel, and leaderboard button. Add associated CSS styles.
2. **`js/main.js`** — Add `gameover` state to state machine, localStorage read/write logic, wire up UI interactions.

### Files NOT Modified

- `js/renderer.js` — No changes needed
- `js/physics.js` — No changes needed
- `js/tracker.js` — No changes needed (DO NOT MODIFY per conventions)

### State Machine Change

Current flow:
```
playing → falling → [500ms timeout] → playing
```

New flow:
```
playing → falling → [ball falls off screen] → gameover → [name entry or brief display] → playing
```

The `gameover` state replaces the immediate 500ms reset timer. Instead of scheduling a reset in the `falling` state, when `result.needsReset` is true, transition to `gameover` and show the game-over UI.

### localStorage Schema

Key: `teeter_highscores`

Value (JSON string):
```json
[
  { "name": "AAA", "score": 42 },
  { "name": "BBB", "score": 35 },
  ...
]
```

Array of up to 10 entries, sorted by score descending. Read/written via `JSON.parse`/`JSON.stringify`.

### UI Components

#### 1. Game Over Overlay (`#gameover-overlay`)
- Centered overlay (similar to existing `#overlay` styling)
- Shows "GAME OVER" title and final score
- If score qualifies for top 10: shows name entry input (maxlength=15) + submit button
- If score does not qualify: shows message briefly, then auto-resets after ~2 seconds
- `pointer-events: auto` so user can interact with the form

#### 2. Leaderboard Panel (`#leaderboard-panel`)
- Full-screen or large centered panel overlay
- Shows ranked list: #, Name, Score
- Close button to dismiss
- Accessible via a leaderboard button in the UI

#### 3. Leaderboard Button (`#leaderboard-btn`)
- Fixed position button (top-right corner)
- Always visible during `playing` state
- Simple text label (e.g., "Leaderboard") — no emoji assets needed
- Opens the leaderboard panel when clicked

### Key Implementation Details

1. **Score qualification check**: Compare current score against the 10th entry in the sorted array (or check if fewer than 10 entries). Score of 0 does NOT qualify.

2. **Name input**: HTML `<input>` with `maxlength="15"`, submit on Enter key or button click. Trim whitespace. Default to "Anonymous" if empty.

3. **Game-over flow**:
   - Qualifying score: Show name entry, wait for submit, save to localStorage, then reset
   - Non-qualifying score: Show "GAME OVER" with final score for ~2 seconds, then auto-reset

4. **Reset after game-over**: Same reset logic as current (regenerateLevel, initPhysics, resetTilt, etc.), triggered from the game-over flow completion.

5. **Leaderboard during gameplay**: Button in top-right, clicking opens the leaderboard overlay. Close button dismisses it. Game continues underneath.

6. **localStorage error handling**: Wrap read/write in try/catch to handle private browsing or full storage gracefully. If localStorage is unavailable, game-over flow still works — just no persistence.

### Conventions to Follow

- 2-space indent, single quotes, const/let (no var)
- camelCase functions, UPPER_CASE constants
- ES module imports
- Match existing overlay styling (font-family: -apple-system, etc., white text on dark backgrounds)
- No new dependencies — pure DOM manipulation
- No npm/node — static JS only

### Gotchas

- The existing `#overlay` has `pointer-events: none` — the new game-over overlay needs `pointer-events: auto` for the input/button to be interactive
- Must hide the game-over overlay before resetting to `playing` state
- The existing reset flow uses a `setTimeout` with a `resetTimer` guard — the new `gameover` state replaces this pattern entirely for the reset case
- The `score` variable must be captured at the moment of entering `gameover` state (before reset clears it)
- The leaderboard button should have `z-index` above the Three.js canvas but below overlays
- The game loop continues running during `gameover` state but should skip physics updates (game is paused)

## Scope Assessment: Single Agent

All changes are tightly coupled between `index.html` (UI) and `js/main.js` (logic). No parallel decomposition is beneficial — the UI and logic must be developed together.

## Sources

No external libraries needed. Uses standard browser APIs: `localStorage`, DOM manipulation. All patterns already exist in the codebase (overlays, event listeners, state machine).
