import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import axios from 'axios';
import { API_URL } from '../utils/config';
import * as THREE from 'three';

const GlobeView = ({ showCCTV, isVisible }) => {
  const globeEl = useRef();
  const [reports, setReports] = useState([]);
  const [cctvs, setCCTVs] = useState([]);
  const [infrastructure, setInfrastructure] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, cctvRes, smartCityRes] = await Promise.all([
          axios.get(`${API_URL}/api/reports`),
          axios.get(`${API_URL}/api/cctvs`),
          axios.get(`${API_URL}/api/smart-city-data`)
        ]);

        setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
        setCCTVs(Array.isArray(cctvRes.data) ? cctvRes.data : []);
        setInfrastructure(smartCityRes.data?.infrastructure || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data for Globe', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      // Post-processing and camera setup
      globeEl.current.controls().autoRotate = isVisible;
      globeEl.current.controls().autoRotateSpeed = 0.5;

      // Initial position focused on Indonesia
      globeEl.current.pointOfView({ lat: -2.5489, lng: 118.0149, altitude: 2.5 }, 0);
    }
  }, [isVisible]);

  const getPriorityColor = (report) => {
    switch (report.priorityLevel) {
      case 'Critical': return '#ff0000';
      case 'High': return '#ff4d4d';
      case 'Medium': return '#ffa500';
      case 'Low': return '#00ff00';
      default: return '#6366f1';
    }
  };

  const globeData = [
    ...reports.map(r => ({
      lat: r.lat,
      lng: r.lng,
      altitude: 0.1,
      color: getPriorityColor(r),
      category: r.category.toLowerCase(),
      type: 'report'
    })),
    ...(showCCTV ? cctvs.map(c => ({
      lat: c.lat,
      lng: c.lng,
      altitude: 0.05,
      color: '#3b82f6',
      category: 'cctv',
      type: 'cctv'
    })) : [])
  ].filter(d => d.lat && d.lng);

  // Helper to generate custom 3D objects for each marker
  const getMarkerObject = (d) => {
    let geometry;
    const size = d.type === 'report' ? 0.35 : 0.2;

    switch (d.category) {
      case 'fire':
        geometry = new THREE.SphereGeometry(size);
        break;
      case 'crime':
        geometry = new THREE.OctahedronGeometry(size);
        break;
      case 'accident':
        geometry = new THREE.TetrahedronGeometry(size);
        break;
      case 'flood':
      case 'landslide':
        geometry = new THREE.IcosahedronGeometry(size, 0);
        break;
      case 'cctv':
        geometry = new THREE.CylinderGeometry(size, size, size * 0.2, 6);
        break;
      default:
        geometry = new THREE.BoxGeometry(size, size, size);
    }

    const material = new THREE.MeshPhongMaterial({
      color: d.color,
      transparent: true,
      opacity: 0.9,
      emissive: d.color,
      emissiveIntensity: 0.5,
      shininess: 100
    });

    return new THREE.Mesh(geometry, material);
  };

  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="globe-container" style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // Use objectsData for custom 3D shapes
        objectsData={globeData}
        objectLat="lat"
        objectLng="lng"
        objectAltitude="altitude"
        objectThreeObject={getMarkerObject}

        // Remove points and labels
        pointsData={[]}
        labelsData={[]}

        // Rings for critical/urgent reports
        // Rings only for CRITICAL reports to avoid clutter
        ringsData={reports.filter(r => r.priorityLevel === 'Critical').slice(0, 10)}
        ringLat="lat"
        ringLng="lng"
        ringColor={d => getPriorityColor(d)}
        ringMaxRadius={1.5}
        ringPropagationSpeed={0.5}
        ringRepeatPeriod={2000}
      />

      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', zIndex: 10, fontFamily: 'Space Grotesk' }}>
          DECODING INTEL DATA...
        </div>
      )}

      <div className="globe-legend glass-panel" style={{ position: 'absolute', bottom: '2rem', right: '2rem', padding: '1.2rem', pointerEvents: 'none', minWidth: '220px' }}>
        <h4 style={{ fontSize: '0.7rem', marginBottom: '0.8rem', opacity: 0.7, letterSpacing: '0.1em', textTransform: 'uppercase' }}>KETERANGAN SIMBOL</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 10, height: 10, background: '#ff0000', borderRadius: '50%', boxShadow: '0 0 10px #ff0000' }}></div>
            <span>KEBAKARAN / BAHAYA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 10, height: 10, background: '#ff4d4d', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
            <span>KRIMINALITAS / KEJAHATAN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 10px #3b82f6' }}></div>
            <span>PANTAUAN CCTV LANGSUNG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobeView;
