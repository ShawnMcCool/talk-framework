# Presentation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom HTML/JS presentation engine with 3D-first visuals, scene/slide/step architecture, command palette, and containerized TDD development.

**Architecture:** Clean-room engine with four layers: Engine (navigation logic), Rendering (Three.js/SVG/HTML), Command Palette (fuzzy-search overlay), and Scenes (content). Scenes are isolation boundaries. Slides within scenes share rendering context. Every slide has a deterministic target state that can be animated to or resolved instantly.

**Tech Stack:** Vanilla JS (ES modules), Three.js, Vite, Docker, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-04-13-presentation-engine-design.md`

---

### Task 1: Project Scaffold & Docker

**Files:**
- Create: `package.json`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `.gitignore`
- Create: `dev`
- Create: `test`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "beam-talk",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "node --test src/**/*.test.js",
    "build": "vite build"
  },
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    command: npm run dev

volumes:
  node_modules:
```

- [ ] **Step 4: Create `vite.config.js`**

```js
export default {
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      clientPort: 3000,
    },
  },
};
```

- [ ] **Step 5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Beam Talk</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #app {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    #stage {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: calc(100vh * 16 / 9);
      max-height: calc(100vw * 9 / 16);
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="stage"></div>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

The `#stage` div maintains 16:9 aspect ratio via `max-width`/`max-height` constraints. The `#app` wrapper centers it with black letterboxing.

- [ ] **Step 6: Create `src/main.js`**

```js
const stage = document.getElementById('stage');
stage.style.background = '#4a5068';
stage.innerHTML = '<p style="color:#fff;font-size:2rem;text-align:center;padding-top:40vh;">beam-talk scaffold running</p>';
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 8: Create `dev` script (extensionless executable)**

```bash
#!/usr/bin/env bash
set -euo pipefail
docker compose up --build "$@"
```

Run: `chmod +x dev`

- [ ] **Step 9: Create `test` script (extensionless executable)**

```bash
#!/usr/bin/env bash
set -euo pipefail
docker compose run --rm app npm test "$@"
```

Run: `chmod +x test`

- [ ] **Step 10: Build and verify**

Run: `docker compose build`
Expected: Successful image build.

Run: `docker compose up -d && sleep 3 && curl -s http://localhost:3000 | head -5`
Expected: HTML containing "Beam Talk".

Run: `docker compose down`

- [ ] **Step 11: Commit**

```bash
git add package.json Dockerfile docker-compose.yml vite.config.js index.html src/main.js .gitignore dev test
git commit -m "scaffold: Docker + Vite project with 16:9 stage"
```

---

### Task 2: Engine Lib (TDD)

Pure navigation logic — no DOM, no rendering. Tracks position as `{sceneIndex, slideIndex, stepIndex}` and computes transitions.

**Files:**
- Create: `src/engine/engine.lib.js`
- Create: `src/engine/engine.lib.test.js`

- [ ] **Step 1: Write failing test — `createDeck` and `createPosition`**

Create `src/engine/engine.lib.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, createPosition } from './engine.lib.js';

describe('createDeck', () => {
  it('creates a deck from scene definitions', () => {
    const deck = createDeck([
      { title: 'Title', slides: [{ stepCount: 1 }] },
      { title: 'Intro', slides: [{ stepCount: 2 }, { stepCount: 3 }] },
    ]);
    assert.equal(deck.scenes.length, 2);
    assert.equal(deck.scenes[0].title, 'Title');
    assert.equal(deck.scenes[1].slides[1].stepCount, 3);
  });
});

describe('createPosition', () => {
  it('returns position at 0,0,0', () => {
    const pos = createPosition();
    assert.deepEqual(pos, { sceneIndex: 0, slideIndex: 0, stepIndex: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createDeck` and `createPosition`**

Create `src/engine/engine.lib.js`:

```js
export function createDeck(sceneDefs) {
  return {
    scenes: sceneDefs.map((s) => ({
      title: s.title,
      slides: s.slides.map((sl) => ({ stepCount: sl.stepCount })),
    })),
  };
}

export function createPosition() {
  return { sceneIndex: 0, slideIndex: 0, stepIndex: 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Write failing test — `next`**

Append to `src/engine/engine.lib.test.js`:

```js
import { next } from './engine.lib.js';

