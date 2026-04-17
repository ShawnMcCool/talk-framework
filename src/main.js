import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { compileMarkdownScene } from './authoring/markdown-scene.js';
import { validateScenes } from './authoring/scene-validation.js';
import { hotTakesScene } from './scenes/07-hot-takes/scene.js';
import { deepDiveScene } from './scenes/08-deep-dive/scene.js';
import whyBeamMd from './scenes/09-why-beam/scene.md?raw';
import { processesScene } from './scenes/10-processes/scene.js';
import { faultToleranceScene } from './scenes/11-fault-tolerance/scene.js';
import { codeExampleScene } from './scenes/12-code-example/scene.js';
import { applyColorVars } from './shared/colors.js';
import { createDebugOverlay } from './debug/overlay.js';

const whyBeamScene = compileMarkdownScene(whyBeamMd);

// Each scene is paired with its source path so the dev HUD can surface it
// and the "open in editor" shortcut knows what file to open.
const SCENE_SOURCES = [
  { scene: whyBeamScene,         path: 'src/scenes/09-why-beam/scene.md' },
  { scene: hotTakesScene,        path: 'src/scenes/07-hot-takes/scene.js' },
  { scene: processesScene,       path: 'src/scenes/10-processes/scene.js' },
  { scene: codeExampleScene,     path: 'src/scenes/12-code-example/scene.js' },
  { scene: deepDiveScene,        path: 'src/scenes/08-deep-dive/scene.js' },
  { scene: faultToleranceScene,  path: 'src/scenes/11-fault-tolerance/scene.js' },
];

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

let engine = null;
let palette = null;
let debug = null;
let authoringKeyHandler = null;

function buildSceneDefs() {
  return SCENE_SOURCES.map(s => s.scene);
}

function sourcePathForScene(sceneIndex) {
  return SCENE_SOURCES[sceneIndex]?.path || null;
}

function openCurrentSourceInEditor() {
  const pos = engine.getPosition();
  const path = sourcePathForScene(pos.sceneIndex);
  if (!path) { toast('no source path for this scene'); return; }
  fetch(`/__open-source?path=${encodeURIComponent(path)}`)
    .then(r => r.ok
      ? toast(`opened ${path}`)
      : navigator.clipboard?.writeText(path).then(() => toast(`copied ${path}`)))
    .catch(() => navigator.clipboard?.writeText(path).then(() => toast(`copied ${path}`)));
}

let toastEl = null;
let toastTimeout = null;
function toast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.style.cssText =
      'position:fixed;top:16px;left:50%;transform:translateX(-50%);' +
      'padding:8px 16px;background:rgba(0,0,0,0.8);color:#e8e8f8;' +
      'font:13px monospace;border-radius:4px;z-index:1000;pointer-events:none;' +
      'opacity:0;transition:opacity 0.2s;';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toastEl.style.opacity = '0'; }, 1800);
}

function setup() {
  const sceneDefs = buildSceneDefs();
  validateScenes(sceneDefs);

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

  palette.register({
    id: 'jump-to-slide',
    title: 'Jump to Slide (scene.slide)...',
    action: (query) => {
      // Accepts "9", "9.2", "9.2.1" → scene.slide.step (1-indexed)
      const parts = query.trim().split('.').map(p => parseInt(p, 10));
      if (parts.some(Number.isNaN)) return;
      const [sceneNum, slideNum = 1, stepNum = 1] = parts;
      engine.goToScene(sceneNum - 1);
      engine.goToSlide?.(slideNum - 1, stepNum - 1);
    },
  });

  palette.register({
    id: 'open-source',
    title: 'Open Current Scene Source in Editor',
    dev: true,
    action: openCurrentSourceInEditor,
  });

  sceneDefs.forEach((scene, i) => {
    palette.register({
      id: `scene-${i}`,
      title: `Scene ${i + 1}: ${scene.title}`,
      action: () => engine.goToScene(i),
    });
  });

  debug = createDebugOverlay(
    () => engine.getPosition(),
    () => engine.getDeck(),
    { resolveSource: sourcePathForScene },
  );

  palette.register({
    id: 'toggle-debug',
    title: 'Toggle Debug Overlay',
    dev: true,
    action: () => debug.toggle(),
  });

  // Dev-only keyboard: `o` opens the current scene's source file.
  // Ignored when the palette is open or an input is focused.
  authoringKeyHandler = (e) => {
    if (e.key !== 'o' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (palette.isOpen()) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    openCurrentSourceInEditor();
  };
  document.addEventListener('keydown', authoringKeyHandler);

  engine.start();
  palette.start();
}

function teardown() {
  if (engine) engine.stop();
  if (palette) palette.stop();
  if (debug) debug.destroy();
  if (authoringKeyHandler) document.removeEventListener('keydown', authoringKeyHandler);
  authoringKeyHandler = null;
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
