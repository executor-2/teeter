/**
 * Teeter — Main entry point.
 * Handles camera permissions, initialization, and the game loop.
 */

import { initTracker, getTilt, resetTilt } from './tracker.js';
import { updatePhysics, resetBall, getBallState, getTrackDimensions } from './physics.js';
import { initRenderer, renderFrame } from './renderer.js';

const overlay = document.getElementById('overlay');

let lastTime = 0;
let gameState = 'loading'; // loading | permission | playing | falling

function showOverlay(text, isError = false) {
  overlay.textContent = text;
  overlay.style.display = 'block';
  overlay.classList.toggle('error', isError);
}

function hideOverlay() {
  overlay.style.display = 'none';
}

async function init() {
  showOverlay('Teeter\nTilt your head to steer');

  // Initialize Three.js scene
  const trackDims = getTrackDimensions();
  initRenderer(trackDims);

  // Render initial frame so the scene is visible while loading
  renderFrame(getBallState(), 0, 0);

  // Request camera permission
  gameState = 'permission';
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (err) {
    showOverlay(
      'Camera access is required to play.\nPlease allow camera access and reload.',
      true
    );
    return;
  }

  // Initialize head tracking (loads MediaPipe model)
  showOverlay('Loading head tracking...');
  try {
    await initTracker(stream);
  } catch (err) {
    showOverlay(
      'Failed to initialize head tracking.\nPlease reload and try again.',
      true
    );
    console.error('Tracker init error:', err);
    return;
  }

  hideOverlay();
  gameState = 'playing';
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Avoid large dt on first frame or after tab-switch
  if (dt <= 0 || dt > 0.1) return;

  // Read head tilt
  const tiltAngle = getTilt();

  // Update physics
  const { ball, shouldReset } = updatePhysics(dt, tiltAngle);

  if (shouldReset) {
    resetTilt();
    gameState = 'playing';
  } else if (ball.falling && gameState === 'playing') {
    gameState = 'falling';
  }

  // Render
  renderFrame(ball, tiltAngle, dt);
}

// Start
init().catch((err) => {
  console.error('Init error:', err);
  showOverlay('An error occurred. Please reload.', true);
});
