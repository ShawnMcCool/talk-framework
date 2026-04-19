import { createContentSlide } from '../../content-slides/index.js';
import { colors } from '../../shared/colors.js';

export const processesScene = createContentSlide('Processes', [
  // Slide 1: two-column — concept + details
  [
    { type: 'heading', text: 'Processes', level: 1 },
    { type: 'columns',
      left: [
        { type: 'text', text: 'BEAM processes are <strong>not</strong> OS threads. They\'re lightweight, isolated units of computation managed by the VM.' },
        { type: 'spacer' },
        { type: 'bullets', items: [
          '~300 bytes of initial memory',
          'Own heap and stack',
          'Garbage collected independently',
          'Communicate only via messages',
        ]},
      ],
      right: [
        { type: 'code', code:
`<span class="cm"># Spawn a process</span>
<span class="kw">spawn</span>(<span class="kw">fn</span> ->
  <span class="fn">receive</span> <span class="kw">do</span>
    {:hello, name} ->
      <span class="fn">IO.puts</span>(<span class="str">"Hi #{name}"</span>)
  <span class="kw">end</span>
<span class="kw">end</span>)` },
      ],
    },
  ],
  // Slide 2: the punchline
  [
    { type: 'heading', text: 'Scale', level: 2 },
    { type: 'text', text: 'A single BEAM VM can run <strong style="color:' + colors.beam + '">millions</strong> of concurrent processes.' },
    { type: 'text', text: 'WhatsApp handled 2 million connections per server. Discord runs 5 million concurrent users on Elixir.', muted: true },
  ],
]);
