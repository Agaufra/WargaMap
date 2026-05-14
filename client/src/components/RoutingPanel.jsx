import React, { useState } from 'react';
import { Search, Car, Bike, Footprints, Clock, X, MapPin, Loader2, Navigation, Copy, ArrowDownUp, CheckCircle } from 'lucide-react';
import axios from 'axios';

const RoutingPanel = ({ onClose, onRouteSubmit, onPublish, routeStats, initialWaypoints }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelMode, setTravelMode] = useState('car');
  const [isSearching, setIsSearching] = useState(false);

  // Helper to resolve address to coordinates using TomTom Search API
  const geocode = async (query) => {
    try {
      const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;
      if (!tomtomKey) {
        console.error("TomTom API Key missing for Geocoding");
        return null;
      }
      
      const res = await axios.get(`https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json`, {
        params: { key: tomtomKey, limit: 1, countrySet: 'ID' }
      });

      if (res.data && res.data.results && res.data.results.length > 0) {
        const result = res.data.results[0];
        return { 
          lat: result.position.lat, 
          lng: result.position.lon, 
          name: result.poi ? result.poi.name : result.address.freeformAddress 
        };
      }
      return null;
    } catch (err) {
      console.error("Geocoding failed", err);
      return null;
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!origin && !destination && (!initialWaypoints || initialWaypoints.length < 2)) return;

    setIsSearching(true);

    try {
      let startLoc = null;
      let endLoc = null;

      // Use existing waypoints if input is empty but we have initial waypoints
      if (origin) {
        startLoc = await geocode(origin);
      } else if (initialWaypoints && initialWaypoints[0]) {
        startLoc = initialWaypoints[0];
      }

      if (destination) {
        endLoc = await geocode(destination);
      } else if (initialWaypoints && initialWaypoints[1]) {
        endLoc = initialWaypoints[1];
      }

      if (startLoc && endLoc) {
        onRouteSubmit([startLoc, endLoc], travelMode);
      } else {
        alert("Lokasi tidak ditemukan. Coba kata kunci yang lebih spesifik.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const swapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0 mnt';
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h} jam ${m % 60} mnt`;
    return `${m} mnt`;
  };

  const formatDistance = (meters) => {
    if (!meters) return '0 km';
    return (meters / 1000).toFixed(1) + ' km';
  };

  // When mode changes, if we already have a route, trigger search again to update map
  const handleModeChange = (mode) => {
    setTravelMode(mode);
    if ((origin || (initialWaypoints && initialWaypoints[0])) && 
        (destination || (initialWaypoints && initialWaypoints[1]))) {
      // Small delay to let state update, though strictly we should pass it
      setTimeout(() => {
        onRouteSubmit(initialWaypoints, mode);
      }, 50);
    }
  };

  return (
    <div className="routing-panel-premium glass-panel" style={{
      position: 'absolute',
      top: '80px',
      left: '20px',
      width: '340px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      padding: '1.2rem',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      animation: 'slideInLeft 0.3s ease'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={18} color="#6366f1" /> Navigasi Pintar
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* Input Section */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '3px solid #6366f1' }}></div>
            <div style={{ width: 2, height: 20, background: 'rgba(255,255,255,0.2)', borderStyle: 'dotted' }}></div>
            <MapPin size={16} color="#ef4444" />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Lokasi awal (kosongkan = pin peta)" 
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }}
            />
            <input 
              type="text" 
              placeholder="Tujuan" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.85rem' }}
            />
          </div>
        </div>
        
        <button 
          onClick={swapLocations}
          style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', background: '#374151', border: '1px solid #4b5563', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', zIndex: 10 }}
        >
          <ArrowDownUp size={14} />
        </button>
      </div>

      {/* Mode Selection */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { id: 'car', icon: Car, label: 'Mobil' },
          { id: 'motorcycle', icon: Bike, label: 'Motor' },
          { id: 'pedestrian', icon: Footprints, label: 'Jalan' }
        ].map(mode => (
          <button 
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px', 
              padding: '0.6rem', 
              borderRadius: '8px', 
              border: travelMode === mode.id ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', 
              background: travelMode === mode.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', 
              color: travelMode === mode.id ? '#818cf8' : '#9ca3af',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <mode.icon size={16} />
          </button>
        ))}
      </div>

      {/* Action Button */}
      <button 
        onClick={handleSearch}
        disabled={isSearching}
        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isSearching ? 'not-allowed' : 'pointer' }}
      >
        {isSearching ? <Loader2 size={16} className="spinning" /> : <Search size={16} />}
        {isSearching ? 'MENGHITUNG RUTE...' : 'CARI RUTE TERCEPAT'}
      </button>

      {/* Stats Display */}
      {routeStats && (
        <div style={{ marginTop: '0.2rem', padding: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: 'bold' }}>{formatTime(routeStats.time)}</div>
            <div style={{ color: '#a7f3d0', fontSize: '0.75rem' }}>{formatDistance(routeStats.distance)}</div>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }} title="Salin Rute">
             <Copy size={14} />
          </button>
        </div>
      )}

    </div>
  );
};

export default RoutingPanel;
