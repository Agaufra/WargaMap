import React, { useState, useRef, useEffect } from 'react';
import { Bus, MapPin, ChevronDown, Search, X } from 'lucide-react';
import { angkotData } from '../data/angkotData';

const AngkotMonitor = ({ onAngkotSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset state when closing the dropdown
  useEffect(() => {
    if (!isOpen) {
      setSelectedCity(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const cities = ['BOGOR', 'BANDUNG', 'JAKARTA'];

  const filteredData = selectedCity ? angkotData.filter(angkot => {
    const matchesSearch =
      angkot.nomor_trayek.toLowerCase().includes(searchTerm.toLowerCase()) ||
      angkot.jurusan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      angkot.rute_pergi.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCity = angkot.kota === selectedCity;

    return matchesSearch && matchesCity;
  }) : [];

  return (
    <div className="angkot-monitor-wrapper" ref={dropdownRef}>
      <div
        className={`angkot-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.02)',
          fontSize: '0.75rem',
          fontWeight: '300',
          color: isOpen ? '#fff' : 'rgba(255,255,255,0.6)',
          transition: 'all 0.2s'
        }}
      >
        <Bus size={14} color={isOpen ? 'var(--acc-primary)' : 'currentColor'} />
        <span>ANGKOT</span>
        <ChevronDown size={14} style={{ opacity: 0.7, transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
      </div>

      {isOpen && (
        <div className="angkot-dropdown glass-panel" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
          <div className="angkot-dropdown-header">
            <div className="angkot-search-bar">
              <Search size={14} />
              <input
                type="text"
                placeholder="Cari rute atau nomor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <X size={14} onClick={() => setSearchTerm('')} style={{ cursor: 'pointer' }} />}
            </div>

            <div className="direct-city-selector">
              {cities.map(city => (
                <div
                  key={city}
                  className={`city-btn ${selectedCity === city ? 'active' : ''}`}
                  onClick={() => setSelectedCity(city)}
                >
                  {city}
                </div>
              ))}
            </div>
          </div>

          <div className="angkot-list-container">
            {!selectedCity ? (
              <div className="angkot-empty">Pilih daerah untuk melihat daftar rute angkot.</div>
            ) : filteredData.length > 0 ? (
              filteredData.map((angkot, index) => (
                <div key={`${angkot.nomor_trayek}-${index}`} className="angkot-item" onClick={() => {
                  if (onAngkotSelect) onAngkotSelect(angkot);
                  setIsOpen(false);
                }} style={{ cursor: 'pointer' }}>
                  <div className="angkot-item-main">
                    <div className="angkot-badge">
                      <span className="angkot-number">{angkot.nomor_trayek}</span>
                      <div className="angkot-color-indicator" style={{ backgroundColor: getColorCode(angkot.warna_mobil) }}></div>
                    </div>
                    <div className="angkot-info">
                      <div className="angkot-jurusan">{angkot.jurusan}</div>
                      <div className="angkot-category-tag">{angkot.kategori || 'DALAM KOTA'}</div>
                    </div>
                  </div>

                  <div className="angkot-route-details">
                    <div className="route-section">
                      <div className="route-label">RUTE PERGI</div>
                      <div className="route-text">{angkot.rute_pergi}</div>
                    </div>
                    <div className="route-section">
                      <div className="route-label">RUTE PULANG</div>
                      <div className="route-text">{angkot.rute_pulang}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="angkot-empty">Tidak ada data angkot ditemukan.</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .angkot-monitor-wrapper {
          position: relative;
        }

        .angkot-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: 360px;
          max-height: 360px;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
          z-index: 5000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: angkotSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes angkotSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        .angkot-dropdown-header {
          padding: 0.8rem;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .angkot-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px 10px;
        }

        .angkot-search-bar input {
          background: transparent;
          border: none;
          color: white;
          font-size: 0.75rem;
          width: 100%;
          outline: none;
        }

        .direct-city-selector {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .city-btn {
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.6);
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .city-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .city-btn.active {
          background: rgba(99, 102, 241, 0.1);
          color: var(--acc-primary);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: inset 0 0 15px rgba(99, 102, 241, 0.05);
        }

        .angkot-list-container {
          overflow-y: auto;
          flex: 1;
          padding: 0.5rem 0.5rem 1rem 0.5rem;
        }

        .angkot-item {
          padding: 0.8rem;
          border-radius: 8px;
          transition: all 0.2s;
          margin-bottom: 0.3rem;
          border: 1px solid transparent;
        }

        .angkot-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.05);
        }

        .angkot-item-main {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 0.5rem;
        }

        .angkot-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 38px;
          height: 38px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .angkot-number {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 1rem;
          color: var(--acc-primary);
          line-height: 1;
        }

        .angkot-color-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-top: 3px;
        }

        .angkot-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .angkot-jurusan {
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 700;
          color: white;
        }

        .angkot-category-tag {
          font-size: 0.55rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.2);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .angkot-route-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-left: 50px;
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          margin-left: 19px;
        }

        .route-section {
          display: flex;
          flex-direction: column;
        }

        .route-label {
          font-size: 0.5rem;
          font-weight: 800;
          color: var(--acc-primary);
          opacity: 0.5;
          text-transform: uppercase;
        }

        .route-text {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.4);
          line-height: 1.3;
        }

        .angkot-empty {
          padding: 2rem;
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

const getColorCode = (colorName) => {
  const colors = {
    'Biru': '#3b82f6',
    'Oranye': '#f97316',
    'Hijau': '#22c55e',
    'Putih': '#ffffff',
    'Kuning': '#eab308',
    'Merah': '#ef4444',
    'Ungu': '#a855f7',
    'Krem': '#f5f5dc',
  };
  return colors[colorName] || '#6366f1';
};

export default AngkotMonitor;
