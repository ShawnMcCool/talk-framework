import * as THREE from 'three';

/**
 * Create a perspective camera that frames a target bounding box tightly.
 * Camera is positioned below center looking slightly up for dramatic angle.
 *
 * @param {object} opts
 * @param {number} opts.targetWidth - width of content to frame
 * @param {number} opts.targetHeight - height of content to frame
 * @param {number} opts.targetY - Y position of content center
 * @param {number} opts.aspect - viewport aspect ratio
 * @param {number} opts.padding - fraction of extra space (0.15 = 15% margin)
 * @param {number} opts.lowAngle - how far below target to place camera (world units)
 * @param {number} opts.fov - field of view in degrees
 */
export function createFramingCamera({
  targetWidth,
  targetHeight,
  targetY = 0,
  aspect = 16 / 9,
  padding = 0.15,
  lowAngle = 1.5,
  fov = 50,
} = {}) {
  const paddedHeight = targetHeight * (1 + padding);
  const paddedWidth = targetWidth * (1 + padding);

  const fovRad = (fov * Math.PI) / 180;
  const distForHeight = paddedHeight / (2 * Math.tan(fovRad / 2));
  const distForWidth = paddedWidth / (2 * Math.tan(fovRad / 2) * aspect);
  const dist = Math.max(distForHeight, distForWidth);

  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
  camera.position.set(0, targetY - lowAngle, dist);
  camera.lookAt(0, targetY, 0);

  return camera;
}

/**
 * Set up resize handling for a perspective camera.
 * Returns a cleanup function.
 */
export function setupResize(camera, container, renderer) {
  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.markDirty();
  };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
