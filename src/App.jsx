import React, { useState, useRef, useEffect } from 'react';
import './index.css';

const App = () => {
  const [image, setImage] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));
  const [location, setLocation] = useState('Jakarta, Indonesia');
  const [latitude, setLatitude] = useState('-6.200000');
  const [longitude, setLongitude] = useState('106.816666');
  const [note, setNote] = useState('Dokumentasi Lapangan');
  const canvasRef = useRef(null);

  // SVG strings (Compass & Map)
  const compassSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="45" fill="rgba(0,0,0,0.5)" stroke="white" stroke-width="2"/><polygon points="50,10 65,50 50,90 35,50" fill="red"/><polygon points="50,90 65,50 50,50 35,50" fill="white"/><text x="50" y="25" fill="white" font-size="16" font-family="Arial" text-anchor="middle" font-weight="bold">U</text></svg>`;
  
  const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><rect x="5" y="5" width="110" height="110" rx="10" fill="rgba(0,0,0,0.5)" stroke="white" stroke-width="2"/><path d="M 20 40 Q 40 20, 60 40 T 100 40" stroke="white" stroke-width="2" fill="none"/><path d="M 20 70 Q 40 50, 60 70 T 100 70" stroke="white" stroke-width="2" fill="none"/><path d="M 40 20 L 40 100 M 80 20 L 80 100" stroke="white" stroke-width="2" fill="none"/><circle cx="60" cy="60" r="8" fill="red"/><path d="M 60 60 L 60 40" stroke="red" stroke-width="4"/><circle cx="60" cy="35" r="5" fill="white"/></svg>`;

  useEffect(() => {
    if (image && canvasRef.current) {
      drawCanvas();
    }
  }, [image, date, time, location, latitude, longitude, note]);

  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.src = src;
    });
  };

  const drawCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const bgImg = await loadImage(image);
    canvas.width = bgImg.width;
    canvas.height = bgImg.height;
    
    ctx.drawImage(bgImg, 0, 0);
    
    // Scaling sizes based on image dimensions
    const scale = Math.max(canvas.width, canvas.height) / 1000;
    const padding = 30 * scale;

    // Draw Compass (Top-Left)
    try {
      const compassImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(compassSvg)}`);
      const compassSize = 100 * scale;
      ctx.drawImage(compassImg, padding, padding, compassSize, compassSize);
    } catch (e) {
      console.error("Compass drawing failed", e);
    }
    
    // Draw Map (Bottom-Left)
    try {
      const mapImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(mapSvg)}`);
      const mapSize = 150 * scale;
      ctx.drawImage(mapImg, padding, canvas.height - mapSize - padding, mapSize, mapSize);
    } catch (e) {
      console.error("Map drawing failed", e);
    }

    // Draw Texts (Bottom-Right)
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    
    // Shadow for texts
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 10 * scale;
    ctx.shadowOffsetX = 3 * scale;
    ctx.shadowOffsetY = 3 * scale;

    let fontSize = 32 * scale;
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = "#ffffff";

    const textLines = [
      note,
      `Lat: ${latitude} | Lon: ${longitude}`,
      location,
      `${date} ${time}`
    ];

    let currentY = canvas.height - padding;
    textLines.forEach((line) => {
      ctx.fillText(line, canvas.width - padding, currentY);
      currentY -= (fontSize * 1.5);
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
    }
  };

  const downloadCanvas = () => {
    if (!canvasRef.current || !image) return;
    const link = document.createElement('a');
    link.download = `timestamp-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="app-container">
      <header className="glass-header">
        <h1>Photo Stamper Pro</h1>
        <p>Premium watermark and location detailer</p>
      </header>

      <main className="main-content">
        <aside className="sidebar glass-panel">
          <h2>Details Form</h2>
          <div className="input-group">
            <label>Upload Photo</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>
          <div className="row-group">
            <div className="input-group">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label>Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="row-group">
            <div className="input-group">
              <label>Latitude</label>
              <input type="text" value={latitude} onChange={e => setLatitude(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Longitude</label>
              <input type="text" value={longitude} onChange={e => setLongitude(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label>Extra Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <button className="primary-btn" onClick={downloadCanvas} disabled={!image}>
            Download Photo
          </button>
        </aside>

        <section className="preview-container glass-panel">
          <h2>Preview</h2>
          <div className="canvas-wrapper">
            {!image && <div className="placeholder">Please upload a photo to preview.</div>}
            <canvas ref={canvasRef} style={{ display: image ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain' }}></canvas>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
