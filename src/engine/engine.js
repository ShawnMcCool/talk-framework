import { createDeck, createPosition, next, prev, goToScene, sceneChanged, isRapidInput } from './engine.lib.js';

export function createEngine({ stage, sceneDefs }) {
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
  }

  function handleKeyDown(e) {
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
