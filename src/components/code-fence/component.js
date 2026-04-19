// src/components/code-fence/component.js
import { renderCodeFence } from './render.js';

export const component = {
  name: 'code-fence',
  kind: 'markdown-block',
  matcher: { blockType: 'code' },
  parse(token) { return token; },
  render: renderCodeFence,
};
