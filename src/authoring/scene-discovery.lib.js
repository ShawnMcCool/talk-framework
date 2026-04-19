// Pure scene discovery.
// Input: synthetic directory listing — an array of
//   { name: string, isDirectory: boolean, hasSceneMd: boolean, hasSceneJs: boolean }
// Output: { scenes, issues } where
//   scenes = [{ index, slug, folder, kind: 'md'|'js' }, ...] sorted by index
//   issues = [{ severity: 'error'|'warning', message, folder? }, ...]

const PREFIX_RE = /^(\d{2})-([a-z0-9][a-z0-9-]*)$/;

export function discoverScenes(entries) {
  const scenes = [];
  const issues = [];

  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const m = entry.name.match(PREFIX_RE);
    if (!m) {
      if (entry.hasSceneMd || entry.hasSceneJs) {
        issues.push({
          severity: 'warning',
          folder: entry.name,
          message: `folder "${entry.name}" contains a scene file but its name does not match the nn-slug convention`,
        });
      } else if (/^[0-9]/.test(entry.name)) {
        issues.push({
          severity: 'warning',
          folder: entry.name,
          message: `folder "${entry.name}" looks like a scene directory but its numeric prefix is not two digits`,
        });
      }
      continue;
    }

    const index = parseInt(m[1], 10);
    const slug = m[2];

    if (entry.hasSceneMd && entry.hasSceneJs) {
      issues.push({
        severity: 'error',
        folder: entry.name,
        message: `folder "${entry.name}" contains both scene.md and scene.js; pick one`,
      });
      continue;
    }
    if (!entry.hasSceneMd && !entry.hasSceneJs) {
      issues.push({
        severity: 'warning',
        folder: entry.name,
        message: `folder "${entry.name}" is missing scene.md or scene.js`,
      });
      continue;
    }

    scenes.push({
      index,
      slug,
      folder: entry.name,
      kind: entry.hasSceneMd ? 'md' : 'js',
    });
  }

  scenes.sort((a, b) => a.index - b.index);

  const seen = new Map();
  for (const s of scenes) {
    if (seen.has(s.index)) {
      issues.push({
        severity: 'error',
        folder: s.folder,
        message: `duplicate scene number ${String(s.index).padStart(2, '0')}: "${seen.get(s.index)}" and "${s.folder}"`,
      });
    } else {
      seen.set(s.index, s.folder);
    }
  }

  if (scenes.length > 0) {
    const min = scenes[0].index;
    const max = scenes[scenes.length - 1].index;
    if (min !== 1) {
      issues.push({
        severity: 'error',
        message: `first scene must be numbered 01; found ${String(min).padStart(2, '0')}`,
      });
    }
    for (let want = min; want <= max; want++) {
      if (!seen.has(want)) {
        issues.push({
          severity: 'error',
          message: `gap in scene numbering at ${String(want).padStart(2, '0')}`,
        });
      }
    }
  }

  return { scenes, issues };
}
