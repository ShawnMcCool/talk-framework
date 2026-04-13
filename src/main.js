import { createEngine } from './engine/engine.js';
import { demoHtmlScene } from './scenes/demo-html/scene.js';
import { applyColorVars } from './shared/colors.js';

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

const engine = createEngine({
  stage,
  sceneDefs: [demoHtmlScene],
});

engine.start();
