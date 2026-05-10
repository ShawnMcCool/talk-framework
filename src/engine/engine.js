import { createDeck, createPosition, next, prev, goToScene, sceneChanged, isRapidInput } from './engine.lib.js';

export function createEngine({ stage, sceneDefs, onPositionChange = null }) {
  const deckDef = sceneDefs.map((s) => ({ title: s.title, slides: s.slides }));
  const deck = createDeck(deckDef);
  let position = createPosition();
  let currentSceneModule = null;
  let currentSceneCtx = null;
  const inputTimestamps = [];
  let animating = false;

  function activeScene() {
    return sceneDefs[position.sceneIndex];
  }

  function enterScene(sceneDef) {
    currentSceneModule = sceneDef;
    currentSceneCtx = sceneDef.init(stage);
  }

  function leaveScene() {
    if (currentSceneModule) {
      currentSceneModule.destroy(currentSceneCtx);
      currentSceneModule = null;
      currentSceneCtx = null;
      // The destroyed scene cannot still be animating, and its animateToSlide
      // chain may have been interrupted before its done() callback fired.
      // Without this reset the engine would think an animation was still in
      // flight and route every subsequent step transition through
      // resolveToSlide instead of animateToSlide — silencing all per-step
      // animations for the rest of the session.
      animating = false;
    }
  }

  function resolveToCurrentSlide() {
    if (currentSceneModule) {
      currentSceneModule.resolveToSlide(currentSceneCtx, position.slideIndex, position.stepIndex);
    }
  }

  function animateToCurrentSlide() {
    if (currentSceneModule && currentSceneModule.animateToSlide) {
      animating = true;
      const done = () => { animating = false; };
      currentSceneModule.animateToSlide(currentSceneCtx, position.slideIndex, position.stepIndex, done);
    }
  }

  function navigate(newPos) {
    const oldPos = position;
    position = newPos;

    if (sceneChanged(oldPos, newPos)) {
      leaveScene();
      enterScene(activeScene());
      resolveToCurrentSlide();
    } else {
      const rapid = isRapidInput(inputTimestamps);
      if (rapid || animating) {
        resolveToCurrentSlide();
      } else {
        animateToCurrentSlide();
      }
    }

    if (onPositionChange) onPositionChange(position);
  }

  function handleKeyDown(e) {
    // Don't steal keys from focused inputs (command palette, future forms, etc.)
    const target = e.target;
    const tag = (target && target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      inputTimestamps.push(Date.now());
      if (inputTimestamps.length > 10) inputTimestamps.shift();
      navigate(next(position, deck));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      inputTimestamps.push(Date.now());
      if (inputTimestamps.length > 10) inputTimestamps.shift();
      navigate(prev(position, deck));
    }
  }

  return {
    start() {
      document.addEventListener('keydown', handleKeyDown);
      enterScene(activeScene());
      resolveToCurrentSlide();
    },

    stop() {
      document.removeEventListener('keydown', handleKeyDown);
      leaveScene();
    },

    goToScene(index) {
      navigate(goToScene(index, deck));
    },

    goToSlide(slideIndex, stepIndex = 0) {
      const scene = deck.scenes[position.sceneIndex];
      if (!scene) return;
      const clampedSlide = Math.max(0, Math.min(slideIndex, scene.slides.length - 1));
      const slide = scene.slides[clampedSlide];
      const clampedStep = Math.max(0, Math.min(stepIndex, slide.stepCount - 1));
      navigate({ sceneIndex: position.sceneIndex, slideIndex: clampedSlide, stepIndex: clampedStep });
    },

    getPosition() {
      return { ...position };
    },

    getDeck() {
      return deck;
    },

    getSceneDefs() {
      return sceneDefs;
    },
  };
}
