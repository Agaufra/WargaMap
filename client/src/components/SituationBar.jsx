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
    <div className="situation-bar">
      <div className="situation-left">
        <span className="situation-label">INDONESIA SITUATION</span>
      </div>

      <div className="situation-center">
        <Clock size={14} color="#6366f1" style={{ opacity: 0.8 }} />
        <div className="live-clock">{formatTime(time)}</div>
      </div>

      <div className="situation-right" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={toggleFullScreen}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '6px',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="Toggle Fullscreen"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
        >
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
};

export default SituationBar;
