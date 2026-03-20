# Plan: Head Tracking with Absolute Position

## Overview

Switch head tracking from relative angular measurement (atan2 of eye landmark Y/X deltas) to absolute face horizontal position. The current `detectTilt()` computes head roll angle from eye corner vertical offset. The new approach uses the normalized X coordinate midpoint of the face (eye landmarks) to map head position directly to ball steering.

## Current Implementation

- **tracker.js**: `detectTilt()` computes `atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)` — measures head roll angle in radians. The smoothed tilt value (~-0.3 to +0.3 radians in practice) is returned.
- **physics.js**: `updateOnTrack()` computes `targetVx = tiltAngle * DIRECT_SENSITIVITY` (where `DIRECT_SENSITIVITY = 8.0`), then smoothly interpolates `ball.vx` toward this target. The ball moves laterally based on velocity, not position.
- **main.js**: Calls `detectTilt(timestamp)` each frame, passes result to `updatePhysics(dt, tiltAngle, pitch)`. Calls `resetTilt()` on game reset.

## Technical Approach

### 1. Absolute Position Calculation (tracker.js)

MediaPipe face landmarks return normalized coordinates (0–1 range). The X midpoint of the left and right eye outer corners (`landmarks[33].x` and `landmarks[263].x`) gives the horizontal face center position. Since webcams mirror the image, moving your head left increases the landmark X value, so we negate: `position = -(midpointX - 0.5)` to get a centered value where physical left head movement → negative value.

**Calibration**: Use auto-calibration. On the first valid detection after game start (or reset), capture the current raw face X midpoint as `calibrationX`. Subsequent frames compute: `rawTilt = -(midpointX - calibrationX)`. This means the player's natural resting head position maps to 0 (center).

Export a `calibrateCenter()` function that resets the calibration flag so the next detection frame recaptures the center offset. Call this from `main.js` at game start and on each game restart.

### 2. Smoothing (tracker.js)

Keep `SMOOTHING_FACTOR = 0.7` (exponential moving average). Absolute position from landmarks is already fairly stable frame-to-frame, so the existing smoothing should work well. If anything, absolute position is *less* noisy than the atan2 angle, so 0.7 is appropriate.

### 3. Pitch Detection

Keep pitch detection angle-based (nose Y - forehead Y). The acceptance criteria explicitly allow this.

### 4. Sensitivity Tuning (physics.js)

The current `DIRECT_SENSITIVITY = 8.0` was tuned for radian-based tilt (~±0.3 range → ±2.4 velocity). With absolute position, the face midpoint offset will range roughly ±0.1 to ±0.2 in normalized coordinates for comfortable head movement. The track half-width is 2.25 (from `TRACK_WIDTH = 4.5`).

We need comfortable head movement (~±0.15 normalized units) to produce enough lateral velocity to reach track edges. Target: ±0.15 input → ~±2.25 target velocity → `DIRECT_SENSITIVITY ≈ 15.0`.

### 5. Game Start Calibration (main.js)

After `initTracker(stream)` completes and the game transitions to `playing` state, call `calibrateCenter()`. Also call it in `exitGameOver()` when resetting the game. This ensures recalibration at every game start.

## Files to Modify

1. **js/tracker.js** — Replace atan2 tilt with normalized face X midpoint; add auto-calibration offset; export `calibrateCenter()`
2. **js/physics.js** — Adjust `DIRECT_SENSITIVITY` from 8.0 to 15.0
3. **js/main.js** — Import and call `calibrateCenter()` after tracker init and on game restart

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Position source | Eye landmark X midpoint | Same landmarks already used; stable horizontal position indicator |
| Calibration | Auto-capture on first valid frame after reset | Zero-friction UX, no explicit calibration step needed |
| Mirroring | Negate the X offset | Webcam mirrors; negation makes physical left → negative value → ball moves left |
| Smoothing factor | Keep 0.7 | Existing value; absolute position is at least as stable as angle |
| DIRECT_SENSITIVITY | 15.0 (up from 8.0) | ±0.15 normalized offset × 15 = ±2.25 velocity ≈ track half-width |
| Pitch | Keep angle-based | AC allows it; no benefit to changing |

## Scope: Single Agent

All changes are tightly coupled (tracker output → physics input → game loop wiring). Three files, minimal changes. No meaningful parallelism possible.
