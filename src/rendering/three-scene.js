import * as THREE from 'three';

export function createThreeRenderer() {
  let renderer = null;
  let scene = null;
  let camera = null;
  let container = null;
  let animFrameId = null;
  let needsRender = true;

  function updateSize() {
    if (!container || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);

    const aspect = w / h;
    const frustumHeight = 10;
    camera.left = -frustumHeight * aspect / 2;
    camera.right = frustumHeight * aspect / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  function renderLoop() {
    animFrameId = requestAnimationFrame(renderLoop);
    if (needsRender) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  }

  return {
    init(stage) {
      container = document.createElement('div');
      container.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;';
      stage.appendChild(container);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();

      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(5, 10, 7);
      scene.add(directional);
      const fill = new THREE.DirectionalLight(0xffffff, 0.3);
      fill.position.set(-3, 5, -5);
      scene.add(fill);

      updateSize();
      window.addEventListener('resize', updateSize);
      renderLoop();

      return { scene, camera, renderer, container };
    },

    destroy() {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', updateSize);
      if (renderer) renderer.dispose();
      if (container && container.parentNode) container.parentNode.removeChild(container);
      renderer = null;
      scene = null;
      camera = null;
      container = null;
    },

    getScene() { return scene; },
    getCamera() { return camera; },

    markDirty() {
      needsRender = true;
    },
  };
}
