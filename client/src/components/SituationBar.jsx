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
    const localOptions = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const localStr = date.toLocaleString('id-ID', localOptions).toUpperCase().replace(/,/g, '');

    return (
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.45rem', opacity: 0.4, lineHeight: 1, letterSpacing: '0.1em' }}>Waktu Sekarang</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{localStr}</span>
        </div>
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
        <Clock size={12} className="clock-icon" />
        <div className="live-clock">{formatTime(time)}</div>
      </div>

      <div className="situation-right" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
        <div className="view-toggle-group">
          <button
            className={`view-btn ${viewMode === '2D' ? 'active' : ''}`}
            onClick={() => setViewMode('2D')}
          >
            2D
          </button>
          <button
            className={`view-btn ${viewMode === '3D' ? 'active' : ''}`}
            onClick={() => setViewMode('3D')}
          >
            3D
          </button>
        </div>

        <button
          onClick={toggleFullScreen}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '5px',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Toggle Fullscreen"
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
        >
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
};

export default SituationBar;
