import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { compileMarkdownScene } from './authoring/markdown-scene.js';
import { validateScenes } from './authoring/scene-validation.js';
import { createErrorPlaceholderScene } from './authoring/scene-placeholder.js';

import { config, scenes as manifestScenes, issues, error } from 'virtual:content-manifest';

import { applyColorVars } from './shared/colors.js';
import { sessionState } from './shared/session-state.js';
import { createDebugOverlay } from './debug/overlay.js';
import { createNavOverlay } from './debug/nav-overlay.js';

let SCENE_SOURCES = buildSceneSources();

function buildSceneSources() {
  if (error) {
    return [{
      scene: createErrorPlaceholderScene({
        folder: 'talk.toml',
        index: null,
        reason: error,
      }),
      path: null,
      folder: 'talk.toml',
    }];
  }

  if (issues.length > 0) {
    console.warn('[content] structural issues in content folder:');
    for (const issue of issues) {
      console.warn(`  [${issue.severity}] ${issue.message}`);
    }
  }

  return manifestScenes.map(s => {
    try {
      if (s.kind === 'md') {
        return {
          scene: compileMarkdownScene(s.source),
          path: `/content/${s.folder}/scene.md`,
          folder: s.folder,
        };
      }
      const mod = s.source;
      const sceneExport = mod.default || Object.values(mod).find(v => v && v.init && v.destroy);
      if (!sceneExport) throw new Error('scene.js has no exported scene module');
      return {
        scene: sceneExport,
        path: `/content/${s.folder}/scene.js`,
        folder: s.folder,
      };
    } catch (err) {
      console.warn(`[content] scene ${s.folder} failed to load:`, err.message);
      return {
        scene: createErrorPlaceholderScene({
          folder: s.folder,
          index: s.index,
          reason: err.message,
        }),
        path: `/content/${s.folder}`,
        folder: s.folder,
      };
    }
  });
}

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

let engine = null;
let palette = null;
let debug = null;
let nav = null;
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

  engine = createEngine({
    stage,
    sceneDefs,
    onPositionChange: (p) => {
      sessionState.setPosition(p);
      if (debug) debug.refresh();
      if (nav) nav.refresh();
    },
  });
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

  nav = createNavOverlay(
    () => engine.getPosition(),
    () => engine.getDeck(),
    {
      onJump: (sceneIdx, slideIdx, stepIdx) => {
        engine.goToScene(sceneIdx);
        engine.goToSlide?.(slideIdx, stepIdx);
      },
    },
  );

  function toggleDebug() {
    debug.toggle();
    sessionState.setFlag('debug-visible', debug.isVisible());
  }

  function toggleNav() {
    nav.toggle();
    sessionState.setFlag('nav-visible', nav.isVisible());
  }

  palette.register({
    id: 'toggle-debug',
    title: 'Toggle Debug Overlay',
    dev: true,
    action: toggleDebug,
  });

  palette.register({
    id: 'toggle-nav',
    title: 'Toggle Navigation Overlay',
    dev: true,
    action: toggleNav,
  });

  // Dev-only keyboard:
  //   `o` — open the current scene's source file
  //   `n` — toggle the nav overlay
  //   `d` — toggle the debug overlay
  // Ignored when the palette is open or an input is focused.
  authoringKeyHandler = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (palette.isOpen()) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'o') {
      e.preventDefault();
      openCurrentSourceInEditor();
    } else if (e.key === 'n') {
      e.preventDefault();
      toggleNav();
    } else if (e.key === 'd') {
      e.preventDefault();
      toggleDebug();
    }
  };
  document.addEventListener('keydown', authoringKeyHandler);

  // Restore overlay visibility.
  if (sessionState.getFlag('debug-visible')) debug.toggle();
  if (sessionState.getFlag('nav-visible')) nav.toggle();

  engine.start();

  // Restore last position (if any). Clamp against current deck shape in case
  // scenes were added/removed since the save.
  const saved = sessionState.getPosition();
  if (saved) {
    const scene = sceneDefs[saved.sceneIndex];
    if (scene) {
      engine.goToScene(saved.sceneIndex);
      engine.goToSlide?.(saved.slideIndex, saved.stepIndex);
    }
  }

  // Force overlays to re-read the new deck/position snapshot after setup.
  debug.refresh();
  nav.refresh();

  palette.start();
}

function teardown() {
  if (engine) engine.stop();
  if (palette) palette.stop();
  if (debug) debug.destroy();
  if (nav) nav.destroy();
  if (authoringKeyHandler) document.removeEventListener('keydown', authoringKeyHandler);
  authoringKeyHandler = null;
}

setup();

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // setup() itself restores position from localStorage and rebinds overlays
    // to the new engine — no need to pass the old position through.
    teardown();
    setup();
  });
}
