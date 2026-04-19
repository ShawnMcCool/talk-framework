// Pure rename planner. Given the current scene list and a structural command,
// returns a plan: { renames: [{from, to}], creates: [folder], removes: [folder] }.
//
// Input scenes: [{ index, slug, folder }, ...] — already sorted by index,
// expected to be contiguous starting from 1 (caller's responsibility).
//
// Supported commands:
//   { op: 'move', id, position: 'before'|'after'|'first'|'last', target? }
//   { op: 'remove', id }
//   { op: 'add', slug, position?: 'before'|'after'|'first'|'last', target? }  (default: append)
//   { op: 'rename', id, slug }

function pad(n) { return String(n).padStart(2, '0'); }
function folderFor(index, slug) { return `${pad(index)}-${slug}`; }

function findIndex(scenes, id) {
  const i = scenes.findIndex(s => s.index === id);
  if (i === -1) throw new Error(`scene ${id} does not exist`);
  return i;
}

function ensureUniqueSlug(scenes, slug) {
  if (scenes.some(s => s.slug === slug)) {
    throw new Error(`slug "${slug}" is already in use`);
  }
}

function reorder(list) {
  // Given a [{slug, prevIndex|null}, ...] in desired order, produce renames.
  // Null entries (new scenes being added) are skipped but count toward numbering.
  // Output is sorted by prevIndex (original folder order) for deterministic output.
  const renames = [];
  list.forEach((s, i) => {
    if (s.prevIndex === null) return;
    const newIndex = i + 1;
    if (newIndex !== s.prevIndex || s.slugChanged) {
      renames.push({ from: folderFor(s.prevIndex, s.origSlug ?? s.slug), to: folderFor(newIndex, s.slug) });
    }
  });
  renames.sort((a, b) => {
    // Sort by the numeric prefix of `from`
    const na = parseInt(a.from, 10);
    const nb = parseInt(b.from, 10);
    return na - nb;
  });
  return renames;
}

function buildTargetOrder(scenes, command) {
  const list = scenes.map(s => ({ slug: s.slug, prevIndex: s.index }));

  if (command.op === 'move') {
    const fromIdx = findIndex(scenes, command.id);
    const [moving] = list.splice(fromIdx, 1);

    let insertAt;
    if (command.position === 'first') insertAt = 0;
    else if (command.position === 'last') insertAt = list.length;
    else {
      const targetIdx = list.findIndex(s => s.prevIndex === command.target);
      if (targetIdx === -1) throw new Error(`scene ${command.target} does not exist`);
      insertAt = command.position === 'before' ? targetIdx : targetIdx + 1;
    }
    list.splice(insertAt, 0, moving);
    return { list, creates: [], removes: [] };
  }

  if (command.op === 'remove') {
    const idx = findIndex(scenes, command.id);
    const [removed] = list.splice(idx, 1);
    return { list, creates: [], removes: [folderFor(removed.prevIndex, removed.slug)] };
  }

  if (command.op === 'add') {
    ensureUniqueSlug(scenes, command.slug);
    const newEntry = { slug: command.slug, prevIndex: null };
    let insertAt;
    if (!command.position || command.position === 'last') insertAt = list.length;
    else if (command.position === 'first') insertAt = 0;
    else {
      const targetIdx = list.findIndex(s => s.prevIndex === command.target);
      if (targetIdx === -1) throw new Error(`scene ${command.target} does not exist`);
      insertAt = command.position === 'before' ? targetIdx : targetIdx + 1;
    }
    list.splice(insertAt, 0, newEntry);
    const finalIndex = insertAt + 1;
    return { list, creates: [folderFor(finalIndex, command.slug)], removes: [] };
  }

  if (command.op === 'rename') {
    const idx = findIndex(scenes, command.id);
    ensureUniqueSlug(scenes, command.slug);
    list[idx] = { ...list[idx], origSlug: list[idx].slug, slug: command.slug, slugChanged: true };
    return { list, creates: [], removes: [] };
  }

  throw new Error(`unknown op: ${command.op}`);
}

export function planRename(scenes, command) {
  const { list, creates, removes } = buildTargetOrder(scenes, command);
  const renames = reorder(list);
  return { renames, creates, removes };
}
