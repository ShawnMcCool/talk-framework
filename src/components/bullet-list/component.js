// src/components/bullet-list/component.js
import { renderBulletList } from './render.js';

export const component = {
  name: 'bullet-list',
  kind: 'markdown-block',
  matcher: { blockType: 'bullets' },
  parse(token) { return token; },
  render: renderBulletList,
};
