import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { API_URL } from '../utils/config';
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


const createUserIcon = () => {
  return new L.DivIcon({
    className: 'custom-user-icon',
    html: `
      <div style="background-color: #6366f1; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); position: relative;">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 1.5px solid #6366f1; animation: user-pulse-premium 2.5s infinite; pointer-events: none;"></div>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
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
  const [isRoutingMode, setIsRoutingMode] = useState(true);
  const [currentRouteWaypoints, setCurrentRouteWaypoints] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTomTomWarning, setShowTomTomWarning] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPath, setDrawingPath] = useState([]);

  // Routing Panel States
  const [routeStats, setRouteStats] = useState(null);
  const [travelMode, setTravelMode] = useState('car');
  const [myLocation, setMyLocation] = useState(null);



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

      let cityLower = city.toLowerCase();
      let translatedCity = city;
      if (cityLower.includes('south jakarta')) translatedCity = 'Jakarta Selatan';
      else if (cityLower.includes('north jakarta')) translatedCity = 'Jakarta Utara';
      else if (cityLower.includes('west jakarta')) translatedCity = 'Jakarta Barat';
      else if (cityLower.includes('east jakarta')) translatedCity = 'Jakarta Timur';
      else if (cityLower.includes('central jakarta')) translatedCity = 'Jakarta Pusat';

      const fullPlace = [road, suburb, translatedCity].filter(Boolean).join(', ');
      setRegionName(fullPlace || 'Lokasi Tidak Diketahui');
    } catch (err) {
      console.error('Reverse Geocode failed', err);
      setRegionName('Area Terdeteksi');
    }
  };

  const fetchData = async (loc = alertLocation, autoExpand = false) => {
    try {
      const mainRes = await axios.get(`${API_URL}/api/reports`);
      const rawReports = Array.isArray(mainRes.data) ? mainRes.data : (mainRes.data?.Reports || mainRes.data?.reports || []);
      const allReports = Array.isArray(rawReports) ? rawReports.map(r => ({
        ...r,
        lat: parseFloat(r?.lat || r?.Lat || r?.latitude || 0),
        lng: parseFloat(r?.lng || r?.Lng || r?.longitude || 0)
      })) : [];

      // Filter reports within 5 km radius of loc. If no loc (app just opened), show 0 markers.
      let filteredReports = [];
      if (loc && loc.lat && loc.lng) {
        filteredReports = allReports.filter(r => {
          if (!r.lat || !r.lng) return false;
          const R = 6371; // km
          const dLat = (r.lat - loc.lat) * Math.PI / 180;
          const dLon = (r.lng - loc.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(loc.lat * Math.PI / 180) * Math.cos(r.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return distance <= 5;
        });
      }

      // Fetch localized top-critical alerts
      const queryParams = loc ? `?lat=${loc.lat}&lng=${loc.lng}` : '';
      const criticalRes = await axios.get(`${API_URL}/api/reports/top-critical${queryParams}`);

      const rawCritical = Array.isArray(criticalRes.data) ? criticalRes.data : (criticalRes.data?.Reports || criticalRes.data?.reports || []);
      const fetchedReports = Array.isArray(rawCritical) ? rawCritical.map(r => ({
        ...r,
        lat: parseFloat(r?.lat || r?.Lat || r?.latitude || 0),
        lng: parseFloat(r?.lng || r?.Lng || r?.longitude || 0)
      })) : [];
      setReports(filteredReports);
      setTopCritical(fetchedReports);

      // Fetch CCTV data
      const cctvRes = await axios.get(`${API_URL}/api/cctvs`);
      const rawCCTVs = Array.isArray(cctvRes.data) ? cctvRes.data : (cctvRes.data?.CCTVs || cctvRes.data?.cctvs || []);

      const referenceLoc = loc || { lat: center[0] || center.lat, lng: center[1] || center.lng };

      const cameras = Array.isArray(rawCCTVs) ? rawCCTVs.map(c => ({
        ...c,
        lat: parseFloat(c?.lat || c?.Lat || c?.latitude || 0),
        lng: parseFloat(c?.lng || c?.Lng || c?.longitude || 0)
      })).filter(c => {
        if (!c.lat || !c.lng || !referenceLoc) return false;
        const R = 6371;
        const dLat = (c.lat - referenceLoc.lat) * Math.PI / 180;
        const dLon = (c.lng - referenceLoc.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(referenceLoc.lat * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return d <= 5; // Radius 5km
      })
        : [];
      setCCTVs(cameras);

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
      const res = await axios.get(`${API_URL}/api/smart-city-data`);
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
        setMyLocation({ lat: latitude, lng: longitude });
        onViewChange([latitude, longitude], 13, 'detect'); // Tidak pass initialLoc agar marker tidak muncul di awal
        fetchRegionName(latitude, longitude);
        fetchSmartCityData();
        fetchData(null, false);
      },
      (error) => {
        console.error(error);
        fetchSmartCityData();
        fetchData(null, false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (showCCTV) fetchData(alertLocation);
  }, [showCCTV]);

  useEffect(() => {
    fetchData(alertLocation);
  }, [alertLocation]);

  useEffect(() => {
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
      await axios.post(`${API_URL}/api/reports/${reportId}/vote`, {
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
        if (isDrawingMode) {
          setDrawingPath(prev => [...prev, [lat, lng]]);
          return;
        }
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

  const MapResizeHandler = () => {
    const map = useMap();
    useEffect(() => {
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(map.getContainer());
      return () => resizeObserver.disconnect();
    }, [map]);
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
        <MapResizeHandler />
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
                <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '6px', marginBottom: '12px' }}>Titik Fokus Pantauan</div>

              </div>
            </Popup>
          </Marker>
        )}

        {/* USER LOCATION MARKER (Blue Pulse) */}
        {myLocation && (
          <Marker
            position={[myLocation.lat, myLocation.lng]}
            icon={createUserIcon()}
            zIndexOffset={1100}
          >
            <Popup>
              <div style={{ color: '#333', fontSize: '0.8rem', fontWeight: 'bold' }}>
                Lokasi Anda Sekarang
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
        {/* Direct Marker Rendering (No Clustering to avoid production rendering bugs) */}
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


        <MapNavigation
          setMapStyle={setMapStyle}
          mapStyle={mapStyle}
          onViewChange={onViewChange}
          detectLocation={detectLocation}
          showTraffic={showTraffic}
          setShowTraffic={setShowTraffic}
          setShowTomTomWarning={setShowTomTomWarning}
        />

        {isDrawingMode && drawingPath.length > 0 && (
          <Polyline
            positions={drawingPath}
            color="#f59e0b"
            weight={6}
            opacity={0.9}
            dashArray="5, 10"
            pathOptions={{ lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {isDrawingMode && drawingPath.map((pt, idx) => (
          <Marker
            key={`draw-pt-${idx}`}
            position={pt}
            icon={L.divIcon({
              className: 'custom-draw-marker',
              html: `<div style="background-color: #f59e0b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(245, 158, 11, 0.8);"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })}
          />
        ))}

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
            <h3 style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <button
            className="btn-primary"
            style={{ 
              borderRadius: '8px', 
              padding: '0.6rem 1.2rem', 
              boxShadow: 'var(--shadow-glass)', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              border: 'none'
            }}
            onClick={() => {
              setIsDrawingMode(false);
              setIsRoutingMode(false);
              setIsModalOpen(true);
            }}
          >
            <Plus size={14} /> Lapor Kejadian
          </button>

          <button
            className="btn-primary"
            style={{ 
              borderRadius: '8px', 
              padding: '0.6rem 1.2rem', 
              boxShadow: 'var(--shadow-glass)', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              background: isDrawingMode ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              transition: 'all 0.3s'
            }}
            onClick={() => {
              if (isDrawingMode) {
                setIsDrawingMode(false);
                setDrawingPath([]);
              } else {
                setIsDrawingMode(true);
                setDrawingPath([]);
                setIsRoutingMode(false);
                alert("Mode Menggambar Aktif: Silakan klik beberapa kali pada peta untuk menggambar garis jalan alternatif Anda secara bebas.");
              }
            }}
          >
            <Route size={14} /> 
            {isDrawingMode ? 'Batal Gambar' : 'Gambar Jalan Alternatif'}
          </button>
        </div>
      </div>

      {isModalOpen && (
        <ReportModal
          onClose={() => { setIsModalOpen(false); }}
          onSuccess={() => { 
            setIsModalOpen(false); 
            setIsDrawingMode(false); 
            setDrawingPath([]); 
            fetchData(); 
          }}
          currentCenter={center}
          userId={user?.id}
          routeData={isDrawingMode ? drawingPath : (isRoutingMode ? currentRouteWaypoints : null)}
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
          myLocation={myLocation}
          alertLocation={alertLocation}
          center={center}
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
              LIVE MONITOR: {regionName}
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

      {showTomTomWarning && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '380px',
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 15, 20, 0.95)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <ShieldAlert size={24} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'white', fontWeight: '600', margin: 0 }}>
                API Key Belum Dikonfigurasi
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Fitur <strong>Live Traffic</strong> memerlukan <strong>TomTom API Key</strong> yang valid untuk memuat data kemacetan lalu lintas secara real-time.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '0.6rem',
              width: '100%',
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.6)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div><strong>Solusi Pemilik App:</strong></div>
              <div>1. Dapatkan API Key gratis di <a href="https://developer.tomtom.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>developer.tomtom.com</a></div>
              <div>2. Tambahkan variabel lingkungan ini ke file <code>.env</code> Anda:</div>
              <code style={{ background: '#000', padding: '4px 6px', borderRadius: '4px', fontSize: '0.65rem', display: 'block', color: '#a5b4fc', wordBreak: 'break-all', marginTop: '4px' }}>
                VITE_TOMTOM_API_KEY=kRAo0gzd7MIGCivBHuEAys691UAknLnJ
              </code>
            </div>

            <button
              onClick={() => setShowTomTomWarning(false)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: 'var(--acc-primary)',
                color: 'white',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {isDrawingMode && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '400px',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div className="glass-panel" style={{
            padding: '1rem',
            background: 'rgba(15, 15, 20, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f59e0b',
                animation: 'drawPulse 1.5s infinite'
              }}></div>
              <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: '600' }}>
                Mode Menggambar Jalan Alternatif
              </div>
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Klik pada peta secara berurutan untuk membentuk rute jalan alternatif Anda sendiri tanpa batasan jalan resmi.
            </p>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'rgba(255, 255, 255, 0.02)', 
              padding: '6px 12px', 
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#f59e0b',
              fontWeight: '600'
            }}>
              <span>Titik Koordinat:</span>
              <span>{drawingPath.length} Titik</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={drawingPath.length === 0}
                onClick={() => setDrawingPath(prev => prev.slice(0, -1))}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: drawingPath.length === 0 ? 'rgba(255,255,255,0.2)' : 'white',
                  fontSize: '0.7rem',
                  cursor: drawingPath.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                Undo
              </button>

              <button
                disabled={drawingPath.length === 0}
                onClick={() => setDrawingPath([])}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: drawingPath.length === 0 ? 'rgba(239,68,68,0.2)' : '#fca5a5',
                  fontSize: '0.7rem',
                  cursor: drawingPath.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                Reset
              </button>

              <button
                disabled={drawingPath.length < 2}
                onClick={() => {
                  if (!user) {
                    setShowLogin(true);
                    return;
                  }
                  setIsModalOpen(true);
                }}
                style={{
                  flex: 1.5,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  border: 'none',
                  color: drawingPath.length < 2 ? 'rgba(255,255,255,0.3)' : 'white',
                  fontSize: '0.7rem',
                  cursor: drawingPath.length < 2 ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  boxShadow: drawingPath.length < 2 ? 'none' : '0 4px 12px rgba(217, 119, 6, 0.3)'
                }}
              >
                Laporkan Jalan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MapNavigation = ({ setMapStyle, mapStyle, onViewChange, detectLocation, showTraffic, setShowTraffic, setShowTomTomWarning }) => {
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
          onClick={() => {
            const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY;
            if (!tomtomKey) {
              setShowTomTomWarning(true);
            } else {
              setShowTraffic(!showTraffic);
            }
          }}
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
