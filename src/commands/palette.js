import { createRegistry, register, getCommands, filterCommands } from './palette.lib.js';
import { paletteStyles } from './palette.css.js';

export function createPalette({ devMode = true } = {}) {
  let registry = createRegistry();
  let overlay = null;
  let input = null;
  let resultsList = null;
  let isOpen = false;
  let selectedIndex = 0;

  function injectStyles() {
    if (document.getElementById('palette-styles')) return;
    const style = document.createElement('style');
    style.id = 'palette-styles';
    style.textContent = paletteStyles;
    document.head.appendChild(style);
  }

  function createDOM() {
    injectStyles();
    overlay = document.createElement('div');
    overlay.className = 'palette-overlay';
    overlay.innerHTML = `
      <div class="palette-box">
        <input class="palette-input" placeholder="Type a command..." />
        <div class="palette-results"></div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('.palette-input');
    resultsList = overlay.querySelector('.palette-results');

    input.addEventListener('input', () => {
      selectedIndex = 0;
      renderResults();
    });

    input.addEventListener('keydown', (e) => {
      const items = getFilteredCommands();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        renderResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          const query = input.value;
          close();
          items[selectedIndex].action(query);
        }
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  function getFilteredCommands() {
    return filterCommands(getCommands(registry), input ? input.value : '', { devMode });
  }

  function renderResults() {
    const items = getFilteredCommands();
    resultsList.innerHTML = items
      .map((cmd, i) =>
        `<div class="palette-item${i === selectedIndex ? ' selected' : ''}" data-index="${i}">${cmd.title}</div>`
      )
      .join('');

    resultsList.querySelectorAll('.palette-item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const query = input.value;
        close();
        items[idx].action(query);
      });
    });
  }

  function open() {
    if (!overlay) createDOM();
    isOpen = true;
    overlay.classList.add('open');
    input.value = '';
    selectedIndex = 0;
    renderResults();
    input.focus();
  }

  function close() {
    isOpen = false;
    if (overlay) overlay.classList.remove('open');
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) {
        close();
      } else {
        open();
      }
    }
  }

  return {
    start() {
      document.addEventListener('keydown', handleKeyDown, true);
    },

    stop() {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    },

    register(command) {
      registry = register(registry, command);
    },

    isOpen() {
      return isOpen;
    },
  };
}
