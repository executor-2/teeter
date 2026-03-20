/**
 * Head tilt tracker using MediaPipe FaceLandmarker.
 * Detects head roll angle from webcam without rendering the video feed.
 */

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

// Smoothing factor: 0 = no smoothing, 1 = fully smoothed (never updates)
const SMOOTH_FACTOR = 0.7;

let faceLandmarker = null;
let videoElement = null;
let smoothedTilt = 0;
let lastVideoTime = -1;
let ready = false;

/**
 * Initialize MediaPipe FaceLandmarker and webcam video stream.
 * @param {MediaStream} stream - The webcam media stream
 * @returns {Promise<void>}
 */
export async function initTracker(stream) {
  const { FaceLandmarker, FilesetResolver } = await import(
    `${MEDIAPIPE_CDN}/vision_bundle.mjs`
  );

  const vision = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_CDN}/wasm`);

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
  });

  // Create video element programmatically — never added to the DOM
  videoElement = document.createElement('video');
  videoElement.setAttribute('autoplay', '');
  videoElement.setAttribute('playsinline', '');
  videoElement.srcObject = stream;
  videoElement.play();

  // Wait for video to be ready
  await new Promise((resolve) => {
    videoElement.addEventListener('loadeddata', resolve, { once: true });
  });

  ready = true;
}

/**
 * Get the current smoothed head tilt angle.
 * Call once per frame from the game loop.
 * @returns {number} Smoothed tilt angle in radians (negative = tilt left, positive = tilt right)
 */
export function getTilt() {
  if (!ready || !faceLandmarker || !videoElement) return 0;
  if (videoElement.readyState < 2) return smoothedTilt;

  const now = performance.now();
  if (videoElement.currentTime === lastVideoTime) return smoothedTilt;
  lastVideoTime = videoElement.currentTime;

  const results = faceLandmarker.detectForVideo(videoElement, now);

  if (results.faceLandmarks && results.faceLandmarks.length > 0) {
    const landmarks = results.faceLandmarks[0];
    const leftEye = landmarks[33];   // left eye outer corner
    const rightEye = landmarks[263]; // right eye outer corner

    const rawTilt = Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x
    );

    smoothedTilt = smoothedTilt * SMOOTH_FACTOR + rawTilt * (1 - SMOOTH_FACTOR);
  }

  return smoothedTilt;
}

/**
 * Reset the smoothed tilt value (e.g., on game restart).
 */
export function resetTilt() {
  smoothedTilt = 0;
}
