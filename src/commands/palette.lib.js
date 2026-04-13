export function createRegistry() {
  return { commands: [] };
}

export function register(registry, command) {
  const existing = registry.commands.findIndex(c => c.id === command.id);
  if (existing !== -1) {
    const commands = [...registry.commands];
    commands[existing] = command;
    return { ...registry, commands };
  }
  return { ...registry, commands: [...registry.commands, command] };
}

export function getCommands(registry) {
  return registry.commands;
}

export function fuzzyMatch(query, text) {
  if (query === '') return { matched: true, score: 0 };

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let qi = 0;
  let score = 0;
  let consecutive = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      consecutive++;
      // Consecutive matches score higher; bonus grows with run length
      score += consecutive;
      qi++;
    } else {
      consecutive = 0;
    }
  }

  if (qi < q.length) return { matched: false, score: 0 };

  return { matched: true, score };
}

export function filterCommands(commands, query, opts = {}) {
  const devMode = opts.devMode !== undefined ? opts.devMode : true;

  const visible = devMode ? commands : commands.filter(c => !c.dev);

  if (query === '') return visible;

  const matched = visible
    .map(cmd => ({ cmd, result: fuzzyMatch(query, cmd.title) }))
    .filter(({ result }) => result.matched)
    .sort((a, b) => b.result.score - a.result.score)
    .map(({ cmd }) => cmd);

  return matched;
}
