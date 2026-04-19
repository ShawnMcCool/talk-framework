// src/components/paragraph/component.js
import { renderParagraph } from './render.js';

export const component = {
  name: 'paragraph',
  kind: 'markdown-block',
  matcher: { blockType: 'text' },   // splitter still emits type:'text' today; preserves backward compat
  parse(token) { return token; },
  render: renderParagraph,
};
