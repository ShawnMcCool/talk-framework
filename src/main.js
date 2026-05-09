import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { compileMarkdownScene } from './authoring/markdown-scene.js';
import { validateScenes } from './authoring/scene-validation.js';
import { createErrorPlaceholderScene } from './authoring/scene-placeholder.js';
import { mountErrorBanner } from './authoring/error-banner.js';
import { createLastGoodCache } from './authoring/last-good-cache.js';
import { subscribeDiagnostics } from './authoring/hmr-diagnostics.js';

import * as initialManifest from 'virtual:content-manifest';

import { applyColorVars, colors as defaultColors } from './shared/colors.js';
import { sessionState } from './shared/session-state.js';
import { createDebugOverlay } from './debug/overlay.js';
import { createNavOverlay } from './debug/nav-overlay.js';

// The manifest is re-read on HMR via the dep-specific accept handler at the
// bottom of this file. Everything derived from it (deckId, title, palette,
// SCENE_SOURCES) is refreshed there without re-evaluating the rest of this
// module, so module-level singletons below (lastGood cache, error banner)
// survive content edits.
let currentManifest = initialManifest;

// Used to scope saved navigation state (scene/slide/step) to the current deck,
// so loading a different talk folder starts fresh at scene 1 / slide 1
// instead of restoring the previous deck's last position.
let deckId = currentManifest.config?.title ?? null;

// Reflect the deck's title in the browser tab so multiple decks open in
// different tabs stay distinguishable.
if (currentManifest.config?.title) document.title = currentManifest.config.title;

const lastGood = createLastGoodCache();
const banner = (import.meta.env?.DEV) ? mountErrorBanner(document.body) : null;
if (banner && import.meta.hot) {
  subscribeDiagnostics(import.meta.hot, ({ sceneId, diagnostics }) => banner.update(diagnostics));
}

let SCENE_SOURCES = buildSceneSources();

function buildSceneSources() {
  const { config, scenes: manifestScenes, issues, error } = currentManifest;

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
      let entry;
      if (s.kind === 'md') {
        entry = {
          scene: compileMarkdownScene(s.source, {
            palette: config?.palette,
            sceneFolder: s.folder,
            baseUrl: import.meta.env?.BASE_URL ?? '/',
          }),
          path: `/content/${s.folder}/scene.md`,
          folder: s.folder,
        };
      } else {
        const mod = s.source;
        const sceneExport = mod.default || Object.values(mod).find(v => v && v.init && v.destroy);
        if (!sceneExport) throw new Error('scene.js has no exported scene module');
        entry = {
          scene: sceneExport,
          path: `/content/${s.folder}/scene.js`,
          folder: s.folder,
        };
      }
      lastGood.set(s.folder, entry);
      return entry;
    } catch (err) {
      console.warn(`[content] scene ${s.folder} failed to load:`, err.message);
      if (lastGood.has(s.folder)) {
        return lastGood.get(s.folder);
      }
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
applyColorVars(document.documentElement, { ...defaultColors, ...(currentManifest.config?.palette || {}) });

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
      sessionState.setPosition(deckId, p);
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

  // Restore last position (if any). Scoped to the current deck by `deckId`
  // so loading a different talk folder starts fresh. Clamped against the
  // current deck shape in case scenes were added/removed since the save.
  const saved = sessionState.getPosition(deckId);
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
  // Content edits (scene.md / scene.js / talk.toml): dep-specific accept.
  // This module is NOT re-evaluated — the lastGood cache, error banner,
  // and diagnostics subscription all survive the update. We rebuild
  // SCENE_SOURCES from the new manifest, then tear down and rebuild the
  // engine. Position is preserved by *folder name* (not numeric index) so
  // mid-edit reorders/renames don't slip the current scene.
  import.meta.hot.accept('virtual:content-manifest', (newManifest) => {
    if (!newManifest) return;

    const beforePos = engine?.getPosition();
    const beforeFolder = beforePos ? SCENE_SOURCES[beforePos.sceneIndex]?.folder : null;

    currentManifest = newManifest;
    deckId = currentManifest.config?.title ?? null;
    if (currentManifest.config?.title) document.title = currentManifest.config.title;
    applyColorVars(document.documentElement, { ...defaultColors, ...(currentManifest.config?.palette || {}) });

    SCENE_SOURCES = buildSceneSources();

    teardown();
    setup();

    if (beforeFolder) {
      const newIndex = SCENE_SOURCES.findIndex(s => s.folder === beforeFolder);
      if (newIndex >= 0 && beforePos) {
        engine.goToScene(newIndex);
        engine.goToSlide?.(beforePos.slideIndex, beforePos.stepIndex);
      }
    }
  });

  // Framework src/ edits: fall back to self-accept. This re-evaluates the
  // whole module, which loses the lastGood cache — but framework edits are
  // rare compared to content edits, and the author isn't mid-compose on the
  // framework itself.
  import.meta.hot.accept(() => {
    teardown();
    setup();
  });
}
