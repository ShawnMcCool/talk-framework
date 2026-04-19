// Validates a parsed TOML object against the v1 talk.toml schema.
// Returns { config, errors } where errors is an array of human-readable strings.
// `config` is the input passed through (not defensively copied) — callers can
// trust the fields they validated.

export function validateTalkConfig(raw) {
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    return { config: null, errors: ['talk.toml: expected a table at the top level'] };
  }

  if (typeof raw.title !== 'string' || raw.title.length === 0) {
    errors.push('talk.toml: `title` is required and must be a non-empty string');
  }

  if (raw.framework_version === undefined) {
    errors.push('talk.toml: `framework_version` is required');
  } else if (typeof raw.framework_version !== 'string') {
    errors.push('talk.toml: `framework_version` must be a string (quote the value)');
  }

  if (raw.author !== undefined && typeof raw.author !== 'string') {
    errors.push('talk.toml: `author` must be a string');
  }

  if (raw.palette !== undefined) {
    if (typeof raw.palette !== 'object' || Array.isArray(raw.palette) || raw.palette === null) {
      errors.push('talk.toml: `palette` must be a [palette] table');
    } else {
      for (const [k, v] of Object.entries(raw.palette)) {
        if (typeof v !== 'string') {
          errors.push(`talk.toml: [palette] "${k}" must be a string (hex colour or token)`);
        }
      }
    }
  }

  return { config: raw, errors };
}
