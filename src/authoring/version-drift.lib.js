// Compares the `framework_version` declared in a deck's talk.toml against the
// version of the installed talk CLI. The check is informational — a mismatch
// warns, it does not error — so authors get a heads-up when they load an old
// deck against a newer framework or vice versa, but the deck still runs.
//
// Pre-1.0 semantics: minor bumps can be breaking, so we require major.minor
// to match. Patch differences are ignored. Declared versions may omit the
// patch (e.g. "0.4") — that's the common authoring shorthand.

export function checkVersionDrift({ declaredVersion, installedVersion }) {
  if (!declaredVersion || !installedVersion) {
    return { ok: true, message: null };
  }

  const declared = parseVersion(declaredVersion);
  const installed = parseVersion(installedVersion);

  if (declared.major === installed.major && declared.minor === installed.minor) {
    return { ok: true, message: null };
  }

  return {
    ok: false,
    message:
      `talk.toml declares framework_version "${declaredVersion}" but the installed talk CLI is ${installedVersion}. ` +
      `The deck may not render correctly — update the declared version, or install a matching CLI.`,
  };
}

function parseVersion(v) {
  const parts = String(v).split('.').map(p => parseInt(p, 10));
  return {
    major: Number.isFinite(parts[0]) ? parts[0] : 0,
    minor: Number.isFinite(parts[1]) ? parts[1] : 0,
    patch: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}
