import React, { useState, useEffect } from 'react';
import { Globe, Map as MapIcon, Clock, Layers, Maximize } from 'lucide-react';

const SituationBar = ({ viewMode, setViewMode, mapStyle, setMapStyle }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    const day = date.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase();
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    const timeStr = `${day} ${dayNum} ${month} ${year} ${hours}.${minutes}.${seconds}`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
        <span style={{ fontSize: '0.4rem', opacity: 0.5, letterSpacing: '0.1em', marginBottom: '2px', textTransform: 'uppercase' }}>Waktu Sekarang</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{timeStr}</span>
      </div>
    );
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="situation-bar" style={{ background: '#0b0b0f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 1rem', height: '34px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>INDONESIA STATION</div>
      <div style={{ color: 'white', fontSize: '0.7rem' }}>JAM LIVE: {time.toLocaleTimeString()}</div>
      <button onClick={toggleFullScreen} style={{ background: 'transparent', border: '1px solid white', color: 'white', cursor: 'pointer', fontSize: '0.6rem', padding: '2px 5px' }}>FULLSCREEN</button>
    </div>
  );
};

export default SituationBar;
