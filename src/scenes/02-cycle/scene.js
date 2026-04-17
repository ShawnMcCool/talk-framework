import { createSvgScene } from '../../svg-scenes/scene-factory.js';
import { colors } from '../../shared/colors.js';
import { cornerLoop } from '../../shared/corner-loop.js';
import {
  NODE_POSITIONS,
  SLIDE_STATES,
  TIMELINE_DOTS,
  isDotLit,
} from './graph.lib.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX = { w: 1000, h: 600 };

// Timeline layout (bottom strip)
const TL_Y = 500;
const TL_X_START = 180;
const TL_X_END = 820;
const TL_DOT_R = 10;

function timelineDotX(index) {
  return TL_X_START + ((TL_X_END - TL_X_START) / (TIMELINE_DOTS.length - 1)) * index;
}

function edgeKey(a, b) { return `${a}-${b}`; }

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

export const cycleScene = createSvgScene({
  title: 'The Cycle',
  slides: SLIDE_STATES.map(() => ({ stepCount: 1 })),
  viewBox: `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`,

  setup({ svg }) {
    const layers = {
      edges: document.createElementNS(SVG_NS, 'g'),
      nodes: document.createElementNS(SVG_NS, 'g'),
      timeline: document.createElementNS(SVG_NS, 'g'),
      stamp: document.createElementNS(SVG_NS, 'g'),
    };
    svg.appendChild(layers.edges);
    svg.appendChild(layers.nodes);
    svg.appendChild(layers.timeline);
    svg.appendChild(layers.stamp);

    // --- Edges: union of every edge that ever appears ---
    const allEdges = new Map();
    for (const slide of SLIDE_STATES) {
      for (const [a, b] of slide.edges) {
        const key = edgeKey(a, b);
        if (!allEdges.has(key)) allEdges.set(key, { a, b });
      }
    }

    const edgeEls = new Map();
    for (const [key, { a, b }] of allEdges) {
      const line = document.createElementNS(SVG_NS, 'line');
      const p1 = NODE_POSITIONS[a];
      const p2 = NODE_POSITIONS[b];
      setAttrs(line, {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: colors.textMuted,
        'stroke-width': 1.5,
        opacity: 0,
      });
      layers.edges.appendChild(line);
      edgeEls.set(key, line);
    }

    // --- Nodes: circle + label for every known position ---
    const nodeEls = new Map();
    for (const [name, pos] of Object.entries(NODE_POSITIONS)) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('opacity', 0);

      const circle = document.createElementNS(SVG_NS, 'circle');
      setAttrs(circle, {
        cx: pos.x, cy: pos.y, r: 14,
        fill: colors.bgDark,
        stroke: colors.accent,
        'stroke-width': 2,
      });
      g.appendChild(circle);

      const label = document.createElementNS(SVG_NS, 'text');
      setAttrs(label, {
        x: pos.x, y: pos.y + 28,
        'text-anchor': 'middle',
        'font-size': 11,
        'font-family': '-apple-system, sans-serif',
        fill: colors.textMuted,
      });
      label.textContent = name;
      g.appendChild(label);

      layers.nodes.appendChild(g);
      nodeEls.set(name, { group: g, circle, label });
    }

    // --- Timeline: 5 dots + straight line + curl arrow (hidden initially) ---
    const tlLine = document.createElementNS(SVG_NS, 'line');
    setAttrs(tlLine, {
      x1: TL_X_START, y1: TL_Y, x2: TL_X_END, y2: TL_Y,
      stroke: colors.textMuted,
      'stroke-width': 2,
      opacity: 0.5,
    });
    layers.timeline.appendChild(tlLine);

    const tlDotEls = new Map();
    const tlLabelEls = new Map();
    TIMELINE_DOTS.forEach((name, i) => {
      const x = timelineDotX(i);

      const dot = document.createElementNS(SVG_NS, 'circle');
      setAttrs(dot, {
        cx: x, cy: TL_Y, r: TL_DOT_R,
        fill: colors.bgDark,
        stroke: colors.textMuted,
        'stroke-width': 2,
      });
      layers.timeline.appendChild(dot);
      tlDotEls.set(name, dot);

      const label = document.createElementNS(SVG_NS, 'text');
      setAttrs(label, {
        x, y: TL_Y + 30,
        'text-anchor': 'middle',
        'font-size': 12,
        'font-family': '-apple-system, sans-serif',
        fill: colors.textMuted,
        opacity: 0.8,
      });
      label.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      layers.timeline.appendChild(label);
      tlLabelEls.set(name, label);
    });

    // Curl arc (hidden until slide 5). Drawn as a quadratic Bezier up and over
    // from the Rewrite dot back to the Excited dot.
    const curl = document.createElementNS(SVG_NS, 'path');
    const xStart = timelineDotX(TIMELINE_DOTS.length - 1);  // rewrite
    const xEnd = timelineDotX(0);                            // excited
    const cpx = (xStart + xEnd) / 2;
    const cpy = TL_Y - 120;
    const curlPath = `M ${xStart} ${TL_Y} Q ${cpx} ${cpy} ${xEnd} ${TL_Y}`;
    setAttrs(curl, {
      d: curlPath,
      fill: 'none',
      stroke: colors.accent,
      'stroke-width': 2.5,
      opacity: 0,
    });
    layers.timeline.appendChild(curl);

    // Arrowhead near the excited end of the curl
    const arrow = document.createElementNS(SVG_NS, 'path');
    setAttrs(arrow, {
      d: `M ${xEnd - 8} ${TL_Y - 8} L ${xEnd} ${TL_Y} L ${xEnd - 8} ${TL_Y + 8}`,
      fill: 'none',
      stroke: colors.accent,
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0,
    });
    layers.timeline.appendChild(arrow);

    // Compute curl length for stroke-dasharray animation
    const curlLength = curl.getTotalLength ? curl.getTotalLength() : 600;

    // --- Stamp: "START OVER" for slide 4 ---
    const stampG = document.createElementNS(SVG_NS, 'g');
    stampG.setAttribute('opacity', 0);
    stampG.setAttribute('transform', `translate(${VIEWBOX.w / 2}, 220) rotate(-8)`);

    const stampBg = document.createElementNS(SVG_NS, 'rect');
    setAttrs(stampBg, {
      x: -220, y: -50, width: 440, height: 100,
      fill: colors.bg,
      stroke: colors.failure,
      'stroke-width': 6,
      rx: 8,
    });
    stampG.appendChild(stampBg);

    const stampText = document.createElementNS(SVG_NS, 'text');
    setAttrs(stampText, {
      x: 0, y: 0,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': 56,
      'font-family': '-apple-system, sans-serif',
      'font-weight': 900,
      fill: colors.failure,
      'letter-spacing': 4,
    });
    stampText.textContent = 'START OVER';
    stampG.appendChild(stampText);

    layers.stamp.appendChild(stampG);

    return {
      nodeEls, edgeEls, tlDotEls, tlLabelEls, tlLine, curl, arrow, curlLength,
      stampG, handedOffToCornerLoop: false,
    };
  },

  resolveStep(objects, { slideIndex }) {
    const state = SLIDE_STATES[slideIndex];
    const visibleNodes = new Set(state.nodes);
    const visibleEdges = new Set(state.edges.map(([a, b]) => edgeKey(a, b)));
    const redEdges = new Set(state.redEdges.map(([a, b]) => edgeKey(a, b)));

    for (const [name, { group, circle }] of objects.nodeEls) {
      group.setAttribute('opacity', visibleNodes.has(name) ? 1 : 0);
      circle.setAttribute('stroke', visibleNodes.has(name) ? colors.accent : colors.textMuted);
    }

    for (const [key, line] of objects.edgeEls) {
      if (!visibleEdges.has(key)) {
        line.setAttribute('opacity', 0);
      } else if (redEdges.has(key)) {
        line.setAttribute('opacity', 0.9);
        line.setAttribute('stroke', colors.failure);
        line.setAttribute('stroke-width', 2);
      } else {
        line.setAttribute('opacity', 0.55);
        line.setAttribute('stroke', colors.textMuted);
        line.setAttribute('stroke-width', 1.5);
      }
    }

    // Timeline dots
    for (const name of TIMELINE_DOTS) {
      const dot = objects.tlDotEls.get(name);
      const lit = isDotLit(slideIndex, name);
      dot.setAttribute('fill', lit ? colors.accent : colors.bgDark);
      dot.setAttribute('stroke', lit ? colors.accent : colors.textMuted);
    }

    // Curl
    if (state.timelineCurled) {
      objects.curl.setAttribute('opacity', 1);
      objects.curl.setAttribute('stroke-dasharray', '');
      objects.curl.setAttribute('stroke-dashoffset', '0');
      objects.arrow.setAttribute('opacity', 1);
    } else {
      objects.curl.setAttribute('opacity', 0);
      objects.arrow.setAttribute('opacity', 0);
    }

    // Stamp — force to end of SVG DOM to guarantee z-top over nodes/edges/timeline.
    objects.stampG.setAttribute('opacity', state.stampStartOver ? 1 : 0);
    if (state.stampStartOver) {
      const stampLayer = objects.stampG.parentNode;
      if (stampLayer && stampLayer.parentNode) {
        stampLayer.parentNode.appendChild(stampLayer);
      }
    }

    // Handoff to cornerLoop on the final slide
    if (slideIndex === SLIDE_STATES.length - 1) {
      cornerLoop.show({ at: 'corner', highlight: null });
      objects.handedOffToCornerLoop = true;
    } else {
      cornerLoop.hide();
      objects.handedOffToCornerLoop = false;
    }
  },

  animateStep(objects, { slideIndex, playTimeline, setTimeout, done }) {
    const state = SLIDE_STATES[slideIndex];
    const visibleNodes = new Set(state.nodes);
    const visibleEdges = new Set(state.edges.map(([a, b]) => edgeKey(a, b)));
    const redEdges = new Set(state.redEdges.map(([a, b]) => edgeKey(a, b)));

    // Read current opacity and tween to target opacity.
    const tweens = [];

    // Nodes
    for (const [name, { group }] of objects.nodeEls) {
      const cur = parseFloat(group.getAttribute('opacity') || 0);
      const tgt = visibleNodes.has(name) ? 1 : 0;
      if (cur !== tgt) {
        tweens.push({
          property: `node_${name}`,
          from: cur, to: tgt, delay: 0, duration: 500,
        });
      }
    }

    // Edges
    for (const [key, line] of objects.edgeEls) {
      const curOpacity = parseFloat(line.getAttribute('opacity') || 0);
      let tgtOpacity = 0;
      if (visibleEdges.has(key)) tgtOpacity = redEdges.has(key) ? 0.9 : 0.55;
      if (curOpacity !== tgtOpacity) {
        tweens.push({
          property: `edge_${key}`,
          from: curOpacity, to: tgtOpacity, delay: 0, duration: 500,
        });
      }
      // Immediately set color (no tween on color)
      if (visibleEdges.has(key)) {
        line.setAttribute('stroke', redEdges.has(key) ? colors.failure : colors.textMuted);
      }
    }

    // Timeline dots — tween fill as simple opacity shift on the dot itself
    for (const name of TIMELINE_DOTS) {
      const dot = objects.tlDotEls.get(name);
      const lit = isDotLit(slideIndex, name);
      // Set color immediately; the dot transition is quick.
      dot.setAttribute('fill', lit ? colors.accent : colors.bgDark);
      dot.setAttribute('stroke', lit ? colors.accent : colors.textMuted);
    }

    // Stamp fade — also force its layer to the end of the SVG so it paints on top.
    const curStamp = parseFloat(objects.stampG.getAttribute('opacity') || 0);
    const tgtStamp = state.stampStartOver ? 1 : 0;
    if (curStamp !== tgtStamp) {
      tweens.push({
        property: 'stamp',
        from: curStamp, to: tgtStamp, delay: state.stampStartOver ? 300 : 0, duration: 400,
      });
    }
    if (state.stampStartOver) {
      const stampLayer = objects.stampG.parentNode;
      if (stampLayer && stampLayer.parentNode) {
        stampLayer.parentNode.appendChild(stampLayer);
      }
    }

    // Curl: if entering curled state, animate the stroke-dasharray reveal
    const isCurlEntering = state.timelineCurled && parseFloat(objects.curl.getAttribute('opacity') || 0) < 1;

    const apply = (v) => {
      for (const [name, { group }] of objects.nodeEls) {
        if (v[`node_${name}`] !== undefined) group.setAttribute('opacity', v[`node_${name}`]);
      }
      for (const [key, line] of objects.edgeEls) {
        if (v[`edge_${key}`] !== undefined) line.setAttribute('opacity', v[`edge_${key}`]);
      }
      if (v.stamp !== undefined) objects.stampG.setAttribute('opacity', v.stamp);
    };

    const runCurlThenDone = () => {
      if (!isCurlEntering) { done(); return; }
      // Reveal the curl by animating stroke-dashoffset from length → 0
      objects.curl.setAttribute('opacity', 1);
      objects.curl.setAttribute('stroke-dasharray', objects.curlLength);
      objects.curl.setAttribute('stroke-dashoffset', objects.curlLength);
      playTimeline(
        [{ property: 'off', from: objects.curlLength, to: 0, delay: 0, duration: 900 }],
        (v) => objects.curl.setAttribute('stroke-dashoffset', v.off),
        () => {
          objects.arrow.setAttribute('opacity', 1);
          // Handoff: bring up the cornerLoop in the corner
          cornerLoop.show({ at: 'corner', highlight: null });
          setTimeout(done, 400);
        },
      );
    };

    if (tweens.length === 0) {
      runCurlThenDone();
    } else {
      playTimeline(tweens, apply, runCurlThenDone);
    }

    // If we're leaving the curled state (e.g. navigating back), ensure the curl hides.
    if (!state.timelineCurled) {
      objects.curl.setAttribute('opacity', 0);
      objects.arrow.setAttribute('opacity', 0);
    }

    // Hide cornerLoop when not on the final slide
    if (slideIndex !== SLIDE_STATES.length - 1) {
      cornerLoop.hide();
    }
  },

  onDestroy() {
    // Leave cornerLoop alone — subsequent scenes own its visibility.
  },
});
