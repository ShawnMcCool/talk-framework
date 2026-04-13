import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { demoHtmlScene } from './scenes/demo-html/scene.js';
import { demoThreeScene } from './scenes/demo-three/scene.js';
import { applyColorVars } from './shared/colors.js';
import { createDebugOverlay } from './debug/overlay.js';

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

let engine = null;
let palette = null;

function buildSceneDefs() {
  return [demoHtmlScene, demoThreeScene];
}

function setup() {
  const sceneDefs = buildSceneDefs();

  engine = createEngine({ stage, sceneDefs });
  palette = createPalette({ devMode: true });

  palette.register({
    id: 'go-to-scene',
    title: 'Go to Scene...',
    action: (query) => {
      const num = parseInt(query);
      if (!isNaN(num)) engine.goToScene(num - 1);
    },
  });

  palette.register({
    id: 'reset-scene',
    title: 'Reset Current Scene',
    action: () => engine.goToScene(engine.getPosition().sceneIndex),
  });

  sceneDefs.forEach((scene, i) => {
    palette.register({
      id: `scene-${i}`,
      title: `Scene ${i + 1}: ${scene.title}`,
      action: () => engine.goToScene(i),
    });
  });

  const debug = createDebugOverlay(
    () => engine.getPosition(),
    () => engine.getDeck(),
  );

  palette.register({
    id: 'toggle-debug',
    title: 'Toggle Debug Overlay',
    dev: true,
    action: () => debug.toggle(),
  });

  engine.start();
  palette.start();
}

function teardown() {
  if (engine) engine.stop();
  if (palette) palette.stop();
}

setup();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    const pos = engine ? engine.getPosition() : null;
    teardown();
    setup();
    if (pos) {
      engine.goToScene(pos.sceneIndex);
    }
  });
}
