export const paletteStyles = `
  .palette-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20vh;
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }
  .palette-overlay.open {
    opacity: 1;
    pointer-events: auto;
  }
  .palette-box {
    background: #2d3142;
    border: 1px solid #4a5068;
    border-radius: 8px;
    width: 480px;
    max-width: 90vw;
    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
    overflow: hidden;
  }
  .palette-input {
    width: 100%;
    padding: 14px 16px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #4a5068;
    color: #e8e8f0;
    font-size: 1rem;
    font-family: inherit;
    outline: none;
  }
  .palette-input::placeholder { color: #6a6c88; }
  .palette-results {
    max-height: 300px;
    overflow-y: auto;
  }
  .palette-item {
    padding: 10px 16px;
    color: #9a9cb8;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
  }
  .palette-item:hover, .palette-item.selected {
    background: #383d52;
    color: #e8e8f0;
  }
`;
