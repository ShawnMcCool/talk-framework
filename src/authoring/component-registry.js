import { component as contentSlide } from '../components/content-slide/component.js';
import { component as sectionSlide } from '../components/section-slide/component.js';
import { component as threeScene } from '../components/three-scene/component.js';
import { component as svgScene } from '../components/svg-scene/component.js';

const VALID_KINDS = new Set(['scene-type', 'markdown-block', 'js-factory']);

/**
 * Validate a component descriptor's shape. Returns an array of error strings;
 * empty means valid.
 *
 * @param {*} desc
 * @returns {string[]}
 */
export function validateDescriptor(desc) {
  const errs = [];
  if (!desc || typeof desc !== 'object') {
    return ['descriptor must be an object'];
  }
  if (typeof desc.name !== 'string' || !desc.name) {
    errs.push('descriptor.name must be a non-empty string');
  }
  if (!VALID_KINDS.has(desc.kind)) {
    errs.push(`descriptor.kind must be one of: ${[...VALID_KINDS].join(', ')}`);
  }
  if (!desc.matcher || typeof desc.matcher !== 'object') {
    errs.push('descriptor.matcher must be an object');
  }
  return errs;
}

/**
 * Create an empty registry. The central bootstrap module (this file's default
 * export below) calls `register()` once per component.
 */
export function createRegistry() {
  const byName = new Map();
  const byInfoString = new Map();
  const byBlockType = new Map();
  const byFrontmatterType = new Map();
  const byFactoryExport = new Map();

  return {
    register(desc) {
      const errs = validateDescriptor(desc);
      if (errs.length) throw new Error(`invalid descriptor: ${errs.join('; ')}`);
      if (byName.has(desc.name)) {
        throw new Error(`component '${desc.name}' already registered`);
      }
      byName.set(desc.name, desc);
      const m = desc.matcher;
      if (m.infoString) byInfoString.set(m.infoString, desc);
      if (m.blockType) byBlockType.set(m.blockType, desc);
      if (m.frontmatterType) byFrontmatterType.set(m.frontmatterType, desc);
      if (m.factoryExport) byFactoryExport.set(m.factoryExport, desc);
    },
    getByName(name) { return byName.get(name); },
    getByInfoString(s) { return byInfoString.get(s); },
    getByBlockType(t) { return byBlockType.get(t); },
    getByFrontmatterType(t) { return byFrontmatterType.get(t); },
    getByFactoryExport(e) { return byFactoryExport.get(e); },
    all() { return [...byName.values()]; },
  };
}

/**
 * The bootstrap registry. Components are registered at module load by importing
 * each component.js and calling `register`. Intentionally populated at the
 * bottom of this file so the imports are the single inventory.
 */
export const registry = createRegistry();

registry.register(contentSlide);
registry.register(sectionSlide);
registry.register(threeScene);
registry.register(svgScene);
