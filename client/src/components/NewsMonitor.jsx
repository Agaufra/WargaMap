import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/config';
import { Radio, AlertTriangle, Cloud, Sun, CloudRain, CloudLightning, Wind, Droplets, CloudFog } from 'lucide-react';
import CommunityChat from './CommunityChat';

const NewsMonitor = ({ onLocate, user, onLoginClick }) => {
  const [reports, setReports] = useState([]);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/reports`);
        const data = Array.isArray(res.data) ? res.data : [];
        setReports(data.slice(0, 50));
      } catch (err) {
        console.error('Error fetching intel feed', err);
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let lat = -6.2088; // Default to Jakarta
    let lng = 106.8456;

    const fetchWeather = async (latitude, longitude) => {
      try {
        const res = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`);
        setWeather(res.data.current);
      } catch (err) {
        console.error('Failed to fetch weather', err);
      }
    };

    const initWeather = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            fetchWeather(lat, lng);
          },
          (error) => {
            console.warn("Geolocation failed or denied, using default fallback.", error);
            fetchWeather(lat, lng);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        fetchWeather(lat, lng);
      }
    };

    initWeather();
    const interval = setInterval(() => fetchWeather(lat, lng), 300000); // refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

  const getWeatherDetails = (code) => {
    if (code === 0) return { desc: 'Clear Sky', icon: <Sun size={38} color="#facc15" /> };
    if ([1, 2, 3].includes(code)) return { desc: 'Partly Cloudy', icon: <Cloud size={38} color="#9ca3af" /> };
    if ([45, 48].includes(code)) return { desc: 'Low Vis Fog', icon: <CloudFog size={38} color="#9ca3af" /> };
    if ([51, 53, 55, 56, 57].includes(code)) return { desc: 'Light Drizzle', icon: <CloudRain size={38} color="#60a5fa" /> };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { desc: 'Rainfall', icon: <CloudRain size={38} color="#3b82f6" /> };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { desc: 'Snowfall', icon: <Cloud size={38} color="#ffffff" /> };
    if ([95, 96, 99].includes(code)) return { desc: 'Thunderstorm', icon: <CloudLightning size={38} color="#a855f7" /> };
    return { desc: 'Unknown', icon: <Cloud size={38} color="#9ca3af" /> };
  };

  const getPriorityColor = (level) => {
    switch (level) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      default: return '#3b82f6';
    }
  };

  const handleItemClick = (report) => {
    if (report.lat && report.lng && onLocate) {
      onLocate(report.lat, report.lng);
    }
  };

  return (
    <div className="news-monitor-container">
      {/* Left Area: Community Chat (Replaced News Stream) */}
      <div className="news-video-section" style={{ background: 'transparent' }}>
        <CommunityChat user={user} onLoginClick={onLoginClick} />
      </div>

      {/* Center Area: Climate Insight */}
      <div className="weather-section">
        <div className="weather-header">
          <Cloud size={14} style={{ color: '#3b82f6' }} />
          <span>INFO CUACA</span>
        </div>
        <div className="weather-content">
          {weather ? (() => {
            const details = getWeatherDetails(weather.weather_code);
            return (
              <>
                <div className="weather-main">
                  <div>
                    <div className="weather-temp">{Math.round(weather.temperature_2m)}°C</div>
                    <div className="weather-desc">{details.desc}</div>
                  </div>
                  {details.icon}
                </div>
                <div className="weather-details">
                  <div className="weather-item">
                    <div className="weather-label">
                      <Droplets size={12} color="rgba(255,255,255,0.5)" /> Humidity
                    </div>
                    <div className="weather-val">{weather.relative_humidity_2m}%</div>
                  </div>
                  <div className="weather-item">
                    <div className="weather-label">
                      <Wind size={12} color="rgba(255,255,255,0.5)" /> Wind Speed
                    </div>
                    <div className="weather-val">{weather.wind_speed_10m} km/h</div>
                  </div>
                </div>
              </>
            );
          })() : (
            <div style={{ textAlign: 'center', fontSize: '0.7rem', opacity: 0.5 }}>Syncing satellites...</div>
          )}
        </div>
      </div>

      {/* Right Area: Intel Feed */}
      <div className="intel-feed-section">
        <div className="intel-feed-header">
          <Radio size={14} style={{ color: '#ef4444' }} />
          <span>KABAR SEKITAR</span>
        </div>
        <div className="intel-list">
          {reports.map((report) => (
            <div
              key={report.id}
              className="intel-item-row"
              style={{
                borderLeftColor: getPriorityColor(report.priorityLevel),
                cursor: (report.lat && report.lng) ? 'pointer' : 'default',
                opacity: (report.lat && report.lng) ? 1 : 0.6
              }}
              onClick={() => handleItemClick(report)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="intel-cat">{report.category.toUpperCase()}</span>
                <span className="intel-time">
                  {new Date(report.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="intel-title">{report.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Source: {report.source.toUpperCase()}</div>
                {report.priorityLevel === 'Critical' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.65rem', fontWeight: 'bold' }}>
                    <AlertTriangle size={10} /> CRITICAL
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsMonitor;
