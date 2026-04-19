// src/components/quote/component.js
import { renderQuote } from './render.js';

export const component = {
  name: 'quote',
  kind: 'markdown-block',
  matcher: { blockType: 'quote' },
  parse(token) { return token; },
  render: renderQuote,
};
