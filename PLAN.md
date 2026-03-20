# Plan: Fix "No Coins on Track" Bug

## Root Cause Analysis

When the ball reaches the end of the track (`ball.z > halfLength` in `physics.js:142`), the ball position wraps back to the start (`ball.z = -halfLength + 1`) but the level is **not** regenerated. All previously collected coins remain hidden (`coinsCollected` array entries stay `true`, coin meshes stay `visible = false`). If the player collected all coins before reaching the track end, the wrapped track has zero collectible coins — and every subsequent wrap also has zero coins.

The bug manifests "occasionally" because it only triggers when the player collects **every** coin before the ball reaches the track end. If any coins are missed, they remain visible on the next pass.

Key code locations:
- `js/physics.js:141-144` — ball wrap logic (no level regeneration)
- `js/renderer.js:68-106` — `generateCoins()` function
- `js/main.js:160-183` — `exitGameOver()` which correctly regenerates the level (but is only called on death, not track completion)

## Fix Strategy

### 1. Regenerate the level on track wrap (physics.js + main.js)

**physics.js**: When `ball.z > halfLength`, add a `trackCompleted: true` flag to the return object (alongside the existing ball position reset).

**main.js**: In the game loop, detect `result.trackCompleted`. When true:
- Call `regenerateLevel()` to create new obstacles, coins, and turtle
- Re-fetch track config, obstacles, coins, and turtle data
- Call `initPhysics(config)` with fresh data
- Reset ball rotation and slowdown indicator
- **Preserve the score** (do NOT reset to 0 — the player earned those points)

This mirrors the reset logic already in `exitGameOver()` but without resetting the score.

### 2. Defensive guarantee: no zero-coin levels (renderer.js)

Add a safety check in `generateCoins()`: if the obstacles-based coin placement yields zero coins, add fallback coins in the safe zone area (between `SAFE_ZONE_Z` and the first obstacle). This prevents zero-coin tracks regardless of RNG sequence or obstacle placement.

The current math suggests this shouldn't happen with normal RNG (obstacle spacing of 7-9 units guarantees gaps of 5-7 for coins), but the defensive check is cheap and eliminates the theoretical possibility.

## Files to Change

| File | Change |
|------|--------|
| `js/physics.js` | Add `trackCompleted` flag to `updateOnTrack()` return when ball wraps past track end |
| `js/main.js` | Handle `trackCompleted` in game loop — regenerate level, re-init physics, preserve score |
| `js/renderer.js` | Add fallback in `generateCoins()` to ensure at least 1 coin is always generated |

## Scope: Single Agent

All changes are tightly coupled across 3 files in a small codebase. No meaningful parallelism possible.

## Testing

- `docker build -t teeter .` must succeed
- After collecting coins and reaching the track end, a fresh track with new coins appears
- Score persists across track completions (not reset to 0)
- No track should ever have zero coins
