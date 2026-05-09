// src/components/image/component.js
import { renderImageBlock } from './render.js';
import { validateImageBlock } from './validate.lib.js';

export const component = {
  name: 'image',
  kind: 'markdown-block',
  matcher: { blockType: 'image-row' },
  parse(token) { return token; },
  validate: validateImageBlock,
  render: renderImageBlock,
};
