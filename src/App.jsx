import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';

import L from 'leaflet';
import './index.css';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle clicks on the map
function MapInteraction({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return null;
}

const App = () => {
  const [image, setImage] = useState(null);
  const [date, setDate] = useState('20 Mei 2022');
  const [time, setTime] = useState('14.09.07');
  
  // Custom Data states according to reference
  const [bearing, setBearing] = useState('286° W');
  const [addressLines, setAddressLines] = useState({
    line1: 'Jalan Tanpa Nama',
    line2: 'Kecamatan Arjasa',
    line3: 'Kabupaten Jember',
    line4: 'Jawa Timur'
  });
  
  const [altitude, setAltitude] = useState('Altitude:234.2m');
  const [speed, setSpeed] = useState('Speed:0.0km/h');
  const [indexNum, setIndexNum] = useState('Index number: 47');

  const [position, setPosition] = useState({ lat: -8.112, lng: 113.822 });
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const canvasRef = useRef(null);
  const mapRef = useRef(null); // Reference wrapper for map

  // Fetch address automatically when map position changes
  useEffect(() => {
    const fetchAddress = async () => {
      setIsLoadingAddress(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
        const data = await res.json();
        
        if (data && data.address) {
          const road = data.address.road || data.address.village || 'Jalan Tanpa Nama';
          const kecamatan = data.address.county || data.address.district || data.address.suburb || 'Kecamatan Tidak Diketahui';
          const kabupaten = data.address.city || data.address.town || data.address.municipality || data.address.region || 'Kabupaten Tidak Diketahui';
          const provinsi = data.address.state || 'Provinsi Tidak Diketahui';
          
          setAddressLines({
            line1: road,
            line2: `Kecamatan ${kecamatan.replace('Kecamatan ', '')}`,
            line3: `${kabupaten}`,
            line4: provinsi
          });
        }
      } catch (e) {
        console.error("Gagal mengambil alamat otomatis", e);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchAddress();
  }, [position]);

  // Redraw canvas whenever any inputs or image changes
  useEffect(() => {
    if (image && canvasRef.current) {
      drawCanvas();
    }
  }, [image, date, time, bearing, addressLines, altitude, speed, indexNum]);

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

  const drawCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    try {
      const bgImg = await loadImage(image);
      canvas.width = bgImg.width;
      canvas.height = bgImg.height;
      
      // Draw background
      ctx.drawImage(bgImg, 0, 0);
      
      const scale = Math.max(canvas.width, canvas.height) / 1000;
      const padding = 30 * scale;

      // 1. Draw Compass (Top-Left)
      const compassSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r="45" fill="rgba(80,80,80,0.6)" stroke="#cccccc" stroke-width="8"/>
        <text x="50" y="22" fill="white" font-size="12" font-family="Arial" font-weight="bold" text-anchor="middle">N</text>
        <text x="80" y="54" fill="white" font-size="12" font-family="Arial" font-weight="bold" text-anchor="middle">E</text>
        <text x="50" y="86" fill="white" font-size="12" font-family="Arial" font-weight="bold" text-anchor="middle">S</text>
        <text x="20" y="54" fill="white" font-size="12" font-family="Arial" font-weight="bold" text-anchor="middle">W</text>
        <polygon points="50,25 55,50 45,50" fill="#00aaff"/>
        <polygon points="50,75 55,50 45,50" fill="gray"/>
      </svg>`;
      const compassImg = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(compassSvg)}`);
      const compassSize = 130 * scale;
      ctx.drawImage(compassImg, padding, padding, compassSize, compassSize);
      
      // 2. Capture and draw Map (Bottom-Left)
      if (mapRef.current) {
        // html2canvas captures the leaflet map element
        const mapCanvas = await html2canvas(mapRef.current, { useCORS: true, allowTaint: true });
        const mapSize = 250 * scale; // Large map block like reference
        ctx.drawImage(mapCanvas, padding, canvas.height - mapSize - padding, mapSize, mapSize);
        
        // Let's draw a small 'Google' watermark placeholder to mimic the vibe if needed
        // (Just a text mimic, though the user asked for Google map real time, we emulate it)
      }

      // 3. Draw Stacked Texts (Bottom-Right)
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      
      // Strong text shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 4 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 2 * scale;

      let fontSize = 28 * scale;
      ctx.fillStyle = "#ffffff";
      
      const lines = [
        indexNum,
        speed,
        altitude,
        addressLines.line4,
        addressLines.line3,
        addressLines.line2,
        addressLines.line1,
        bearing,
        `${date} ${time}`
      ];

      let currentY = canvas.height - padding;
      
      for (let i = 0; i < lines.length; i++) {
        // First line (Date/Time) and Bearing are slightly larger or similar, let's keep all same font for elegance but match the visual hierarchy
        if (i === 0 || i === 1 || i === 2) {
          ctx.font = `500 ${22 * scale}px sans-serif`; // technical data is usually slightly smaller or standard
        } else if (i === lines.length - 1 || i === lines.length - 2) {
          ctx.font = `600 ${28 * scale}px sans-serif`; // date and bearing slightly prominent
        } else {
          ctx.font = `500 ${26 * scale}px sans-serif`; // addresses
        }
        
        ctx.fillText(lines[i], canvas.width - padding, currentY);
        currentY -= (fontSize * 1.25);
      }
      
    } catch (e) {
      console.error("Canvas drawing failed", e);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
    }
  };

  const forceRenderMapOnCanvas = () => {
    if (image) drawCanvas();
  };

  return (
    <div className="app-container">
      <header className="glass-header">
        <h1>Photo Stamper Pro</h1>
        <p>Premium timestamp & maps (OpenStreetMap)</p>
      </header>

      <main className="main-content">
        <aside className="sidebar glass-panel">
          <h2>Pengaturan Titik & Info</h2>
          
          <div className="input-group">
            <label>1. Unggah Foto Dasar</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="input-group">
            <label>2. Pilih Lokasi (Klik atau Geser Peta) {isLoadingAddress && <span className="loading-badge">Mencari...</span>}</label>
            {/* The Map Component */}
            <div className="map-picker-wrapper" ref={mapRef}>
               <MapContainer 
                 center={[position.lat, position.lng]} 
                 zoom={15} 
                 scrollWheelZoom={true} 
                 style={{ height: "250px", width: "100%", borderRadius: "8px" }}
                 zoomControl={false}
               >
                <TileLayer
                  attribution='&copy; OSM'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  crossOrigin="anonymous"
                />
                <Marker position={[position.lat, position.lng]} />
                <MapInteraction setPosition={setPosition} />
              </MapContainer>
            </div>
            <button className="secondary-btn" onClick={forceRenderMapOnCanvas}>Refresh Render Peta ke Gambar</button>
          </div>

          <div className="row-group">
            <div className="input-group">
              <label>Tanggal</label>
              <input type="text" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Waktu</label>
              <input type="text" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label>Arah (Bearing)</label>
            <input type="text" value={bearing} onChange={e => setBearing(e.target.value)} />
          </div>

          <h3 className="section-title">Alamat Detil</h3>
          <div className="input-group">
            <input type="text" value={addressLines.line1} onChange={e => setAddressLines({...addressLines, line1: e.target.value})} placeholder="Jalan" />
            <input type="text" value={addressLines.line2} onChange={e => setAddressLines({...addressLines, line2: e.target.value})} placeholder="Kecamatan" style={{marginTop: '8px'}} />
            <input type="text" value={addressLines.line3} onChange={e => setAddressLines({...addressLines, line3: e.target.value})} placeholder="Kota/Kabupaten" style={{marginTop: '8px'}} />
            <input type="text" value={addressLines.line4} onChange={e => setAddressLines({...addressLines, line4: e.target.value})} placeholder="Provinsi" style={{marginTop: '8px'}} />
          </div>

          <h3 className="section-title">Data Teknis</h3>
          <div className="row-group">
            <div className="input-group">
              <label>Ketinggian</label>
              <input type="text" value={altitude} onChange={e => setAltitude(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Kecepatan</label>
              <input type="text" value={speed} onChange={e => setSpeed(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label>Nomor Indeks</label>
            <input type="text" value={indexNum} onChange={e => setIndexNum(e.target.value)} />
          </div>

          <button className="primary-btn" onClick={() => {
            if (!canvasRef.current || !image) return;
            const link = document.createElement('a');
            link.download = `timestamp-${Date.now()}.png`;
            link.href = canvasRef.current.toDataURL('image/png');
            link.click();
          }} disabled={!image}>
            Download Hasil Foto
          </button>
        </aside>

        <section className="preview-container glass-panel">
          <h2>Preview Hasil</h2>
          <div className="canvas-wrapper">
            {!image && <div className="placeholder">Silakan unggah foto dasar terlebih dahulu.</div>}
            <canvas ref={canvasRef} style={{ display: image ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain' }}></canvas>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
