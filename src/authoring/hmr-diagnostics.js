// src/authoring/hmr-diagnostics.js

/**
 * Subscribe to `talk:diagnostics` HMR events from the Vite plugin. The
 * payload is `{ sceneId, diagnostics }` where `diagnostics` is an array of
 * records in the shape documented in `docs/superpowers/specs/2026-04-19-sub-project-b-design.md`.
 *
 * This module is only imported from the dev entrypoint; production builds
 * can tree-shake it out.
 */
export function subscribeDiagnostics(hot, handler) {
  if (!hot) return () => {};
  const cb = (payload) => handler(payload);
  hot.on('talk:diagnostics', cb);
  return () => hot.off('talk:diagnostics', cb);
}
