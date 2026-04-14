import { createContentSlide } from '../../content-slides/index.js';
import { colors } from '../../shared/colors.js';

export const codeExampleScene = createContentSlide('GenServer', [
  // Slide 1: what is a GenServer
  [
    { type: 'heading', text: 'GenServer', level: 1 },
    { type: 'text', text: 'The workhorse of OTP — a generic server process that manages state and handles messages.' },
  ],
  // Slide 2: the code
  [
    { type: 'heading', text: 'A Counter', level: 3 },
    { type: 'code', code:
`<span class="kw">defmodule</span> <span class="at">Counter</span> <span class="kw">do</span>
  <span class="kw">use</span> <span class="at">GenServer</span>

  <span class="cm"># Client API</span>
  <span class="kw">def</span> <span class="fn">start_link</span>(initial \\\\ <span class="at">0</span>),
    <span class="kw">do:</span> <span class="fn">GenServer.start_link</span>(__MODULE__, initial)

  <span class="kw">def</span> <span class="fn">increment</span>(pid),
    <span class="kw">do:</span> <span class="fn">GenServer.cast</span>(pid, <span class="at">:increment</span>)

  <span class="kw">def</span> <span class="fn">get</span>(pid),
    <span class="kw">do:</span> <span class="fn">GenServer.call</span>(pid, <span class="at">:get</span>)

  <span class="cm"># Server callbacks</span>
  <span class="kw">def</span> <span class="fn">handle_cast</span>(<span class="at">:increment</span>, count),
    <span class="kw">do:</span> {<span class="at">:noreply</span>, count + <span class="at">1</span>}

  <span class="kw">def</span> <span class="fn">handle_call</span>(<span class="at">:get</span>, _from, count),
    <span class="kw">do:</span> {<span class="at">:reply</span>, count, count}
<span class="kw">end</span>` },
  ],
  // Slide 3: usage
  [
    { type: 'heading', text: 'Usage', level: 2 },
    { type: 'code', code:
`{<span class="at">:ok</span>, pid} = <span class="fn">Counter.start_link</span>(<span class="at">0</span>)

<span class="fn">Counter.increment</span>(pid)
<span class="fn">Counter.increment</span>(pid)
<span class="fn">Counter.increment</span>(pid)

<span class="fn">Counter.get</span>(pid)
<span class="cm"># => 3</span>` },
    { type: 'text', text: 'The GenServer handles concurrency, message ordering, and state management — you just define the logic.', muted: true },
  ],
]);
