const REQUIRED_EXPORTS = ['title', 'slides', 'init', 'destroy', 'resolveToSlide', 'animateToSlide'];

/**
 * Validate a scene module produced by create3DScene(...). Structural only:
 * checks the module has the required shape. Not called at parse time —
 * called when a scene module is loaded at runtime or lint time.
 *
 * @param {object} sceneModule
 * @param {{ file: string }} context
 * @returns {Array<object>} diagnostics
 */
function validate3DScene(sceneModule, context) {
  const diags = [];
  for (const key of REQUIRED_EXPORTS) {
    if (!(key in sceneModule)) {
      diags.push({
        severity: 'error',
        component: '3d-scene',
        file: context.file,
        line: 1,
        column: 1,
        message: `3d-scene module missing required export '${key}'`,
      });
    }
  }
  if ('slides' in sceneModule && !Array.isArray(sceneModule.slides)) {
    diags.push({
      severity: 'error',
      component: '3d-scene',
      file: context.file,
      line: 1,
      column: 1,
      message: `3d-scene module: 'slides' must be an array`,
    });
  }
  return diags;
}

export const component = {
  name: '3d-scene',
  kind: 'js-factory',
  matcher: { factoryExport: 'create3DScene' },
  validate: validate3DScene,
};
