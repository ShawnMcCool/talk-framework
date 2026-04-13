import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { demoHtmlScene } from './scenes/demo-html/scene.js';
import { applyColorVars } from './shared/colors.js';

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

const engine = createEngine({
  stage,
  sceneDefs: [demoHtmlScene],
});

const palette = createPalette({ devMode: true });

palette.register({
  id: 'go-to-scene',
  title: 'Go to Scene...',
  action: (query) => {
    const num = parseInt(query);
    if (!isNaN(num)) {
      engine.goToScene(num - 1);
    }
  },
});

palette.register({
  id: 'reset-scene',
  title: 'Reset Current Scene',
  action: () => engine.goToScene(engine.getPosition().sceneIndex),
});

engine.getSceneDefs().forEach((scene, i) => {
  palette.register({
    id: `scene-${i}`,
    title: `Scene ${i + 1}: ${scene.title}`,
    action: () => engine.goToScene(i),
  });
});

engine.start();
palette.start();
