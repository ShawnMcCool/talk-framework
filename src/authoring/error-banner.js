// src/authoring/error-banner.js

/**
 * Mount a dev-mode error banner on the given root element. Returns a
 * controller object the HMR diagnostics channel calls to push the current
 * diagnostic set.
 */
export function mountErrorBanner(root) {
  const el = document.createElement('div');
  el.className = 'talk-error-banner';
  el.dataset.state = 'hidden';
  el.style.cssText = `
    position: fixed; left: 0; right: 0; bottom: 0;
    background: rgba(180,40,40,0.92); color: #fff;
    font: 12px monospace; padding: 0.5rem 0.8rem;
    display: none; z-index: 9999; cursor: pointer;
  `;

  const summary = document.createElement('div');
  summary.className = 'talk-error-banner__summary';
  el.appendChild(summary);

  const details = document.createElement('div');
  details.className = 'talk-error-banner__details';
  details.style.cssText = 'display: none; margin-top: 0.4rem; max-height: 40vh; overflow-y: auto;';
  el.appendChild(details);

  el.addEventListener('click', () => toggleExpanded(el, details));
  root.appendChild(el);

  let currentDiags = [];

  function render() {
    const errs = currentDiags.filter(d => d.severity === 'error').length;
    const warns = currentDiags.filter(d => d.severity === 'warn').length;

    if (currentDiags.length === 0) {
      // If the banner is already hidden, stay hidden — nothing to acknowledge.
      if (el.dataset.state === 'hidden') return;
      el.dataset.state = 'clearing';
      summary.textContent = 'all good';
      details.innerHTML = '';
      setTimeout(() => {
        if (currentDiags.length === 0) {
          el.dataset.state = 'hidden';
          el.style.display = 'none';
        }
      }, 1000);
      return;
    }

    if (el.dataset.state === 'hidden' || el.dataset.state === 'clearing') {
      el.dataset.state = 'collapsed';
      el.style.display = 'block';
    }

    const first = currentDiags[0];
    summary.textContent = `⚠  ${errs} error${errs === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'} — ${first.file}:${first.line}:${first.column}  (click to expand)`;

    details.innerHTML = '';
    for (const d of currentDiags) {
      const row = document.createElement('div');
      row.textContent = `${d.severity}  ${d.file}:${d.line}:${d.column}  ${d.component}  ${d.message}`;
      details.appendChild(row);
      if (d.hint) {
        const hintRow = document.createElement('div');
        hintRow.textContent = `        ${d.hint}`;
        hintRow.style.opacity = '0.85';
        details.appendChild(hintRow);
      }
    }
  }

  return {
    update(diags) {
      currentDiags = diags || [];
      render();
    },
    dispose() {
      if (el.parentNode) el.parentNode.removeChild(el);
    },
  };
}

function toggleExpanded(el, details) {
  if (el.dataset.state === 'collapsed') {
    el.dataset.state = 'expanded';
    details.style.display = 'block';
  } else if (el.dataset.state === 'expanded') {
    el.dataset.state = 'collapsed';
    details.style.display = 'none';
  }
}