describe('next', () => {
  const deck = createDeck([
    { title: 'A', slides: [{ stepCount: 2 }, { stepCount: 1 }] },
    { title: 'B', slides: [{ stepCount: 3 }] },
  ]);

  it('advances step within a slide', () => {
    const pos = { sceneIndex: 0, slideIndex: 0, stepIndex: 0 };
    assert.deepEqual(next(pos, deck), { sceneIndex: 0, slideIndex: 0, stepIndex: 1 });
  });

  it('advances to next slide when steps exhausted', () => {
    const pos = { sceneIndex: 0, slideIndex: 0, stepIndex: 1 };
    assert.deepEqual(next(pos, deck), { sceneIndex: 0, slideIndex: 1, stepIndex: 0 });
  });

  it('advances to next scene when slides exhausted', () => {
    const pos = { sceneIndex: 0, slideIndex: 1, stepIndex: 0 };
    assert.deepEqual(next(pos, deck), { sceneIndex: 1, slideIndex: 0, stepIndex: 0 });
  });

  it('stays at end of deck', () => {
    const pos = { sceneIndex: 1, slideIndex: 0, stepIndex: 2 };
    assert.deepEqual(next(pos, deck), { sceneIndex: 1, slideIndex: 0, stepIndex: 2 });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: FAIL — `next` is not exported.

- [ ] **Step 7: Implement `next`**

Add to `src/engine/engine.lib.js`:

```js
export function next(pos, deck) {
  const scene = deck.scenes[pos.sceneIndex];
  const slide = scene.slides[pos.slideIndex];

  // Try advancing step
  if (pos.stepIndex < slide.stepCount - 1) {
    return { ...pos, stepIndex: pos.stepIndex + 1 };
  }

  // Try advancing slide
  if (pos.slideIndex < scene.slides.length - 1) {
    return { ...pos, slideIndex: pos.slideIndex + 1, stepIndex: 0 };
  }

  // Try advancing scene
  if (pos.sceneIndex < deck.scenes.length - 1) {
    return { sceneIndex: pos.sceneIndex + 1, slideIndex: 0, stepIndex: 0 };
  }

  // At end of deck
  return pos;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: PASS (all tests).

- [ ] **Step 9: Write failing test — `prev`**

Append to `src/engine/engine.lib.test.js`:

```js
import { prev } from './engine.lib.js';

describe('prev', () => {
  const deck = createDeck([
    { title: 'A', slides: [{ stepCount: 2 }, { stepCount: 1 }] },
    { title: 'B', slides: [{ stepCount: 3 }] },
  ]);

  it('goes back a step within a slide', () => {
    const pos = { sceneIndex: 0, slideIndex: 0, stepIndex: 1 };
    assert.deepEqual(prev(pos, deck), { sceneIndex: 0, slideIndex: 0, stepIndex: 0 });
  });

  it('goes to previous slide last step when at step 0', () => {
    const pos = { sceneIndex: 0, slideIndex: 1, stepIndex: 0 };
    assert.deepEqual(prev(pos, deck), { sceneIndex: 0, slideIndex: 0, stepIndex: 1 });
  });

  it('goes to previous scene last slide last step', () => {
    const pos = { sceneIndex: 1, slideIndex: 0, stepIndex: 0 };
    assert.deepEqual(prev(pos, deck), { sceneIndex: 0, slideIndex: 1, stepIndex: 0 });
  });

  it('stays at start of deck', () => {
    const pos = { sceneIndex: 0, slideIndex: 0, stepIndex: 0 };
    assert.deepEqual(prev(pos, deck), { sceneIndex: 0, slideIndex: 0, stepIndex: 0 });
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: FAIL — `prev` is not exported.

- [ ] **Step 11: Implement `prev`**

Add to `src/engine/engine.lib.js`:

```js
export function prev(pos, deck) {
  // Try going back a step
  if (pos.stepIndex > 0) {
    return { ...pos, stepIndex: pos.stepIndex - 1 };
  }

  // Try going to previous slide's last step
  if (pos.slideIndex > 0) {
    const prevSlide = deck.scenes[pos.sceneIndex].slides[pos.slideIndex - 1];
    return { ...pos, slideIndex: pos.slideIndex - 1, stepIndex: prevSlide.stepCount - 1 };
  }

  // Try going to previous scene's last slide, last step
  if (pos.sceneIndex > 0) {
    const prevScene = deck.scenes[pos.sceneIndex - 1];
    const lastSlide = prevScene.slides[prevScene.slides.length - 1];
    return {
      sceneIndex: pos.sceneIndex - 1,
      slideIndex: prevScene.slides.length - 1,
      stepIndex: lastSlide.stepCount - 1,
    };
  }

  // At start of deck
  return pos;
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: PASS (all tests).

- [ ] **Step 13: Write failing test — `goToScene`**

Append to `src/engine/engine.lib.test.js`:

```js
import { goToScene } from './engine.lib.js';

describe('goToScene', () => {
  const deck = createDeck([
    { title: 'A', slides: [{ stepCount: 2 }] },
    { title: 'B', slides: [{ stepCount: 3 }] },
  ]);

  it('returns position at first slide of target scene', () => {
    assert.deepEqual(goToScene(1, deck), { sceneIndex: 1, slideIndex: 0, stepIndex: 0 });
  });

  it('clamps to last scene if index too high', () => {
    assert.deepEqual(goToScene(99, deck), { sceneIndex: 1, slideIndex: 0, stepIndex: 0 });
  });

  it('clamps to first scene if index negative', () => {
    assert.deepEqual(goToScene(-1, deck), { sceneIndex: 0, slideIndex: 0, stepIndex: 0 });
  });
});
```

- [ ] **Step 14: Implement `goToScene`**

Add to `src/engine/engine.lib.js`:

```js
export function goToScene(sceneIndex, deck) {
  const clamped = Math.max(0, Math.min(sceneIndex, deck.scenes.length - 1));
  return { sceneIndex: clamped, slideIndex: 0, stepIndex: 0 };
}
```

- [ ] **Step 15: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: PASS (all tests).

- [ ] **Step 16: Write failing test — `isRapidInput`**

Append to `src/engine/engine.lib.test.js`:

```js
import { isRapidInput } from './engine.lib.js';

describe('isRapidInput', () => {
  it('returns false with fewer than 3 timestamps', () => {
    assert.equal(isRapidInput([100, 200]), false);
  });

  it('returns true when last 3 inputs within threshold', () => {
    assert.equal(isRapidInput([100, 250, 400], 200), true);
  });

  it('returns false when gaps exceed threshold', () => {
    assert.equal(isRapidInput([100, 400, 900], 200), false);
  });

  it('only looks at last 3 timestamps', () => {
    assert.equal(isRapidInput([0, 1000, 2000, 2100, 2200], 200), true);
  });
});
```

- [ ] **Step 17: Implement `isRapidInput`**

Add to `src/engine/engine.lib.js`:

```js
export function isRapidInput(timestamps, threshold = 200) {
  if (timestamps.length < 3) return false;
  const recent = timestamps.slice(-3);
  return (recent[1] - recent[0] < threshold) && (recent[2] - recent[1] < threshold);
}
```

- [ ] **Step 18: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: PASS (all tests).

- [ ] **Step 19: Write failing test — `sceneChanged`**

This helper tells the engine wiring whether a scene transition occurred (triggers init/destroy cycle).

Append to `src/engine/engine.lib.test.js`:

```js
import { sceneChanged } from './engine.lib.js';

describe('sceneChanged', () => {
  it('returns true when sceneIndex differs', () => {
    const from = { sceneIndex: 0, slideIndex: 1, stepIndex: 0 };
    const to = { sceneIndex: 1, slideIndex: 0, stepIndex: 0 };
    assert.equal(sceneChanged(from, to), true);
  });

  it('returns false when sceneIndex is the same', () => {
    const from = { sceneIndex: 0, slideIndex: 0, stepIndex: 0 };
    const to = { sceneIndex: 0, slideIndex: 1, stepIndex: 0 };
    assert.equal(sceneChanged(from, to), false);
  });
});
```

- [ ] **Step 20: Implement `sceneChanged`**

Add to `src/engine/engine.lib.js`:

```js
export function sceneChanged(fromPos, toPos) {
  return fromPos.sceneIndex !== toPos.sceneIndex;
}
```

- [ ] **Step 21: Run all tests and verify**

Run: `docker compose run --rm app node --test src/engine/engine.lib.test.js`
Expected: PASS (all tests).

- [ ] **Step 22: Commit**

```bash
git add src/engine/engine.lib.js src/engine/engine.lib.test.js
git commit -m "feat: engine lib — pure navigation logic with TDD"
```

---

### Task 3: Timeline Lib (TDD)

Pure animation computation — tweens, timelines, interpolation, resolve. No DOM, no rAF.

**Files:**
- Create: `src/animation/timeline.lib.js`
- Create: `src/animation/timeline.lib.test.js`

- [ ] **Step 1: Write failing test — `lerp`**

Create `src/animation/timeline.lib.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lerp } from './timeline.lib.js';

describe('lerp', () => {
  it('returns from value at t=0', () => {
    assert.equal(lerp(10, 50, 0), 10);
  });

  it('returns to value at t=1', () => {
    assert.equal(lerp(10, 50, 1), 50);
  });

  it('returns midpoint at t=0.5', () => {
    assert.equal(lerp(0, 100, 0.5), 50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app node --test src/animation/timeline.lib.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lerp`**

Create `src/animation/timeline.lib.js`:

```js
export function lerp(from, to, t) {
  return from + (to - from) * t;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/animation/timeline.lib.test.js`
Expected: PASS.

- [ ] **Step 5: Write failing test — `tweenValueAt`**

Append to `src/animation/timeline.lib.test.js`:

```js
import { tweenValueAt } from './timeline.lib.js';

describe('tweenValueAt', () => {
  const tween = { property: 'x', from: 0, to: 100, delay: 0, duration: 1000 };

  it('returns from value before tween starts', () => {
    assert.equal(tweenValueAt(tween, -100), 0);
  });

  it('returns from value at elapsed 0', () => {
    assert.equal(tweenValueAt(tween, 0), 0);
  });

  it('returns interpolated value mid-tween', () => {
    assert.equal(tweenValueAt(tween, 500), 50);
  });

  it('returns to value when tween is complete', () => {
    assert.equal(tweenValueAt(tween, 1000), 100);
  });

  it('clamps at to value past duration', () => {
    assert.equal(tweenValueAt(tween, 2000), 100);
  });

  it('respects delay', () => {
    const delayed = { property: 'x', from: 0, to: 100, delay: 500, duration: 1000 };
    assert.equal(tweenValueAt(delayed, 0), 0);
    assert.equal(tweenValueAt(delayed, 500), 0);
    assert.equal(tweenValueAt(delayed, 1000), 50);
    assert.equal(tweenValueAt(delayed, 1500), 100);
  });
});
```

- [ ] **Step 6: Implement `tweenValueAt`**

Add to `src/animation/timeline.lib.js`:

```js
export function tweenValueAt(tween, elapsed) {
  const localTime = elapsed - tween.delay;
  if (localTime <= 0) return tween.from;
  if (localTime >= tween.duration) return tween.to;
  const t = localTime / tween.duration;
  return lerp(tween.from, tween.to, t);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/animation/timeline.lib.test.js`
Expected: PASS.

- [ ] **Step 8: Write failing test — `createTimeline`, `timelineValuesAt`, `timelineResolve`**

Append to `src/animation/timeline.lib.test.js`:

```js
import { createTimeline, timelineValuesAt, timelineResolve, timelineDuration } from './timeline.lib.js';

describe('createTimeline', () => {
  it('computes total duration from tweens', () => {
    const tl = createTimeline([
      { property: 'x', from: 0, to: 100, delay: 0, duration: 500 },
      { property: 'y', from: 0, to: 200, delay: 200, duration: 800 },
    ]);
    assert.equal(timelineDuration(tl), 1000); // max(0+500, 200+800)
  });
});

describe('timelineValuesAt', () => {
  const tl = createTimeline([
    { property: 'x', from: 0, to: 100, delay: 0, duration: 1000 },
    { property: 'y', from: 50, to: 150, delay: 500, duration: 500 },
  ]);

  it('returns all values at a given time', () => {
    const vals = timelineValuesAt(tl, 500);
    assert.equal(vals.x, 50);
    assert.equal(vals.y, 50); // delay=500, so at t=500 it just starts
  });

  it('returns final values past total duration', () => {
    const vals = timelineValuesAt(tl, 2000);
    assert.equal(vals.x, 100);
    assert.equal(vals.y, 150);
  });
});

describe('timelineResolve', () => {
  it('returns all final values', () => {
    const tl = createTimeline([
      { property: 'x', from: 0, to: 100, delay: 0, duration: 500 },
      { property: 'opacity', from: 0, to: 1, delay: 0, duration: 300 },
    ]);
    const vals = timelineResolve(tl);
    assert.equal(vals.x, 100);
    assert.equal(vals.opacity, 1);
  });
});
```

- [ ] **Step 9: Implement `createTimeline`, `timelineValuesAt`, `timelineResolve`, `timelineDuration`**

Add to `src/animation/timeline.lib.js`:

```js
export function createTimeline(tweens) {
  return { tweens };
}

export function timelineDuration(timeline) {
  return Math.max(0, ...timeline.tweens.map((t) => t.delay + t.duration));
}

export function timelineValuesAt(timeline, elapsed) {
  const values = {};
  for (const tween of timeline.tweens) {
    values[tween.property] = tweenValueAt(tween, elapsed);
  }
  return values;
}

export function timelineResolve(timeline) {
  return timelineValuesAt(timeline, timelineDuration(timeline));
}
```

- [ ] **Step 10: Run all tests to verify**

Run: `docker compose run --rm app node --test src/animation/timeline.lib.test.js`
Expected: PASS (all tests).

- [ ] **Step 11: Commit**

```bash
git add src/animation/timeline.lib.js src/animation/timeline.lib.test.js
git commit -m "feat: timeline lib — pure tween/timeline computation with TDD"
```

---

### Task 4: Command Palette Lib (TDD)

Pure command registry and fuzzy matching. No DOM.

**Files:**
- Create: `src/commands/palette.lib.js`
- Create: `src/commands/palette.lib.test.js`

- [ ] **Step 1: Write failing test — `createRegistry`, `register`, `getCommands`**

Create `src/commands/palette.lib.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry, register, getCommands } from './palette.lib.js';

describe('createRegistry', () => {
  it('creates an empty registry', () => {
    const reg = createRegistry();
    assert.deepEqual(getCommands(reg), []);
  });
});

describe('register', () => {
  it('adds a command to the registry', () => {
    let reg = createRegistry();
    reg = register(reg, { id: 'test', title: 'Test Command', action: () => {} });
    assert.equal(getCommands(reg).length, 1);
    assert.equal(getCommands(reg)[0].title, 'Test Command');
  });

  it('replaces command with same id', () => {
    let reg = createRegistry();
    reg = register(reg, { id: 'test', title: 'First', action: () => {} });
    reg = register(reg, { id: 'test', title: 'Second', action: () => {} });
    assert.equal(getCommands(reg).length, 1);
    assert.equal(getCommands(reg)[0].title, 'Second');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose run --rm app node --test src/commands/palette.lib.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createRegistry`, `register`, `getCommands`**

Create `src/commands/palette.lib.js`:

```js
export function createRegistry() {
  return { commands: [] };
}

export function register(registry, command) {
  const filtered = registry.commands.filter((c) => c.id !== command.id);
  return { commands: [...filtered, command] };
}

export function getCommands(registry) {
  return registry.commands;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/commands/palette.lib.test.js`
Expected: PASS.

- [ ] **Step 5: Write failing test — `fuzzyMatch`**

Append to `src/commands/palette.lib.test.js`:

```js
import { fuzzyMatch } from './palette.lib.js';

describe('fuzzyMatch', () => {
  it('matches empty query to everything', () => {
    assert.equal(fuzzyMatch('', 'anything').matched, true);
  });

  it('matches exact substring', () => {
    assert.equal(fuzzyMatch('scene', 'Go to Scene').matched, true);
  });

  it('matches case-insensitively', () => {
    assert.equal(fuzzyMatch('SCENE', 'Go to Scene').matched, true);
  });

  it('matches characters in order (fuzzy)', () => {
    assert.equal(fuzzyMatch('gts', 'Go to Scene').matched, true);
  });

  it('rejects characters out of order', () => {
    assert.equal(fuzzyMatch('stg', 'Go to Scene').matched, false);
  });

  it('scores consecutive matches higher', () => {
    const exact = fuzzyMatch('scene', 'Go to Scene');
    const sparse = fuzzyMatch('gtsne', 'Go to Scene');
    assert.ok(exact.score > sparse.score);
  });
});
```

- [ ] **Step 6: Implement `fuzzyMatch`**

Add to `src/commands/palette.lib.js`:

```js
export function fuzzyMatch(query, text) {
  if (query === '') return { matched: true, score: 0 };

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  let qi = 0;
  let score = 0;
  let consecutive = 0;

  for (let ti = 0; ti < textLower.length && qi < queryLower.length; ti++) {
    if (textLower[ti] === queryLower[qi]) {
      qi++;
      consecutive++;
      score += consecutive;
    } else {
      consecutive = 0;
    }
  }

  return { matched: qi === queryLower.length, score };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `docker compose run --rm app node --test src/commands/palette.lib.test.js`
Expected: PASS.

- [ ] **Step 8: Write failing test — `filterCommands`**

Append to `src/commands/palette.lib.test.js`:

```js
import { filterCommands } from './palette.lib.js';

describe('filterCommands', () => {
  const commands = [
    { id: 'go', title: 'Go to Scene', action: () => {} },
    { id: 'reset', title: 'Reset Scene', action: () => {} },
    { id: 'debug', title: 'Toggle Debug', dev: true, action: () => {} },
  ];

  it('returns all commands for empty query', () => {
    assert.equal(filterCommands(commands, '').length, 3);
  });

  it('filters by fuzzy match', () => {
    const results = filterCommands(commands, 'scene');
    assert.equal(results.length, 2);
  });

  it('sorts by score descending', () => {
    const results = filterCommands(commands, 'reset');
    assert.equal(results[0].id, 'reset');
  });

  it('filters dev commands when devMode is false', () => {
    const results = filterCommands(commands, '', { devMode: false });
    assert.equal(results.length, 2);
    assert.ok(results.every((c) => c.id !== 'debug'));
  });

  it('includes dev commands when devMode is true', () => {
    const results = filterCommands(commands, '', { devMode: true });
    assert.equal(results.length, 3);
  });
});
```

- [ ] **Step 9: Implement `filterCommands`**

Add to `src/commands/palette.lib.js`:

```js
export function filterCommands(commands, query, opts = {}) {
  const { devMode = true } = opts;

  return commands
    .filter((cmd) => devMode || !cmd.dev)
    .map((cmd) => ({ ...cmd, ...fuzzyMatch(query, cmd.title) }))
    .filter((cmd) => cmd.matched)
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 10: Run all tests to verify**

Run: `docker compose run --rm app node --test src/commands/palette.lib.test.js`
Expected: PASS (all tests).

- [ ] **Step 11: Commit**

```bash
git add src/commands/palette.lib.js src/commands/palette.lib.test.js
git commit -m "feat: palette lib — command registry and fuzzy matching with TDD"
```

---

### Task 5: Shared Styles, HTML Renderer, and Engine Wiring

First visual output. After this task, the app boots, shows an HTML scene, and responds to keyboard navigation.

**Files:**
- Create: `src/shared/colors.js`
- Create: `src/rendering/html-scene.js`
- Create: `src/engine/engine.js`
- Create: `src/scenes/demo-html/scene.js`
- Modify: `src/main.js`
- Modify: `index.html`

- [ ] **Step 1: Create `src/shared/colors.js`**

```js
export const colors = {
  bg: '#4a5068',
  bgDark: '#383d52',
  bgDarker: '#2d3142',
  text: '#e8e8f0',
  textMuted: '#9a9cb8',
  accent: '#5fb4a2',
  accentWarm: '#f2b866',
  accentOrange: '#e8915a',
  failure: '#e86b6b',
  beam: '#8fa4d4',
};

export function applyColorVars(el) {
  for (const [key, value] of Object.entries(colors)) {
    el.style.setProperty(`--color-${key}`, value);
  }
}
```

- [ ] **Step 2: Create `src/rendering/html-scene.js`**

```js
export function createHtmlRenderer() {
  let container = null;

  return {
    init(stage) {
      container = document.createElement('div');
      container.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;';
      stage.appendChild(container);
      return container;
    },

    destroy() {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      container = null;
    },

    getContainer() {
      return container;
    },
  };
}
```

- [ ] **Step 3: Create `src/engine/engine.js`**

This wires the pure engine lib to DOM events and scene lifecycles.

```js
import { createDeck, createPosition, next, prev, goToScene, sceneChanged, isRapidInput } from './engine.lib.js';

export function createEngine({ stage, sceneDefs }) {
  const deckDef = sceneDefs.map((s) => ({ title: s.title, slides: s.slides }));
  const deck = createDeck(deckDef);
  let position = createPosition();
  let currentSceneModule = null;
  let currentSceneCtx = null;
  const inputTimestamps = [];
  let animating = false;
  let pendingResolve = null;

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
```

- [ ] **Step 4: Create `src/scenes/demo-html/scene.js`**

A simple HTML scene with 3 slides, 2 steps each, proving navigation works.

```js
import { createHtmlRenderer } from '../../rendering/html-scene.js';
import { colors } from '../../shared/colors.js';

const renderer = createHtmlRenderer();

const slideContents = [
  {
    steps: [
      { type: 'click' },
      { type: 'click' },
    ],
    resolve(container, stepIndex) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:${colors.bg};">
          <h1 style="color:${colors.text};font-size:4rem;font-family:sans-serif;">Demo Scene</h1>
          ${stepIndex >= 1 ? `<p style="color:${colors.textMuted};font-size:1.5rem;margin-top:1rem;font-family:sans-serif;">Slide 1 — Step 2 revealed</p>` : ''}
        </div>`;
    },
  },
  {
    steps: [
      { type: 'click' },
      { type: 'click' },
    ],
    resolve(container, stepIndex) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:${colors.bg};">
          <h1 style="color:${colors.accentWarm};font-size:3rem;font-family:sans-serif;">Second Slide</h1>
          ${stepIndex >= 1 ? `<p style="color:${colors.accent};font-size:1.5rem;margin-top:1rem;font-family:sans-serif;">With a second step</p>` : ''}
        </div>`;
    },
  },
  {
    steps: [
      { type: 'click' },
    ],
    resolve(container, stepIndex) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:${colors.bg};">
          <h1 style="color:${colors.failure};font-size:3rem;font-family:sans-serif;">Last Slide</h1>
        </div>`;
    },
  },
];

export const demoHtmlScene = {
  title: 'Demo',
  slides: slideContents.map((s) => ({ stepCount: s.steps.length })),

  init(stage) {
    const container = renderer.init(stage);
    return { container };
  },

  destroy() {
    renderer.destroy();
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    slideContents[slideIndex].resolve(ctx.container, stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    slideContents[slideIndex].resolve(ctx.container, stepIndex);
    done();
  },
};
```

- [ ] **Step 5: Update `src/main.js`**

```js
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
```

- [ ] **Step 6: Add base font styles to `index.html`**

Add to the `<style>` block in `index.html`, after the existing rules:

```css
:root {
  --ui-scale: 1;
  font-size: calc(16px * var(--ui-scale));
}
#stage {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 7: Test manually**

Run: `docker compose up --build -d`

Open `http://localhost:3000` in browser.
Expected: Dark slate-blue screen showing "Demo Scene". Press right arrow — "Step 2 revealed" appears. Press right arrow again — "Second Slide" appears. Continue — last slide shows in red. Left arrow navigates back correctly.

Run: `docker compose down`

- [ ] **Step 8: Commit**

```bash
git add src/shared/colors.js src/rendering/html-scene.js src/engine/engine.js src/scenes/demo-html/scene.js src/main.js index.html
git commit -m "feat: working engine with HTML renderer and keyboard navigation"
```

---

### Task 6: Command Palette DOM

Wire the palette lib to a DOM overlay. Escape opens/closes. Fuzzy filter shows matching commands.

**Files:**
- Create: `src/commands/palette.js`
- Create: `src/commands/palette.css.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create `src/commands/palette.css.js`**

Inline styles as a JS module (avoids needing CSS imports configured in Vite for this component).

```js
export const paletteStyles = `
  .palette-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20vh;
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }
  .palette-overlay.open {
    opacity: 1;
    pointer-events: auto;
  }
  .palette-box {
    background: #2d3142;
    border: 1px solid #4a5068;
    border-radius: 8px;
    width: 480px;
    max-width: 90vw;
    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
    overflow: hidden;
  }
  .palette-input {
    width: 100%;
    padding: 14px 16px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #4a5068;
    color: #e8e8f0;
    font-size: 1rem;
    font-family: inherit;
    outline: none;
  }
  .palette-input::placeholder { color: #6a6c88; }
  .palette-results {
    max-height: 300px;
    overflow-y: auto;
  }
  .palette-item {
    padding: 10px 16px;
    color: #9a9cb8;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
  }
  .palette-item:hover, .palette-item.selected {
    background: #383d52;
    color: #e8e8f0;
  }
`;
```

- [ ] **Step 2: Create `src/commands/palette.js`**

```js
import { createRegistry, register, getCommands, filterCommands } from './palette.lib.js';
import { paletteStyles } from './palette.css.js';

export function createPalette({ devMode = true } = {}) {
  let registry = createRegistry();
  let overlay = null;
  let input = null;
  let resultsList = null;
  let isOpen = false;
  let selectedIndex = 0;

  function injectStyles() {
    if (document.getElementById('palette-styles')) return;
    const style = document.createElement('style');
    style.id = 'palette-styles';
    style.textContent = paletteStyles;
    document.head.appendChild(style);
  }

  function createDOM() {
    injectStyles();
    overlay = document.createElement('div');
    overlay.className = 'palette-overlay';
    overlay.innerHTML = `
      <div class="palette-box">
        <input class="palette-input" placeholder="Type a command..." />
        <div class="palette-results"></div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('.palette-input');
    resultsList = overlay.querySelector('.palette-results');

    input.addEventListener('input', () => {
      selectedIndex = 0;
      renderResults();
    });

    input.addEventListener('keydown', (e) => {
      const items = getFilteredCommands();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        renderResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          const query = input.value;
          close();
          items[selectedIndex].action(query);
        }
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  function getFilteredCommands() {
    return filterCommands(getCommands(registry), input ? input.value : '', { devMode });
  }

  function renderResults() {
    const items = getFilteredCommands();
    resultsList.innerHTML = items
      .map((cmd, i) =>
        `<div class="palette-item${i === selectedIndex ? ' selected' : ''}" data-index="${i}">${cmd.title}</div>`
      )
      .join('');

    resultsList.querySelectorAll('.palette-item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const query = input.value;
        close();
        items[idx].action(query);
      });
    });
  }

  function open() {
    if (!overlay) createDOM();
    isOpen = true;
    overlay.classList.add('open');
    input.value = '';
    selectedIndex = 0;
    renderResults();
    input.focus();
  }

  function close() {
    isOpen = false;
    if (overlay) overlay.classList.remove('open');
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) {
        close();
      } else {
        open();
      }
    }
  }

  return {
    start() {
      document.addEventListener('keydown', handleKeyDown, true);
    },

    stop() {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    },

    register(command) {
      registry = register(registry, command);
    },

    isOpen() {
      return isOpen;
    },
  };
}
```

- [ ] **Step 3: Update `src/main.js` to wire palette with engine commands**

```js
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

// Register each scene as a direct jump command
engine.getSceneDefs().forEach((scene, i) => {
  palette.register({
    id: `scene-${i}`,
    title: `Scene ${i + 1}: ${scene.title}`,
    action: () => engine.goToScene(i),
  });
});

engine.start();
palette.start();
```

- [ ] **Step 4: Test manually**

Run: `docker compose up --build -d`

Open `http://localhost:3000`.
Expected: Presentation loads. Press Escape — command palette appears with fuzzy search. Type "demo" — shows "Scene 1: Demo". Press Enter — jumps to that scene. Press Escape again — palette closes. Arrow keys still navigate slides.

Run: `docker compose down`

- [ ] **Step 5: Commit**

```bash
git add src/commands/palette.js src/commands/palette.css.js src/main.js
git commit -m "feat: command palette with fuzzy search and scene jumping"
```

---

### Task 7: Three.js Renderer Base

Base Three.js renderer with orthographic camera, lighting, on-demand rendering, and a demo 3D scene.

**Files:**
- Create: `src/rendering/three-scene.js`
- Create: `src/scenes/demo-three/scene.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create `src/rendering/three-scene.js`**

```js
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

      // Ambient + directional lighting (from visualizer city view pattern)
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
```

- [ ] **Step 2: Create `src/scenes/demo-three/scene.js`**

A 3D scene with two slides: first shows a colored box, second adds a second box and moves the first.

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { colors } from '../../shared/colors.js';

let renderer = null;
let box1 = null;
let box2 = null;
let threeCtx = null;

const slideData = [
  {
    stepCount: 1,
    resolve(ctx) {
      box1.position.set(-1, 0, 0);
      box1.visible = true;
      box2.visible = false;
      renderer.markDirty();
    },
  },
  {
    stepCount: 2,
    resolve(ctx, stepIndex) {
      box1.position.set(1, 0, 0);
      box1.visible = true;
      box2.visible = stepIndex >= 1;
      box2.position.set(-1, 0, 0);
      renderer.markDirty();
    },
  },
];

export const demoThreeScene = {
  title: 'Demo 3D',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);

    const geo = new THREE.BoxGeometry(1, 1, 1);

    box1 = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: colors.accentWarm }));
    threeCtx.scene.add(box1);

    box2 = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: colors.accent }));
    box2.visible = false;
    threeCtx.scene.add(box2);

    threeCtx.scene.background = new THREE.Color(colors.bg);

    return { threeCtx };
  },

  destroy() {
    if (renderer) renderer.destroy();
    renderer = null;
    box1 = null;
    box2 = null;
    threeCtx = null;
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    // Resolve all slides up to current to build cumulative state
    // Since each slide's resolve sets absolute state, just call the target
    slideData[slideIndex].resolve(ctx, stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    // For now, resolve immediately. Animation will use timeline system later.
    slideData[slideIndex].resolve(ctx, stepIndex);
    done();
  },
};
```

- [ ] **Step 3: Update `src/main.js` to include both demo scenes**

```js
import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { demoHtmlScene } from './scenes/demo-html/scene.js';
import { demoThreeScene } from './scenes/demo-three/scene.js';
import { applyColorVars } from './shared/colors.js';

const stage = document.getElementById('stage');
applyColorVars(document.documentElement);

const engine = createEngine({
  stage,
  sceneDefs: [demoHtmlScene, demoThreeScene],
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
```

- [ ] **Step 4: Test manually**

Run: `docker compose up --build -d`

Open `http://localhost:3000`.
Expected: Starts on "Demo Scene" (HTML). Navigate through it. When HTML slides are exhausted, pressing right arrow transitions to the 3D scene — shows a warm yellow box on a slate-blue background. Continue navigating — box moves, teal box appears. Navigate back — returns to HTML scene at its last slide. Press Escape — command palette works, can jump between Scene 1 (Demo) and Scene 2 (Demo 3D).

Run: `docker compose down`

- [ ] **Step 5: Commit**

```bash
git add src/rendering/three-scene.js src/scenes/demo-three/scene.js src/main.js
git commit -m "feat: Three.js renderer with orthographic camera and demo 3D scene"
```

---

### Task 8: Animation Timeline Wiring

Connect the pure timeline lib to actual scene objects via requestAnimationFrame. This enables smooth animated transitions between slides.

**Files:**
- Create: `src/animation/timeline.js`
- Modify: `src/scenes/demo-three/scene.js`

- [ ] **Step 1: Create `src/animation/timeline.js`**

```js
import { createTimeline, timelineValuesAt, timelineDuration } from './timeline.lib.js';

export function playTimeline(tweenDefs, applyFn, doneFn) {
  const timeline = createTimeline(tweenDefs);
  const duration = timelineDuration(timeline);
  const startTime = performance.now();
  let frameId = null;

  function tick(now) {
    const elapsed = now - startTime;
    const values = timelineValuesAt(timeline, elapsed);
    applyFn(values);

    if (elapsed < duration) {
      frameId = requestAnimationFrame(tick);
    } else {
      doneFn();
    }
  }

  frameId = requestAnimationFrame(tick);

  // Return a cancel/resolve function
  return {
    resolve() {
      if (frameId) cancelAnimationFrame(frameId);
      const finalValues = timelineValuesAt(timeline, duration);
      applyFn(finalValues);
      doneFn();
    },
  };
}
```

- [ ] **Step 2: Update `src/scenes/demo-three/scene.js` to use animated transitions**

Replace the `animateToSlide` method in the scene:

```js
import * as THREE from 'three';
import { createThreeRenderer } from '../../rendering/three-scene.js';
import { playTimeline } from '../../animation/timeline.js';
import { colors } from '../../shared/colors.js';

let renderer = null;
let box1 = null;
let box2 = null;
let threeCtx = null;
let currentAnimation = null;

const slideData = [
  {
    stepCount: 1,
    resolve() {
      box1.position.set(-1, 0, 0);
      box1.visible = true;
      box2.visible = false;
      renderer.markDirty();
    },
    animate(done) {
      // First slide just resolves (nothing to animate from)
      this.resolve();
      done();
    },
  },
  {
    stepCount: 2,
    resolve(stepIndex) {
      box1.position.set(1, 0, 0);
      box1.visible = true;
      box2.visible = stepIndex >= 1;
      box2.position.set(-1, 0, 0);
      renderer.markDirty();
    },
    animate(stepIndex, done) {
      if (stepIndex === 0) {
        // Animate box1 moving from -1 to 1
        currentAnimation = playTimeline(
          [{ property: 'box1x', from: -1, to: 1, delay: 0, duration: 600 }],
          (vals) => {
            box1.position.x = vals.box1x;
            renderer.markDirty();
          },
          () => {
            box2.visible = false;
            currentAnimation = null;
            done();
          },
        );
      } else {
        // Step 1: reveal box2
        box2.visible = true;
        box2.position.set(-1, 0, 0);
        renderer.markDirty();
        done();
      }
    },
  },
];

export const demoThreeScene = {
  title: 'Demo 3D',
  slides: slideData.map((s) => ({ stepCount: s.stepCount })),

  init(stage) {
    renderer = createThreeRenderer();
    threeCtx = renderer.init(stage);

    const geo = new THREE.BoxGeometry(1, 1, 1);

    box1 = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: colors.accentWarm }));
    threeCtx.scene.add(box1);

    box2 = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: colors.accent }));
    box2.visible = false;
    threeCtx.scene.add(box2);

    threeCtx.scene.background = new THREE.Color(colors.bg);

    return {};
  },

  destroy() {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    if (renderer) renderer.destroy();
    renderer = null;
    box1 = null;
    box2 = null;
    threeCtx = null;
  },

  resolveToSlide(ctx, slideIndex, stepIndex) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].resolve(stepIndex);
  },

  animateToSlide(ctx, slideIndex, stepIndex, done) {
    if (currentAnimation) {
      currentAnimation.resolve();
      currentAnimation = null;
    }
    slideData[slideIndex].animate(stepIndex, done);
  },
};
```

- [ ] **Step 3: Test manually**

Run: `docker compose up --build -d`

Open `http://localhost:3000`.
Navigate to the 3D scene. On slide 2, the box should smoothly animate from left to right (600ms). If you press right arrow during the animation, it should snap to the end state and advance. Rapid pressing should resolve instantly without visible animation.

Run: `docker compose down`

- [ ] **Step 4: Commit**

```bash
git add src/animation/timeline.js src/scenes/demo-three/scene.js
git commit -m "feat: animation timeline wiring — smooth tweens with resolve-on-interrupt"
```

---

### Task 9: HMR Dev Harness

Hook into Vite's HMR so editing a scene file re-initializes it at the current position.

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add HMR handling to `src/main.js`**

Replace `src/main.js` entirely:

```js
import { createEngine } from './engine/engine.js';
import { createPalette } from './commands/palette.js';
import { demoHtmlScene } from './scenes/demo-html/scene.js';
import { demoThreeScene } from './scenes/demo-three/scene.js';
import { applyColorVars } from './shared/colors.js';

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
```

- [ ] **Step 2: Test HMR**

Run: `docker compose up --build -d`

Open `http://localhost:3000`. Navigate to the 3D scene (scene 2). Edit `src/shared/colors.js` — change `accentWarm` to `'#ff0000'`. Save.

Expected: The browser updates without full reload. The engine reinitializes at scene 2. The box is now red.

Run: `docker compose down`

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: HMR dev harness — scene hot reload preserving position"
```

---

### Task 10: Debug Overlay

A dev-mode command that shows current scene/slide/step position, registered as a palette command.

**Files:**
- Create: `src/debug/overlay.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create `src/debug/overlay.js`**

```js
export function createDebugOverlay(getPosition, getDeck) {
  let el = null;
  let visible = false;
  let frameId = null;

  function update() {
    if (!visible || !el) return;
    const pos = getPosition();
    const deck = getDeck();
    const scene = deck.scenes[pos.sceneIndex];
    const totalScenes = deck.scenes.length;
    const totalSlides = scene ? scene.slides.length : 0;
    const slide = scene ? scene.slides[pos.slideIndex] : null;
    const totalSteps = slide ? slide.stepCount : 0;

    el.textContent =
      `Scene ${pos.sceneIndex + 1}/${totalScenes}` +
      ` | Slide ${pos.slideIndex + 1}/${totalSlides}` +
      ` | Step ${pos.stepIndex + 1}/${totalSteps}`;

    frameId = requestAnimationFrame(update);
  }

  return {
    toggle() {
      visible = !visible;
      if (visible) {
        if (!el) {
          el = document.createElement('div');
          el.style.cssText =
            'position:fixed;bottom:12px;left:12px;padding:6px 12px;' +
            'background:rgba(0,0,0,0.7);color:#5fb4a2;font-size:13px;' +
            'font-family:monospace;border-radius:4px;z-index:999;pointer-events:none;';
          document.body.appendChild(el);
        }
        el.style.display = 'block';
        update();
      } else {
        if (el) el.style.display = 'none';
        if (frameId) cancelAnimationFrame(frameId);
      }
    },

    destroy() {
      if (frameId) cancelAnimationFrame(frameId);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    },
  };
}
```

- [ ] **Step 2: Wire debug overlay into `src/main.js`**

Add after palette setup, before `engine.start()`:

```js
import { createDebugOverlay } from './debug/overlay.js';

// ... inside setup(), after palette.register calls:

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
```

- [ ] **Step 3: Test manually**

Run: `docker compose up --build -d`

Open `http://localhost:3000`. Press Escape, type "debug", select "Toggle Debug Overlay". A small overlay appears at bottom-left showing `Scene 1/2 | Slide 1/3 | Step 1/2`. Navigate slides — overlay updates in real time.

Run: `docker compose down`

- [ ] **Step 4: Commit**

```bash
git add src/debug/overlay.js src/main.js
git commit -m "feat: debug overlay — shows scene/slide/step position via command palette"
```

---

## Summary

After all 10 tasks, the project has:

- **Containerized dev environment** — `./dev` and `./test`, nothing on host
- **Pure engine lib** with full TDD — position tracking, navigation, rapid skip detection
- **Pure timeline lib** with full TDD — tweens, timelines, interpolation, resolve
- **Pure palette lib** with full TDD — command registry, fuzzy matching, filtering
- **HTML renderer** — for text/title slides
- **Three.js renderer** — orthographic camera, lighting, on-demand rendering
- **Command palette** — Escape to toggle, fuzzy search, scene jumping
- **Animation system** — smooth tweens with resolve-on-interrupt
- **HMR dev harness** — edit scenes, browser updates preserving position
- **Debug overlay** — real-time position display

SVG renderer is architecturally supported but not yet implemented (YAGNI — add when a scene needs it).

The demo scenes prove the full stack works: HTML scene with click-driven step reveals, Three.js scene with animated transitions, scene-to-scene navigation, command palette jumping, and rapid skip with deterministic resolve.

From here, actual presentation content (scenes 01-title through 13-supervisors from the spec) can be built scene-by-scene, each as an independent unit.
