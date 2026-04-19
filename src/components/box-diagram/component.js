// src/components/box-diagram/component.js
import { parseBoxDiagram } from './parse.lib.js';
import { validateBoxDiagram } from './validate.lib.js';
import { renderBoxDiagram } from './render.js';

export const component = {
  name: 'box-diagram',
  kind: 'markdown-block',
  matcher: { infoString: 'box-diagram' },
  parse(source, context) { return parseBoxDiagram(source, context); },
  validate(data, context) { return validateBoxDiagram(data, context); },
  render(data, renderContext) { return renderBoxDiagram(data, renderContext); },
};
