import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import ReactPlayer from 'react-player';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Plus, Minus, Home, User, LogIn, CheckCircle, AlertTriangle, Video, Layers, ShieldAlert, Radio, ChevronDown, ChevronUp, MapPin, X, Globe, Map as MapIcon2, Navigation, Route } from 'lucide-react';
import ReportModal from './ReportModal';
import AIChat from './AIChat';
import RoutingControl from './RoutingControl';
import RoutingPanel from './RoutingPanel';

// Cluster CSS is required for clustering to work
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCustomIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const createHackerIcon = () => {
  return new L.DivIcon({
    className: 'custom-hacker-icon',
    html: `
      <div class="hacker-marker-container" style="transform: scale(0.7);">
        <div class="hacker-pulse"></div>
        <div class="hacker-icon-core">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2z"></path>
            <path d="M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
            <path d="M20 21a8 8 0 0 0-16 0"></path>
          </svg>
        </div>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};


const getPriorityColor = (report) => {
  if (report.source === 'news') return '#3b82f6';
  switch (report.priorityLevel) {
    case 'Critical': return '#7f1d1d';
    case 'High': return '#ef4444';
    case 'Medium': return '#f59e0b';
    case 'Low': return '#10b981';
    default: return '#6366f1';
  }
};

let globalLocationDetected = false;

const MapDashboard = ({
  showCCTV, center, zoom, onViewChange, mapStyle, setMapStyle,
  user, setShowLogin, alertLocation, setAlertLocation, activeAngkotRoute
}) => {
  const [reports, setReports] = useState([]);
  const [topCritical, setTopCritical] = useState([]);
  const [infrastructure, setInfrastructure] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const [currentRouteWaypoints, setCurrentRouteWaypoints] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [showTraffic, setShowTraffic] = useState(false);
  
  // Routing Panel States
  const [routeStats, setRouteStats] = useState(null);
  const [travelMode, setTravelMode] = useState('car');



  // Smart Alerts State
  const [showCriticalList, setShowCriticalList] = useState(true);
  const [isTrackingMe, setIsTrackingMe] = useState(false);
  const [regionName, setRegionName] = useState('Detecting...');
  const [cctvs, setCCTVs] = useState([]);
  const [activeStream, setActiveStream] = useState(null);
  const autoHideTimerRef = useRef(null);

  // Dynamic timer to hide panel after 30s of inactivity
  const resetAutoHideTimer = () => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    autoHideTimerRef.current = setTimeout(() => {
      setShowCriticalList(false);
    }, 30000); // 30 seconds
  };

  // Resolves coordinates into a detailed street/district/city name
  const fetchRegionName = async (lat, lng) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`);
      const address = res.data?.address || {};
      const road = address.road || address.pedestrian || '';
      const suburb = address.suburb || address.neighbourhood || address.village || '';
      const city = address.city || address.town || address.state_district || address.county || '';
      
      const fullPlace = [road, suburb, city].filter(Boolean).join(', ');
      setRegionName(fullPlace || 'Lokasi Tidak Diketahui');
    } catch (err) {
      console.error('Reverse Geocode failed', err);
      setRegionName('Area Terdeteksi');
    }
  };

  const fetchData = async (loc = alertLocation, autoExpand = false) => {
    try {
      const mainRes = await axios.get('http://localhost:3001/api/reports');

      // Fetch localized top-critical alerts
      const queryParams = loc ? `?lat=${loc.lat}&lng=${loc.lng}` : '';
      const criticalRes = await axios.get(`http://localhost:3001/api/reports/top-critical${queryParams}`);

      const fetchedReports = criticalRes.data;
      setReports(mainRes.data);
      setTopCritical(fetchedReports);

      // Fetch CCTV data
      const cctvRes = await axios.get('http://localhost:3001/api/cctvs');
      setCCTVs(cctvRes.data);

      // Auto-expand only if problems are actually found in this area
      if (autoExpand && fetchedReports.length > 0) {
        setShowCriticalList(true);
        resetAutoHideTimer();
      } else if (autoExpand) {
        // If investigating via click but no problems found, keep it clean
        setShowCriticalList(false);
      }
    } catch (err) {
      console.error('Error fetching data', err);
    }
  };

  // HLS Player Logic
  useEffect(() => {
    if (activeStream) {
      const video = document.getElementById('cctv-player');
      if (video && window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(activeStream);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.error("Autoplay blocked", e));
        });
      } else if (video && video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = activeStream;
        video.addEventListener('loadedmetadata', () => video.play());
      }
    }
  }, [activeStream]);

  const fetchSmartCityData = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/smart-city-data');
      setInfrastructure(res.data.infrastructure);
    } catch (err) {
      console.error('Error fetching CCTV data', err);
    }
  };

  const detectLocation = (force = false) => {
    if (globalLocationDetected && !force) return;
    globalLocationDetected = true;
    setIsTrackingMe(true);

    if (!navigator.geolocation) {
      fetchSmartCityData();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const initialLoc = { lat: latitude, lng: longitude };
        onViewChange([latitude, longitude], 13, 'detect', initialLoc);
        fetchRegionName(latitude, longitude);
        fetchSmartCityData();
        fetchData(initialLoc, true); // Auto-expand on initial load if problems exist
      },
      (error) => {
        console.error(error);
        fetchSmartCityData();
        fetchData();
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    fetchData();
    detectLocation();
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  const handleVote = async (reportId, voteType) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      await axios.post(`http://localhost:3001/api/reports/${reportId}/vote`, {
        userId: user.id,
        voteType
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to vote');
    }
  };

  // Map Events Component (Syncs internal Leaflet view with React state)
  const MapEventsHandler = () => {
    const map = useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        const newLoc = { lat, lng };
        setIsTrackingMe(false);
        onViewChange([lat, lng], map.getZoom(), 'click', newLoc);
        fetchRegionName(lat, lng);
        fetchData(newLoc, true); // Investigating: Auto-expand only if reports found
      },
      moveend: () => {
        const center = map.getCenter();
        onViewChange([center.lat, center.lng], map.getZoom(), 'move');
      },
      zoomend: () => {
        const center = map.getCenter();
        onViewChange([center.lat, center.lng], map.getZoom(), 'zoom');
      }
    });
    return null;
  };

  return (
    <div className="map-container-wrapper" style={{ willChange: 'transform' }}>

      <MapContainer 
        center={center} 
        zoom={zoom} 
        className="map-root" 
        zoomControl={false}
        preferCanvas={true}
        markerZoomAnimation={true}
        zoomSnap={1}
        zoomDelta={1}
      >
        <BaseLayers mapStyle={mapStyle} />
        {showTraffic && <TrafficLayer />}
        <MapRecenter center={center} zoom={zoom} />
        <MapEventsHandler />
        {alertLocation && (
          <Marker
            position={[alertLocation.lat, alertLocation.lng]}
            icon={createHackerIcon()}
            zIndexOffset={1000}
          >
            <Popup>
              <div style={{ textAlign: 'center', color: '#333', minWidth: '180px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#111' }}>Informasi Lokasi & Jalan</strong><br />
                <div style={{ fontSize: '0.85rem', marginTop: '6px', color: '#2563eb', fontWeight: 'bold' }}>{regionName}</div>
                <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '6px' }}>Titik Fokus Pantauan</div>
              </div>
            </Popup>
          </Marker>
        )}


        {/* REAL BSW BOGOR CCTV (Live HLS) */}
        {showCCTV && cctvs.map(item => (
          <Marker
            key={`bsw-cctv-${item.id}`}
            position={[item.lat, item.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.5);">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                                   </div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
            eventHandlers={{
              click: () => {
                setActiveStream(item.streamUrl);
                setRegionName(item.name);
              }
            }}
          >
            <Popup>
              <div style={{ color: '#333', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{item.name}</h4>
                </div>
                <button
                  onClick={() => setActiveStream(item.streamUrl)}
                  style={{ width: '100%', padding: '0.6rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  PANTAU LIVE SEKARANG
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* INCIDENT REPORTS with Clustering */}
        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {reports.map((report) => (
            report.lat && report.lng && (
              <Marker
                key={report.id}
                position={[report.lat, report.lng]}
                icon={createCustomIcon(getPriorityColor(report))}
                eventHandlers={{
                  click: () => {
                    if (report.routeData) {
                      try {
                        const parsed = typeof report.routeData === 'string' ? JSON.parse(report.routeData) : report.routeData;
                        setActiveRoute(parsed);
                      } catch (e) {
                        console.error("Failed to parse route data", e);
                      }
                    } else {
                      setActiveRoute(null);
                    }
                  }
                }}
              >
                <Popup>
                  <div style={{ color: '#333', minWidth: '200px' }}>
                    <h4 style={{ margin: 0 }}>{report.title || report.category}</h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0', fontSize: '0.8rem', color: '#666' }}>
                      <User size={14} />
                      <span>Pelapor: {report.reporterName || 'Sistem AI'}</span>
                      {report.reporterTrust && (
                        <span style={{ background: '#e0f2f1', color: '#00796b', padding: '1px 4px', borderRadius: '4px' }}>
                          Score: {report.reporterTrust}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>{report.description}</p>

                    <div style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                      <div><strong>Status:</strong> {report.status}</div>
                      <div><strong>Priority:</strong> {report.priorityLevel}</div>
                    </div>

                    {/* VOTING SYSTEM */}
                    {report.source === 'user' && (
                      <div style={{ borderTop: '1px solid #eee', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>Verifikasi Laporan Ini:</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleVote(report.id, 'upvote')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: '#10b981', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}>
                            <CheckCircle size={14} /> {report.upvotes} Setuju
                          </button>
                          <button onClick={() => handleVote(report.id, 'downvote')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}>
                            <AlertTriangle size={14} /> {report.downvotes} Hoax
                          </button>
                        </div>
                      </div>
                    )}

                    {report.url && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <a href={report.url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.85rem' }}>Baca Berita Asli</a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MarkerClusterGroup>

        <MapNavigation
          setMapStyle={setMapStyle}
          mapStyle={mapStyle}
          onViewChange={onViewChange}
          detectLocation={detectLocation}
          showTraffic={showTraffic}
          setShowTraffic={setShowTraffic}
        />

        {activeRoute && Array.isArray(activeRoute) && (
          <Polyline
            positions={activeRoute.filter(wp => wp && (wp.lat || wp[0])).map(wp => {
              if (Array.isArray(wp)) return wp;
              return [wp.lat, wp.lng];
            })}
            color="#6366f1"
            weight={5}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
        {activeAngkotRoute && activeAngkotRoute.coords && (
          <Polyline
            positions={activeAngkotRoute.coords}
            color={getAngkotColor(activeAngkotRoute.warna_mobil)}
            weight={6}
            opacity={0.8}
            pathOptions={{ border: '2px solid white', lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        <MapFitter route={activeAngkotRoute} />
        {isRoutingMode && (
          <RoutingControl
            waypoints={currentRouteWaypoints}
            onWaypointsChange={setCurrentRouteWaypoints}
            travelMode={travelMode}
            onRouteFound={setRouteStats}
          />
        )}
      </MapContainer>

      {/* Smart Intelligence Panel (Localized & Collapsible) */}
      <div className="floating-panel">
        <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            onClick={() => {
              const newState = !showCriticalList;
              setShowCriticalList(newState);
              if (newState) resetAutoHideTimer();
            }}
            style={{
              padding: '0.6rem 0.8rem',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderBottom: showCriticalList ? '1px solid rgba(255,255,255,0.05)' : 'none',
              flexShrink: 0
            }}
          >
            <h3 style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={12} color={alertLocation ? (isTrackingMe ? '#3b82f6' : '#ef4444') : 'gray'} />
              <span style={{ color: isTrackingMe ? '#3b82f6' : '#ef4444' }}>
                {isTrackingMe ? 'Lokasi Saya' : 'Nama Lokasi'}: {regionName}
              </span>
            </h3>
            {showCriticalList ? <ChevronUp size={14} color="gray" /> : <ChevronDown size={14} color="gray" />}
          </div>

          {showCriticalList && (
            <div className="intel-scroll-container" style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ fontSize: '0.55rem', color: '#666', marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={10} /> Laporan Terdekat (Radius 5km)
              </div>

              {topCritical.length > 0 ? topCritical.map(issue => (
                <div key={issue.id} className="issue-card" style={{ padding: '0.5rem 0.6rem', background: 'rgba(255, 255, 255, 0.02)', borderLeft: `2px solid ${getPriorityColor(issue)}` }} onClick={() => onViewChange([issue.lat, issue.lng], 16)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div className="issue-title" style={{ fontSize: '0.7rem', fontWeight: 600 }}>{issue.category.toUpperCase()}</div>
                    <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 'bold' }}>
                      {issue.distance ? `${issue.distance.toFixed(1)} km` : '0.1 km'}
                    </div>
                  </div>
                  <div className="issue-meta" style={{ fontSize: '0.55rem', opacity: 0.6, marginTop: '2px' }}>{issue.priorityLevel} Risk • {issue.priorityScore} pts</div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '0.8rem', fontSize: '0.7rem', color: '#666' }}>
                  Safe Area. No reports found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      <div className="map-action-container">
        {/* Only show standard report option here if using dropdown model, but single report button is better now */}

        {!isRoutingMode ? (
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn-secondary" style={{ borderRadius: '8px', padding: '0.6rem 1.2rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', color: '#818cf8', boxShadow: 'var(--shadow-glass)', fontSize: '0.8rem' }} onClick={() => {
              setIsRoutingMode(true);
              setRouteStats(null); // Reset stats when entering mode
              const startPos = center || [-6.5971, 106.7997];
              const lat = Array.isArray(startPos) ? startPos[0] : startPos.lat;
              const lng = Array.isArray(startPos) ? startPos[1] : startPos.lng;
              setCurrentRouteWaypoints([
                { lat: lat, lng: lng },
                { lat: lat + 0.005, lng: lng + 0.005 } // Default destination to show markers immediately
              ]);
            }}>
              <Navigation size={14} /> Cari Rute Alternatif
            </button>

            <button className="btn-primary" style={{ borderRadius: '8px', padding: '0.6rem 1.2rem', boxShadow: 'var(--shadow-glass)', fontSize: '0.8rem' }} onClick={() => setIsModalOpen(true)}>
              <Plus size={14} /> Report Issue
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button 
              className="btn-secondary" 
              style={{ borderRadius: '8px', padding: '0.6rem 1.2rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.8rem', backdropFilter: 'blur(8px)' }} 
              onClick={() => {
                setIsRoutingMode(false);
                setRouteStats(null);
              }}
            >
              Batal
            </button>
            <button 
              className="btn-primary" 
              style={{ borderRadius: '8px', padding: '0.6rem 1.2rem', boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)', fontSize: '0.8rem', whiteSpace: 'nowrap' }} 
              onClick={() => setIsModalOpen(true)}
            >
              <CheckCircle size={16} /> Laporkan ke Publik
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ReportModal
          onClose={() => { setIsModalOpen(false); setIsRoutingMode(false); }}
          onSuccess={() => { setIsModalOpen(false); setIsRoutingMode(false); fetchData(); }}
          currentCenter={center}
          userId={user?.id}
          routeData={isRoutingMode ? currentRouteWaypoints : null}
        />
      )}
      {/* Routing UI Panel */}
      {isRoutingMode && (
        <RoutingPanel 
          onClose={() => {
            setIsRoutingMode(false);
            setRouteStats(null);
          }}
          onRouteSubmit={(waypoints, mode) => {
            setCurrentRouteWaypoints(waypoints);
            setTravelMode(mode);
          }}
          onPublish={() => setIsModalOpen(true)}
          routeStats={routeStats}
          initialWaypoints={currentRouteWaypoints}
        />
      )}

      {/* CCTV Live Video Player Overlay */}
      {activeStream && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '320px',
          zIndex: 2000,
          background: 'rgba(15, 15, 20, 0.95)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.7rem', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
              LIVE MONITOR: {regionName.toUpperCase()}
            </div>
            <X
              size={16}
              color="gray"
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveStream(null)}
            />
          </div>
          <video
            id="cctv-player"
            controls
            autoPlay
            muted
            style={{ width: '100%', display: 'block', background: 'black' }}
          ></video>
          <div style={{ padding: '0.6rem', fontSize: '0.6rem', color: '#666', textAlign: 'center' }}>
            Source: Bogor Single Window (BSW) • Realtime Stream
          </div>
          <style>{`
                        @keyframes pulse {
                            0% { opacity: 1; }
                            50% { opacity: 0.3; }
                            100% { opacity: 1; }
                        }
                    `}</style>
        </div>
      )}
    </div>
  );
};

const MapNavigation = ({ setMapStyle, mapStyle, onViewChange, detectLocation, showTraffic, setShowTraffic }) => {
  const map = useMap();
  const navRef = useRef(null);

  useEffect(() => {
    if (navRef.current) {
      L.DomEvent.disableClickPropagation(navRef.current);
      L.DomEvent.disableScrollPropagation(navRef.current);
    }
  }, []);

  return (
    <div className="map-navigation-toolbar" ref={navRef}>
      <div className="nav-control-block">
        <button onClick={() => map.zoomIn()} title="Zoom In"><Plus size={14} /></button>
        <button onClick={() => map.zoomOut()} title="Zoom Out"><Minus size={14} /></button>
        <button onClick={() => onViewChange([-2.5, 118.0], 5)} title="Reset View"><Home size={14} /></button>
      </div>

      <div className="nav-control-block" style={{ marginTop: '8px' }}>
        <button
          onClick={() => detectLocation(true)}
          title="Lokasi Saya"
          style={{ color: '#3b82f6' }}
        >
          <Navigation size={14} />
        </button>
      </div>

      <div className="nav-control-block" style={{ marginTop: '8px' }}>
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={showTraffic ? 'active' : ''}
          title="Live Traffic"
          style={{ color: showTraffic ? '#ef4444' : 'inherit' }}
        >
          <Route size={14} />
        </button>
      </div>

      <div className="nav-control-block" style={{ marginTop: '8px' }}>
        <button
          onClick={() => setMapStyle('dark')}
          className={mapStyle === 'dark' ? 'active' : ''}
          title="Dark Focus"
        >
          <MapIcon2 size={14} />
        </button>
        <button
          onClick={() => setMapStyle('satellite')}
          className={mapStyle === 'satellite' ? 'active' : ''}
          title="Satellite View"
        >
          <Layers size={14} />
        </button>
        <button
          onClick={() => setMapStyle('streets')}
          className={mapStyle === 'streets' ? 'active' : ''}
          title="Detailed Streets"
        >
          <Globe size={14} />
        </button>
      </div>
    </div>
  );
};

const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      const currentCenter = map.getCenter();
      const targetLat = center[0] || center.lat;
      const targetLng = center[1] || center.lng;
      
      // Hitung perbedaan koordinat
      const diff = Math.sqrt(
        Math.pow(currentCenter.lat - targetLat, 2) + 
        Math.pow(currentCenter.lng - targetLng, 2)
      );

      // Hanya panggil flyTo jika perbedaan signifikan (> ~10 meter) 
      // atau jika zoom level berbeda. Ini mencegah feedback loop saat geser manual.
      if (diff > 0.0001 || map.getZoom() !== zoom) {
        map.flyTo(center, zoom || map.getZoom(), {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }
  }, [center, zoom, map]);
  return null;
};

const getAngkotColor = (colorName) => {
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

const MapFitter = ({ route }) => {
  const map = useMap();
  useEffect(() => {
    if (route && route.coords && route.coords.length > 0) {
      try {
        const bounds = L.latLngBounds(route.coords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        console.error("Error fitting bounds", e);
      }
    }
  }, [route, map]);
  return null;
};

const BaseLayers = ({ mapStyle }) => {
  let url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  let maxZoom = 20;

  if (mapStyle === 'satellite') {
    url = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
  } else if (mapStyle === 'streets') {
    url = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  }

  return (
    <TileLayer
      url={url}
      maxZoom={maxZoom}
      maxNativeZoom={19}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    />
  );
};

const TrafficLayer = () => {
  const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;
  
  if (!tomtomKey) {
    console.error("TomTom API Key not found in .env");
    return null;
  }

  const trafficUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${tomtomKey}`;
  
  return (
    <TileLayer
      url={trafficUrl}
      maxZoom={22}
      opacity={0.8}
      zIndex={10}
    />
  );
};

export default MapDashboard;
