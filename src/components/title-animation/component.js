const REQUIRED_EXPORTS = ['title', 'slides', 'init', 'destroy', 'resolveToSlide', 'animateToSlide'];

/**
 * Validate a scene module produced by createTitleScene(...). Structural only:
 * checks the module has the required shape. Not called at parse time —
 * called when a scene module is loaded at runtime or lint time.
 *
 * @param {object} sceneModule
 * @param {{ file: string }} context
 * @returns {Array<object>} diagnostics
 */
function validateTitleAnimation(sceneModule, context) {
  const diags = [];
  for (const key of REQUIRED_EXPORTS) {
    if (!(key in sceneModule)) {
      diags.push({
        severity: 'error',
        component: 'title-animation',
        file: context.file,
        line: 1,
        column: 1,
        message: `title-animation module missing required export '${key}'`,
      });
    }
  }
  return diags;
}

export const component = {
  name: 'title-animation',
  kind: 'js-factory',
  matcher: { factoryExport: 'createTitleScene' },
  validate: validateTitleAnimation,
};
