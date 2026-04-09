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
  // Set defaults to current local datetime
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState(() => {
    const d = new Date();
    return d.toTimeString().substring(0, 5);
  });
  
  // Helper to format date "2026-04-09" -> "9 April 2026"
  const formatDateID = (val) => {
    if (!val) return "";
    const parts = val.split('-');
    if (parts.length !== 3) return val;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  };

  const [addressLines, setAddressLines] = useState({
    line1: 'Jalan Tanpa Nama',
    line2: 'Kecamatan Arjasa',
    line3: 'Kabupaten Jember',
    line4: 'Jawa Timur'
  });

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
  }, [image, date, time, addressLines, position]);

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

  useEffect(() => {
    // Attempt to get user's location on initial load
    locateUser();
  }, []);

  const locateUser = () => {
    if ("geolocation" in navigator) {
      setIsLoadingAddress(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (error) => {
          console.error("Gagal mendapatkan lokasi GPS", error);
          setIsLoadingAddress(false);
          // Fallback to default if blocked, but avoid spamming alert
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
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
      
      // Dynamic scale factors so elements are proportional to photo size
      // We use base canvas dimension so width doesn't overpower height
      const minDim = Math.min(canvas.width, canvas.height);
      const widthScale = canvas.width / 1000;
      const scale = minDim / 1000; 
      const padding = 25 * scale;

      // 1. Draw Compass (Top-Left)
      const compassSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r="45" fill="rgba(80,80,80,0.6)" stroke="#cccccc" stroke-width="8"/>
        <text x="50" y="24" fill="white" font-size="14" font-family="Arial" font-weight="bold" text-anchor="middle">N</text>
        <text x="78" y="55" fill="white" font-size="14" font-family="Arial" font-weight="bold" text-anchor="middle">E</text>
        <text x="50" y="86" fill="white" font-size="14" font-family="Arial" font-weight="bold" text-anchor="middle">S</text>
        <text x="22" y="55" fill="white" font-size="14" font-family="Arial" font-weight="bold" text-anchor="middle">W</text>
        <polygon points="50,22 55,50 45,50" fill="#00aaff"/>
        <polygon points="50,78 55,50 45,50" fill="gray"/>
      </svg>`;
      const compassImg = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(compassSvg)}`);
      const compassSize = 120 * scale;
      ctx.drawImage(compassImg, padding, padding, compassSize, compassSize);
      
      // 2. Capture and draw Map (Bottom-Left)
      // Limit map size to a maximum 35% of canvas width so it never overlaps the text
      const mapSize = Math.min(260 * scale, canvas.width * 0.35); 
      
      if (mapRef.current) {
        const mapCanvas = await html2canvas(mapRef.current, { useCORS: true, allowTaint: true, scale: 2 });
        ctx.drawImage(mapCanvas, padding, canvas.height - mapSize - padding, mapSize, mapSize);
      }

      // 3. Draw Stacked Texts (Bottom-Right)
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      
      // Strong text shadow
      ctx.shadowColor = "rgba(0, 0, 0, 1)";
      ctx.shadowBlur = 6 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 2 * scale;

      let baseFontSize = 26 * scale;
      ctx.fillStyle = "#ffffff";
      
      const formattedTime = time.replace(':', '.');
      const coordinatesStr = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
      
      const lines = [
        addressLines.line4,
        addressLines.line3,
        addressLines.line2,
        addressLines.line1,
        coordinatesStr,
        `${formatDateID(date)} ${formattedTime}`
      ].filter(line => line && line.trim() !== ''); // Remove completely empty lines

      let currentY = canvas.height - padding;
      
      for (let i = 0; i < lines.length; i++) {
        if (i === lines.length - 1 || i === lines.length - 2) {
          ctx.font = `600 ${baseFontSize * 1.15}px sans-serif`; 
        } else {
          ctx.font = `500 ${baseFontSize}px sans-serif`; 
        }
        
        // Using max-width constraint to prevent extremely long text from crossing over map
        const maxTextWidth = canvas.width - mapSize - (padding * 3);
        ctx.fillText(lines[i], canvas.width - padding, currentY, maxTextWidth > 0 ? maxTextWidth : undefined);
        currentY -= (baseFontSize * 1.3);
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
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>2. Pilih Lokasi (Klik atau Geser Peta)</span>
              {isLoadingAddress && <span className="loading-badge">Mencari...</span>}
            </label>
            <button className="secondary-btn" onClick={locateUser} style={{ marginBottom: '8px' }}>📍 Dapatkan Lokasi GPS Saya Saat Ini</button>
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
            <button className="secondary-btn" onClick={forceRenderMapOnCanvas} style={{ marginTop: '8px' }}>Refresh Render Peta ke Gambar</button>
          </div>

          <div className="row-group">
            <div className="input-group">
              <label>Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Waktu</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label>Titik Koordinat (Otomatis berdasarkan Peta)</label>
            <input type="text" value={`${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`} readOnly style={{backgroundColor: 'rgba(0,0,0,0.3)', color: '#94a3b8'}} />
          </div>

          <h3 className="section-title">Alamat Detil</h3>
          <div className="input-group">
            <input type="text" value={addressLines.line1} onChange={e => setAddressLines({...addressLines, line1: e.target.value})} placeholder="Jalan" />
            <input type="text" value={addressLines.line2} onChange={e => setAddressLines({...addressLines, line2: e.target.value})} placeholder="Kecamatan" style={{marginTop: '8px'}} />
            <input type="text" value={addressLines.line3} onChange={e => setAddressLines({...addressLines, line3: e.target.value})} placeholder="Kota/Kabupaten" style={{marginTop: '8px'}} />
            <input type="text" value={addressLines.line4} onChange={e => setAddressLines({...addressLines, line4: e.target.value})} placeholder="Provinsi" style={{marginTop: '8px'}} />
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
