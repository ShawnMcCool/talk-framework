import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { beamVmScene } from './scenes/07-beam-vm/scene.js';
import { processMessagingScene } from './scenes/08-process-messaging/scene.js';
import { mailboxExecutionScene } from './scenes/09-mailbox-execution/scene.js';
import { executionModelScene } from './scenes/10-execution-model/scene.js';
import { linksScene } from './scenes/11-links/scene.js';
import { monitorsScene } from './scenes/12-monitors/scene.js';
import { supervisorsScene } from './scenes/13-supervisors/scene.js';
import { applyColorVars } from './shared/colors.js';
import { createDebugOverlay } from './debug/overlay.js';

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

let engine = null;
let palette = null;

function buildSceneDefs() {
  return [
    beamVmScene,
    processMessagingScene,
    mailboxExecutionScene,
    executionModelScene,
    linksScene,
    monitorsScene,
    supervisorsScene,
  ];
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
