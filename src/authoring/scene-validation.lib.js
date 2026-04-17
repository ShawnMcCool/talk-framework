// Pure validation — given a list of scene modules, returns an array of
// { sceneIndex, title, issues: [string...] } describing contract violations.
// Empty array means all scenes are well-formed.

const REQUIRED_METHODS = ['init', 'destroy', 'resolveToSlide', 'animateToSlide'];

/**
 * @param {import('../types.js').SceneModule[]} sceneDefs
 * @returns {import('../types.js').ValidationReport[]}
 */
export function validateScenesLib(sceneDefs) {
  const reports = [];
  sceneDefs.forEach((scene, sceneIndex) => {
    const issues = [];

    if (!scene || typeof scene !== 'object') {
      reports.push({ sceneIndex, title: '<invalid>', issues: ['scene is not an object'] });
      return;
    }

    if (typeof scene.title !== 'string' || scene.title.length === 0) {
      issues.push('missing or empty `title`');
    }

    for (const method of REQUIRED_METHODS) {
      if (typeof scene[method] !== 'function') {
        issues.push(`missing \`${method}()\``);
      }
    }

    if (!Array.isArray(scene.slides)) {
      issues.push('`slides` must be an array');
    } else if (scene.slides.length === 0) {
      issues.push('`slides` is empty');
    } else {
      scene.slides.forEach((slide, i) => {
        if (!slide || typeof slide !== 'object') {
          issues.push(`slide ${i} is not an object`);
        } else if (typeof slide.stepCount !== 'number' || slide.stepCount < 1) {
          issues.push(`slide ${i} has invalid stepCount (${slide.stepCount})`);
        }
      });
    }

    if (issues.length > 0) {
      reports.push({ sceneIndex, title: scene.title || '<untitled>', issues });
    }
  });
  return reports;
}
