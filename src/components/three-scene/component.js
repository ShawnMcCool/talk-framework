const REQUIRED_EXPORTS = ['title', 'slides', 'init', 'destroy', 'resolveToSlide', 'animateToSlide'];

/**
 * Validate a scene module produced by createThreeScene(...). Structural only:
 * checks the module has the required shape. Not called at parse time —
 * called when a scene module is loaded at runtime or lint time.
 *
 * @param {object} sceneModule
 * @param {{ file: string }} context
 * @returns {Array<object>} diagnostics
 */
function validateThreeScene(sceneModule, context) {
  const diags = [];
  for (const key of REQUIRED_EXPORTS) {
    if (!(key in sceneModule)) {
      diags.push({
        severity: 'error',
        component: 'three-scene',
        file: context.file,
        line: 1,
        column: 1,
        message: `three-scene module missing required export '${key}'`,
      });
    }
  }
  if ('slides' in sceneModule && !Array.isArray(sceneModule.slides)) {
    diags.push({
      severity: 'error',
      component: 'three-scene',
      file: context.file,
      line: 1,
      column: 1,
      message: `three-scene module: 'slides' must be an array`,
    });
  }
  return diags;
}

export const component = {
  name: 'three-scene',
  kind: 'js-factory',
  matcher: { factoryExport: 'createThreeScene' },
  validate: validateThreeScene,
};
