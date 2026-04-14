import { createContentSlide } from '../../content-slides/index.js';
import { colors } from '../../shared/colors.js';

export const whyBeamScene = createContentSlide('Why the BEAM?', [
  // Slide 1: title + progressive bullets
  [
    { type: 'heading', text: 'Why the BEAM?', level: 1 },
    { type: 'bullets', items: [
      'Designed for <strong style="color:' + colors.beam + '">telecom</strong> — built to never go down',
      'Lightweight processes — millions, not thousands',
      'Preemptive scheduling — no single process can hog the CPU',
      'Hot code upgrades — deploy without restarting',
    ]},
  ],
  // Slide 2: quote
  [
    { type: 'heading', text: 'The Philosophy', level: 3 },
    { type: 'spacer' },
    { type: 'quote',
      text: 'Make it work, make it beautiful, make it fast. In that order.',
      attribution: 'Joe Armstrong, creator of Erlang',
    },
    { type: 'spacer' },
    { type: 'text', text: 'The BEAM was built by people solving real problems at massive scale — and it shows in every design decision.', muted: true },
  ],
]);
