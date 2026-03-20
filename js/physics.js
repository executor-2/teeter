/**
 * Ball physics simulation for Teeter.
 * Handles rolling, gravity on tilt, friction, edge detection, and falling.
 */

const GRAVITY = 9.8;
const SENSITIVITY = 2.5;
const FRICTION = 3.0;
const TRACK_HALF_WIDTH = 1.5;
const TRACK_LENGTH = 50;
const FORWARD_SPEED = 2.0;
const MAX_DT = 1 / 30; // Cap delta time to prevent physics explosions
const FALL_RESET_Y = -10;
const RESET_DELAY = 1.5; // seconds before auto-reset after falling

const START_X = 0;
const START_Y = 0.4; // ball rests on track surface (track top = 0.1, ball radius = 0.3)
const START_Z = -20;

let ball = createBallState();
let resetTimer = 0;

function createBallState() {
  return {
    x: START_X,
    y: START_Y,
    z: START_Z,
    vx: 0,
    vy: 0,
    vz: FORWARD_SPEED,
    falling: false,
  };
}

/**
 * Update physics for one frame.
 * @param {number} dt - Delta time in seconds (will be capped)
 * @param {number} tiltAngle - Head tilt angle in radians
 * @returns {{ ball: object, shouldReset: boolean }}
 */
export function updatePhysics(dt, tiltAngle) {
  dt = Math.min(dt, MAX_DT);

  if (ball.falling) {
    // Apply full gravity downward
    ball.vy -= GRAVITY * dt;
    ball.y += ball.vy * dt;
    // Continue lateral and forward movement while falling
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;

    resetTimer += dt;
    if (resetTimer >= RESET_DELAY) {
      resetBall();
      return { ball: getBallState(), shouldReset: true };
    }
  } else {
    // Lateral acceleration from track tilt
    const ax = GRAVITY * Math.sin(tiltAngle) * SENSITIVITY;
    ball.vx += ax * dt;

    // Rolling friction
    ball.vx *= (1 - FRICTION * dt);

    // Forward speed (constant)
    ball.vz = FORWARD_SPEED;

    // Update position
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;

    // Wrap z position if ball goes past end of track
    if (ball.z > TRACK_LENGTH / 2) {
      ball.z = -TRACK_LENGTH / 2;
    }

    // Edge detection
    if (Math.abs(ball.x) > TRACK_HALF_WIDTH) {
      ball.falling = true;
      ball.vy = 0;
      resetTimer = 0;
    }
  }

  return { ball: getBallState(), shouldReset: false };
}

/**
 * Reset ball to starting position.
 */
export function resetBall() {
  ball = createBallState();
  resetTimer = 0;
}

/**
 * Get a copy of the current ball state.
 */
export function getBallState() {
  return { ...ball };
}

/**
 * Get track dimensions for the renderer.
 */
export function getTrackDimensions() {
  return {
    width: TRACK_HALF_WIDTH * 2,
    height: 0.2,
    length: TRACK_LENGTH,
    halfWidth: TRACK_HALF_WIDTH,
  };
}
