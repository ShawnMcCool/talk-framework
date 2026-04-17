// Pure data: node positions + per-slide graph states.
// No DOM imports — safe to unit test.

// SVG viewport used by the Cycle scene's graph region.
// The scene uses a 1000x600 viewBox; the graph occupies y: 40..420.
export const GRAPH_VIEWBOX = { w: 1000, h: 420 };

// Absolute positions for every node that ever appears across slides 0-4.
// Positions are shared across slides so a node doesn't move if it persists.
export const NODE_POSITIONS = {
  user:         { x: 420, y: 220 },
  post:         { x: 500, y: 220 },
  comment:      { x: 580, y: 220 },

  tag:          { x: 445, y: 130 },
  category:     { x: 555, y: 130 },
  subscription: { x: 390, y: 310 },
  notification: { x: 610, y: 310 },

  auth:         { x: 290, y: 220 },
  payment:      { x: 710, y: 220 },
  admin:        { x: 310, y: 120 },
  webhook:      { x: 690, y: 120 },
  report:       { x: 500, y: 340 },

  invoice:      { x: 780, y: 310 },
  attachment:   { x: 220, y: 310 },
  session:      { x: 500, y: 60 },
};

const e = (a, b) => [a, b];

// Slide 0 — Day 1: tiny, clean
const SLIDE_0 = {
  nodes: ['user', 'post', 'comment'],
  edges: [e('user', 'post'), e('post', 'comment')],
  redEdges: [],
  stampStartOver: false,
  timelineDot: 'excited',
};

// Slide 1 — Shipping: flow, 7 nodes, still clean
const SLIDE_1 = {
  nodes: ['user', 'post', 'comment', 'tag', 'category', 'subscription', 'notification'],
  edges: [
    e('user', 'post'),
    e('post', 'comment'),
    e('post', 'tag'),
    e('post', 'category'),
    e('user', 'subscription'),
    e('subscription', 'notification'),
    e('user', 'comment'),
  ],
  redEdges: [],
  stampStartOver: false,
  timelineDot: 'shipping',
};

// Slide 2 — Friction: 12 nodes, edges multiplying, crossings
const SLIDE_2 = {
  nodes: [...SLIDE_1.nodes, 'auth', 'payment', 'admin', 'webhook', 'report'],
  edges: [
    ...SLIDE_1.edges,
    e('auth', 'user'),
    e('payment', 'user'),
    e('admin', 'auth'),
    e('webhook', 'payment'),
    e('post', 'report'),
    e('report', 'admin'),
    e('payment', 'subscription'),
    e('comment', 'notification'),
    e('tag', 'category'),
    e('auth', 'webhook'),
  ],
  redEdges: [],
  stampStartOver: false,
  timelineDot: 'friction',
};

// Slide 3 — Breakage: dense, some edges red
const SLIDE_3 = {
  nodes: [...SLIDE_2.nodes, 'invoice', 'attachment', 'session'],
  edges: [
    ...SLIDE_2.edges,
    e('invoice', 'payment'),
    e('invoice', 'user'),
    e('attachment', 'comment'),
    e('attachment', 'post'),
    e('session', 'user'),
    e('session', 'auth'),
    e('invoice', 'subscription'),
    e('webhook', 'invoice'),
    e('report', 'session'),
    e('admin', 'session'),
  ],
  redEdges: [
    e('post', 'report'),
    e('invoice', 'user'),
    e('session', 'auth'),
    e('payment', 'subscription'),
  ],
  stampStartOver: false,
  timelineDot: 'breakage',
};

// Slide 4 — Rewrite: same graph, START OVER stamp on top
const SLIDE_4 = {
  ...SLIDE_3,
  stampStartOver: true,
  timelineDot: 'rewrite',
};

// Slide 5 — Day 1 again: graph resets, timeline curls into a loop
const SLIDE_5 = {
  nodes: ['user', 'post', 'comment'],
  edges: [e('user', 'post'), e('post', 'comment')],
  redEdges: [],
  stampStartOver: false,
  timelineDot: 'excited',
  timelineCurled: true,
};

export const SLIDE_STATES = [SLIDE_0, SLIDE_1, SLIDE_2, SLIDE_3, SLIDE_4, SLIDE_5];

export const TIMELINE_DOTS = ['excited', 'shipping', 'friction', 'breakage', 'rewrite'];

/** Return true if the given timeline dot should appear lit at this slide. */
export function isDotLit(slideIndex, dotName) {
  const state = SLIDE_STATES[slideIndex];
  if (state.timelineCurled) return true; // all lit after curl
  const threshold = TIMELINE_DOTS.indexOf(state.timelineDot);
  return TIMELINE_DOTS.indexOf(dotName) <= threshold;
}

function edgeKey(edge) { return edge.join('-'); }

/** Returns edge visibility/color for each edge across both slides. */
export function diffEdges(fromSlide, toSlide) {
  const fromKeys = new Set(fromSlide.edges.map(edgeKey));
  const toKeys = new Set(toSlide.edges.map(edgeKey));
  const fromRed = new Set(fromSlide.redEdges.map(edgeKey));
  const toRed = new Set(toSlide.redEdges.map(edgeKey));

  const all = new Set([...fromKeys, ...toKeys]);
  const result = [];
  for (const key of all) {
    result.push({
      key,
      fromVisible: fromKeys.has(key),
      toVisible: toKeys.has(key),
      fromRed: fromRed.has(key),
      toRed: toRed.has(key),
    });
  }
  return result;
}

/** Returns node visibility diff. */
export function diffNodes(fromSlide, toSlide) {
  const fromSet = new Set(fromSlide.nodes);
  const toSet = new Set(toSlide.nodes);
  const all = new Set([...fromSet, ...toSet]);
  const result = [];
  for (const name of all) {
    result.push({
      name,
      fromVisible: fromSet.has(name),
      toVisible: toSet.has(name),
    });
  }
  return result;
}
