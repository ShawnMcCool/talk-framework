export function createHtmlRenderer() {
  let container = null;

  return {
    init(stage) {
      container = document.createElement('div');
      container.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;';
      stage.appendChild(container);
      return container;
    },

    destroy() {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      container = null;
    },

    getContainer() {
      return container;
    },
  };
}
