import { createContentSlide } from '../../content-slides/index.js';
import { colors } from '../../shared/colors.js';

export const faultToleranceScene = createContentSlide('Fault Tolerance', [
  // Slide 1: Let it crash
  [
    { type: 'heading', text: 'Let It Crash', level: 1, accent: colors.failure },
    { type: 'text', text: 'Instead of defensive programming, the BEAM embraces failure as a first-class concept.' },
    { type: 'spacer' },
    { type: 'bullets', items: [
      'Processes are <strong>isolated</strong> — one crash doesn\'t take down others',
      '<strong style="color:' + colors.green + '">Supervisors</strong> watch processes and restart them on failure',
      'Supervision trees create layered fault boundaries',
      'The system <em>heals itself</em> — automatically',
    ]},
  ],
  // Slide 2: supervision tree concept
  [
    { type: 'heading', text: 'Supervision Strategy', level: 2 },
    { type: 'columns',
      left: [
        { type: 'code', code:
`<span class="cm"># Supervisor restarts children</span>
<span class="kw">children</span> = [
  {<span class="at">UserRegistry</span>, []},
  {<span class="at">SessionStore</span>, []},
  {<span class="at">NotificationWorker</span>, []},
]

<span class="fn">Supervisor.start_link</span>(
  children,
  <span class="at">strategy:</span> <span class="at">:one_for_one</span>
)` },
      ],
      right: [
        { type: 'bullets', items: [
          '<strong style="color:' + colors.accentWarm + '">:one_for_one</strong> — restart only the crashed child',
          '<strong style="color:' + colors.accentWarm + '">:one_for_all</strong> — restart all children',
          '<strong style="color:' + colors.accentWarm + '">:rest_for_one</strong> — restart crashed + those started after it',
        ]},
        { type: 'spacer' },
        { type: 'text', text: 'Erlang/OTP has been running telecom systems at 99.9999999% uptime since the 1980s.', muted: true },
      ],
    },
  ],
]);
