/**
 * Three.js renderer for Teeter.
 * Sets up the 3D scene: track, ball, lighting, camera, fog.
 */

import * as THREE from 'three';

let scene, camera, renderer, ballMesh, trackGroup, trackMesh;

const BALL_RADIUS = 0.3;
const CAMERA_OFFSET = { x: 0, y: 4, z: -8 };

/**
 * Initialize the Three.js scene.
 * @param {object} trackDims - { width, height, length }
 * @returns {{ renderer: THREE.WebGLRenderer }}
 */
export function initRenderer(trackDims) {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 30, 80);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Track group (for tilt rotation)
  trackGroup = new THREE.Group();
  scene.add(trackGroup);

  // Track mesh
  const trackGeo = new THREE.BoxGeometry(
    trackDims.width,
    trackDims.height,
    trackDims.length
  );
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x8B7355,
    roughness: 0.8,
    metalness: 0.1,
  });
  trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.receiveShadow = true;
  trackGroup.add(trackMesh);

  // Edge lines along track sides for visibility
  const edgeGeo = new THREE.BoxGeometry(0.05, 0.15, trackDims.length);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x5C4033,
    roughness: 0.9,
    metalness: 0.0,
  });
  const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
  leftEdge.position.set(-trackDims.width / 2, 0.1, 0);
  trackGroup.add(leftEdge);
  const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
  rightEdge.position.set(trackDims.width / 2, 0.1, 0);
  trackGroup.add(rightEdge);

  // Ball mesh
  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    metalness: 0.3,
    roughness: 0.4,
  });
  ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 10, -5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // Hemisphere light for softer environmental lighting
  const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x444422, 0.4);
  scene.add(hemiLight);

  // Handle resize
  window.addEventListener('resize', onResize);

  return { renderer };
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Update scene objects and render a frame.
 * @param {object} ballState - { x, y, z, vx, vz, falling }
 * @param {number} tiltAngle - Current tilt angle in radians
 * @param {number} dt - Delta time for ball rotation
 */
export function renderFrame(ballState, tiltAngle, dt) {
  // Update ball position
  ballMesh.position.set(ballState.x, ballState.y, ballState.z);

  // Rotate ball to show rolling
  if (dt > 0) {
    const rollX = (ballState.vz * dt) / BALL_RADIUS;
    const rollZ = -(ballState.vx * dt) / BALL_RADIUS;
    ballMesh.rotation.x += rollX;
    ballMesh.rotation.z += rollZ;
  }

  // Visually tilt the track (subtle, clamped)
  const visualTilt = Math.max(-0.15, Math.min(0.15, tiltAngle * 0.5));
  trackGroup.rotation.z = visualTilt;

  // Camera follows ball along z-axis
  camera.position.set(
    ballState.x * 0.3 + CAMERA_OFFSET.x,
    ballState.falling ? Math.max(ballState.y + CAMERA_OFFSET.y, 2) : CAMERA_OFFSET.y,
    ballState.z + CAMERA_OFFSET.z
  );
  camera.lookAt(ballState.x * 0.5, ballState.y, ballState.z + 5);

  renderer.render(scene, camera);
}
