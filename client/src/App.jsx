import { useState } from 'react';
import RangoliCanvas from './components/RangoliCanvas';
import { socket } from './socket';
import './App.css';

function App() {
  const COLORS = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899'
  ];

  // State
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(15);
  const [brushType, setBrushType] = useState('regular');
  const [symmetry, setSymmetry] = useState(8);
  const [glowIntensity, setGlowIntensity] = useState(0.7);
  const [showGuides, setShowGuides] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [currentPattern, setCurrentPattern] = useState('dot');

  // Helper function to darken color
  const darkenColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  // Action handlers
  const handleUndo = () => {
    // Note: Undo would require tracking strokes in parent component
    console.log('Undo functionality would be implemented here');
  };

  const handleClear = () => {
    if (socket && socket.connected) {
      socket.emit('clear');
    }
    // The canvas component will handle clearing via socket event
  };

  const handleSave = () => {
    const canvas = document.getElementById('rangoliCanvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `rangoli-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <h1 className="title">Digital Rangoli</h1>
        <p className="subtitle">Create patterns together</p>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Canvas Section */}
        <section className="canvas-section">
          <RangoliCanvas
            currentColor={currentColor}
            brushSize={brushSize}
            brushType={brushType}
            symmetry={symmetry}
            glowIntensity={glowIntensity}
            showGuides={showGuides}
            showParticles={showParticles}
            currentPattern={currentPattern}
          />
        </section>

        {/* Color Strip - Always Visible */}
        <div className="color-strip">
          <div className="color-palette-vertical">
            {COLORS.map((color, index) => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{
                  background: color,
                  borderColor: darkenColor(color, 30)
                }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
          {/* Color Picker Button */}
          <div className="color-picker-wrapper">
            <button className="color-btn color-picker-btn" title="Pick any color">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
              />
            </button>
          </div>
        </div>

        {/* Controls Panel - Always Visible on Right */}
        <aside className="controls-sidebar">
          <div className="controls-panel">
            {/* Brush Type */}
            <div className="control-section">
              <label className="control-label">Brush Type</label>
              <div className="brush-type-grid">
                <button
                  className={`brush-type-btn ${brushType === 'regular' ? 'active' : ''}`}
                  onClick={() => setBrushType('regular')}
                >
                  <span className="brush-icon">●</span>
                  <span className="brush-label">Regular</span>
                </button>
                <button
                  className={`brush-type-btn ${brushType === 'precise' ? 'active' : ''}`}
                  onClick={() => setBrushType('precise')}
                >
                  <span className="brush-icon">•</span>
                  <span className="brush-label">Precise</span>
                </button>
              </div>
            </div>

            {/* Brush Size */}
            <div className="control-section">
              <label className="control-label">
                Brush <span>{brushSize}</span>
              </label>
              <input
                type="range"
                className="slider"
                min="5"
                max="40"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
              />
            </div>

            {/* Symmetry */}
            <div className="control-section">
              <label className="control-label">Symmetry</label>
              <div className="symmetry-grid">
                {[4, 8, 12, 16].map(sym => (
                  <button
                    key={sym}
                    className={`symmetry-btn ${symmetry === sym ? 'active' : ''}`}
                    onClick={() => setSymmetry(sym)}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern */}
            <div className="control-section">
              <label className="control-label">Pattern</label>
              <div className="pattern-grid">
                <button
                  className={`pattern-btn ${currentPattern === 'dot' ? 'active' : ''}`}
                  onClick={() => setCurrentPattern('dot')}
                  title="Dot"
                >
                  ●
                </button>
                <button
                  className={`pattern-btn ${currentPattern === 'flower' ? 'active' : ''}`}
                  onClick={() => setCurrentPattern('flower')}
                  title="Flower"
                >
                  ✿
                </button>
                <button
                  className={`pattern-btn ${currentPattern === 'star' ? 'active' : ''}`}
                  onClick={() => setCurrentPattern('star')}
                  title="Star"
                >
                  ★
                </button>
                <button
                  className={`pattern-btn ${currentPattern === 'heart' ? 'active' : ''}`}
                  onClick={() => setCurrentPattern('heart')}
                  title="Heart"
                >
                  ♥
                </button>
              </div>
            </div>

            {/* Glow */}
            <div className="control-section">
              <label className="control-label">
                Glow <span>{Math.round(glowIntensity * 100)}%</span>
              </label>
              <input
                type="range"
                className="slider"
                min="0"
                max="100"
                value={glowIntensity * 100}
                onChange={(e) => setGlowIntensity(parseFloat(e.target.value) / 100)}
              />
            </div>

            {/* Toggles */}
            <div className="control-section toggles">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span>Show guides</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showParticles}
                  onChange={(e) => setShowParticles(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span>Particles</span>
              </label>
            </div>

            {/* Actions */}
            <div className="actions">
              <button className="btn btn-secondary" onClick={handleUndo}>
                Undo
              </button>
              <button className="btn btn-secondary" onClick={handleClear}>
                Clear
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;