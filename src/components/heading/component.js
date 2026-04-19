// src/components/heading/component.js
import { renderHeading } from './render.js';

export const component = {
  name: 'heading',
  kind: 'markdown-block',
  matcher: { blockType: 'heading' },
  parse(token) { return token; },
  render: renderHeading,
};
