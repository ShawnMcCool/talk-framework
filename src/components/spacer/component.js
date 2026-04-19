// src/components/spacer/component.js
import { renderSpacer } from './render.js';

export const component = {
  name: 'spacer',
  kind: 'markdown-block',
  matcher: { blockType: 'spacer' },
  parse(token) { return token; },
  render: renderSpacer,
};
