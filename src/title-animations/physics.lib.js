export const DEFAULT_CONFIG = {
  gravity: 50,
  restitution: 0,
  groundY: -2.5,
  startY: 7,
  maxDuration: 1.5,
};

export function createInitialState(config = DEFAULT_CONFIG) {
  return {
    y: config.startY,
    vy: 0,
    settled: false,
    justLanded: false,
    impactVelocity: 0,
    elapsed: 0,
  };
}

export function simulateStep(state, dt, config = DEFAULT_CONFIG) {
  if (state.settled) return { ...state, justLanded: false };

  let { y, vy, elapsed } = state;
  let justLanded = false;
  let impactVelocity = 0;

  elapsed += dt;

  vy += config.gravity * dt;
  y -= vy * dt;

  let settled = false;
  if (y <= config.groundY) {
    y = config.groundY;
    impactVelocity = vy;
    vy = 0;
    justLanded = true;
    settled = true;
  }

  if (elapsed >= (config.maxDuration || 999)) {
    y = config.groundY;
    vy = 0;
    settled = true;
  }

  return { y, vy, settled, justLanded, impactVelocity, elapsed };
}

export function computeRestState(config = DEFAULT_CONFIG) {
  return {
    y: config.groundY,
    vy: 0,
    settled: true,
    justLanded: false,
    impactVelocity: 0,
    elapsed: 0,
  };
}
