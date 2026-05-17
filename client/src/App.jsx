import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import MapDashboard from './components/MapDashboard';

import SituationBar from './components/SituationBar';
import GlobeView from './components/GlobeView';
import NewsMonitor from './components/NewsMonitor';
import AIChat from './components/AIChat';
import AngkotMonitor from './components/AngkotMonitor';
import { ShieldAlert, BarChart3, Map as MapIcon, LogIn, User, Fingerprint, AtSign, ShieldCheck, Lock, Eye, EyeOff, UserCheck, CheckCircle2, AlertCircle, Bot, Search, Loader2, Play, X as CloseIcon, ChevronUp, ChevronDown } from 'lucide-react';
import './index.css';
import logoImage from './assets/wargalyzer.png';
import { encryptAES, encryptChaCha20, decryptChaCha20 } from './utils/crypto';
import { API_URL } from './utils/config';

const Navigation = ({ showCCTV, setShowCCTV, user, logout, setShowLogin, setIsRegistering, onSearch, onAngkotSelect }) => {
  const location = useLocation();
  const isMapPage = location.pathname === '/';
  const [searchInput, setSearchInput] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setIsSearching(true);
    await onSearch(searchInput);
    setIsSearching(false);
    setSearchInput('');
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="logo">
          <img src={logoImage} alt="WargaLyzer Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            className="logo-img"
          />
          <span>WargaLyzer</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Live Map
          </Link>

        </div>
      </div>

      <div className="nav-right">
        <div className="nav-links">
          {isMapPage && (
            <div className="nav-intel-group">
              <form onSubmit={handleSubmit} className="nav-search-form">
                <input
                  type="text"
                  placeholder="Cari lokasi..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="nav-search-input"
                  disabled={isSearching}
                />
                <button type="submit" className="nav-search-btn" disabled={isSearching}>
                  {isSearching ? <Loader2 size={16} className="spinning" /> : <Search size={16} />}
                </button>
              </form>

              <AngkotMonitor onRouteSelect={onAngkotSelect} />

              <div className="nav-divider"></div>

              <div
                className={`nav-intel-link ${showCCTV ? 'active' : ''}`}
                onClick={() => setShowCCTV(!showCCTV)}
              >
                CCTV
              </div>
            </div>
          )}
        </div>

        <div className="auth-nav-section">
          {user ? (
            <div className="user-profile-nav">
              <div className="user-avatar-v2">
                <UserCheck size={14} />
              </div>
              <div className="user-info-v2">
                <span className="user-name-v2">{user.name}</span>
                <span className="user-role-v2">Active Citizen</span>
              </div>
              <button onClick={logout} className="logout-btn-v2" title="Logout">
                <LogIn size={16} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => { setIsRegistering(false); setShowLogin(true); }} className="nav-auth-btn login" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--acc-primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.5rem', fontWeight: 'bold' }}>
                <LogIn size={16} />
                Sign In
              </button>
              <button onClick={() => { setIsRegistering(true); setShowLogin(true); }} className="nav-auth-btn register" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.5rem', fontWeight: 'bold' }}>
                <LogIn size={16} />
                Create account
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

function App() {
  const [showCCTV, setShowCCTV] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('2D');
  const [mapFocus, setMapFocus] = React.useState({
    center: [-2.5, 118.0],
    zoom: 5
  });
  const [mapStyle, setMapStyle] = React.useState('satellite');
  const [isAIChatOpen, setIsAIChatOpen] = React.useState(false);
  const [activeAngkotRoute, setActiveAngkotRoute] = React.useState(null);
  const [alertLocation, setAlertLocation] = React.useState(null);
  const [isBottomBarOpen, setIsBottomBarOpen] = React.useState(false);

  // Auth State (Lifted)
  const [user, setUser] = React.useState(() => {
    try {
      const item = localStorage.getItem('civicsense_user');
      return item && item !== 'undefined' ? JSON.parse(item) : null;
    } catch (e) {
      localStorage.removeItem('civicsense_user');
      return null;
    }
  });
  const [showLogin, setShowLogin] = React.useState(false);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [loginData, setLoginData] = React.useState({
    ktpNumber: '',
    password: '',
    name: '',
    username: '',
    confirmPassword: '',
    identity: '' // For login: can be ktp or username
  });

  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) strength++;
    return strength; // 0-3
  };

  const isNikValid = loginData.ktpNumber ? loginData.ktpNumber.length === 16 : false;
  const passwordsMatch = loginData.password === loginData.confirmPassword;
  const passwordStrength = getPasswordStrength(loginData.password);

  const closeAuthModal = () => {
    setShowLogin(false);
    setIsRegistering(false);
    setLoginData({
      ktpNumber: '',
      password: '',
      name: '',
      username: '',
      confirmPassword: '',
      identity: ''
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {

      // Encrypt the entire payload using AES-128
      const payload = isRegistering ? {
        name: loginData.name,
        username: loginData.username,
        ktpNumber: loginData.ktpNumber,
        password: loginData.password
      } : {
        identity: loginData.identity,
        password: loginData.password
      };

      const encryptedPayload = encryptAES(payload);

      if (isRegistering) {
        if (!isNikValid) throw new Error('NIK (Nomor Induk) wajib berjumlah 16 digit');
        if (!passwordsMatch) throw new Error('Passwords do not match');
        if (passwordStrength < 2) throw new Error('Password is too weak');

        const res = await axios.post(`${API_URL}/api/auth/register`, { data: encryptedPayload });
        setUser(res.data);
        localStorage.setItem('civicsense_user', JSON.stringify(res.data));
      } else {
        const res = await axios.post(`${API_URL}/api/auth/login`, { data: encryptedPayload });
        setUser(res.data);
        localStorage.setItem('civicsense_user', JSON.stringify(res.data));
      }
      setShowLogin(false);
      setLoginData({ ktpNumber: '', password: '', name: '', username: '', confirmPassword: '', identity: '' });
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Auth failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('civicsense_user');
  };

  const handleLocationSearch = async (query) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      if (res.data && res.data.length > 0) {
        const { lat, lon } = res.data[0];
        setMapFocus({
          center: [parseFloat(lat), parseFloat(lon)],
          zoom: 16
        });
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error("Search failed", err);
    }
  };



  return (
    <Router>
      <div className="app-container">
        <Navigation
          showCCTV={showCCTV} setShowCCTV={setShowCCTV}
          user={user} logout={logout} setShowLogin={setShowLogin}
          setIsRegistering={setIsRegistering}
          onSearch={handleLocationSearch}
          onAngkotSelect={setActiveAngkotRoute}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SituationBar
            viewMode={viewMode}
            setViewMode={setViewMode}
            mapStyle={mapStyle}
            setMapStyle={setMapStyle}
          />
          <Routes>
            <Route path="/" element={
              <main className={`app-main-layout ${!isBottomBarOpen ? 'bottom-collapsed' : ''}`}>
                <div className="main-map-section" style={{ position: 'relative' }}>
                  <div style={{ display: 'contents' }}>
                    <MapDashboard
                      showCCTV={showCCTV}
                      center={mapFocus.center}
                      zoom={mapFocus.zoom}
                      onViewChange={(c, z, type, loc) => {
                        setMapFocus({ center: c, zoom: z });
                        if (loc) setAlertLocation(loc);
                      }}
                      mapStyle={mapStyle}
                      setMapStyle={setMapStyle}
                      activeAngkotRoute={activeAngkotRoute}
                      alertLocation={alertLocation}
                      setAlertLocation={setAlertLocation}
                      user={user}
                      onLoginClick={() => setShowLogin(true)}
                    />
                  </div>
                  {isAIChatOpen && (
                    <div style={{ position: 'absolute', top: '1rem', right: '4rem', zIndex: 1001, height: 'calc(100% - 2rem)', width: '380px' }}>
                      <AIChat
                        currentMapCenter={mapFocus.center}
                        onViewChange={(c, z, type) => {
                          if (type === 'close-ai') setIsAIChatOpen(false);
                          else if (c) setMapFocus({ center: c, zoom: z || 16 });
                        }}
                        regionName="AI Intel Hub"
                      />
                    </div>
                  )}
                </div>

                <div className={`bottom-monitor-section ${!isBottomBarOpen ? 'collapsed' : ''}`}>
                  <button
                    className={`bottom-toggle-handle ${!isBottomBarOpen ? 'collapsed' : ''}`}
                    onClick={() => setIsBottomBarOpen(!isBottomBarOpen)}
                    title={isBottomBarOpen ? "Hide Monitor" : "Show Monitor"}
                  >
                    {isBottomBarOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>

                  <div className="ai-hub-section" style={{
                    padding: isAIChatOpen ? '0' : '10px',
                    justifyContent: isAIChatOpen ? 'flex-start' : 'center',
                  }}>
                    {!isAIChatOpen ? (
                      <div
                        className={`ai-monitor-launcher`}
                        onClick={() => setIsAIChatOpen(true)}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '16px',
                          background: '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <Bot size={28} color="white" />
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        padding: '12px 20px',
                        borderRadius: '12px',
                        color: '#c7d2fe',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        letterSpacing: '0.05em',
                        animation: 'pulse 2s infinite'
                      }}>
                        <Bot size={18} color="#818cf8" />
                        KawanLyzer sedang membantu...
                      </div>
                    )}
                  </div>

                  <NewsMonitor
                    onLocate={(lat, lng) => setMapFocus({ center: [lat, lng], zoom: 16 })}
                    user={user}
                    onLoginClick={() => setShowLogin(true)}
                  />
                </div>
              </main>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Premium Auth Modal */}
        {showLogin && (
          <div className="auth-overlay" onClick={closeAuthModal}>
            <div
              className={`auth-modal-premium ${isRegistering ? 'register-mode' : ''}`}
              onClick={e => e.stopPropagation()}
            >
              <button className="auth-close-btn" onClick={closeAuthModal}>
                <CloseIcon size={20} />
              </button>

              <div className="auth-logo-circle">
                <img src={logoImage} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} />
              </div>

              <h2 className="auth-header-title">
                {isRegistering ? 'Sign up for WargaLyzer' : 'Sign in to WargaLyzer'}
              </h2>
              <p className="auth-header-subtitle">
                {isRegistering ? 'Join the community and start exploring smarter city insights' : 'Welcome back! Please sign in to continue and access'}
              </p>

              <form onSubmit={handleAuth} className="auth-form-v2">
                {isRegistering ? (
                  <>
                    <div className="auth-input-group">
                      <label className="auth-label-v2">Full Name</label>
                      <input
                        className="auth-input-v2"
                        type="text"
                        placeholder="Enter your full name"
                        value={loginData.name}
                        onChange={e => setLoginData({ ...loginData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="auth-input-group">
                      <label className="auth-label-v2">NIK</label>
                      <input
                        className={`auth-input-v2 ${loginData.ktpNumber.length > 0 && !isNikValid ? 'error' : ''}`}
                        type="text"
                        maxLength="16"
                        placeholder="Enter your 16-digit NIK"
                        value={loginData.ktpNumber}
                        onChange={e => setLoginData({ ...loginData, ktpNumber: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                      {loginData.ktpNumber.length > 0 && loginData.ktpNumber.length < 16 && (
                        <div style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={10} />
                          NIK wajib 16 digit (Kurang {16 - loginData.ktpNumber.length} angka lagi)
                        </div>
                      )}
                    </div>

                    <div className="auth-input-group">
                      <label className="auth-label-v2">Username</label>
                      <input
                        className="auth-input-v2"
                        type="text"
                        placeholder="Enter your username"
                        value={loginData.username}
                        onChange={e => setLoginData({ ...loginData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="auth-input-group">
                    <label className="auth-label-v2">Username or NIK</label>
                    <input
                      className="auth-input-v2"
                      type="text"
                      placeholder="Enter NIK or Username"
                      value={loginData.identity}
                      onChange={e => setLoginData({ ...loginData, identity: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="auth-input-group">
                  <label className="auth-label-v2">
                    {isRegistering ? 'Password' : 'Password'}
                  </label>
                  <input
                    className="auth-input-v2"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                  {isRegistering && (
                    <div
                      className={`strength-meter ${passwordStrength === 1 ? 'weak' : passwordStrength === 2 ? 'medium' : passwordStrength === 3 ? 'strong' : ''}`}
                      style={{ marginTop: '12px' }}
                    >
                      <div className="strength-segment"></div>
                      <div className="strength-segment"></div>
                      <div className="strength-segment"></div>
                    </div>
                  )}
                </div>

                {isRegistering && (
                  <div className="auth-input-group">
                    <label className="auth-label-v2">Confirm Password</label>
                    <input
                      className={`auth-input-v2 ${loginData.confirmPassword.length > 0 && !passwordsMatch ? 'error' : ''}`}
                      type="password"
                      placeholder="Repeat your password"
                      value={loginData.confirmPassword}
                      onChange={e => setLoginData({ ...loginData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-btn-neo"
                  disabled={isRegistering && (!isNikValid || !passwordsMatch || passwordStrength < 2)}
                >
                  <span>Continue</span>
                  <Play size={16} fill="currentColor" />
                </button>

                <div className="auth-footer">
                  {isRegistering ? "Already have an account? " : "Don't have an account? "}
                  <span
                    className="auth-link"
                    onClick={() => setIsRegistering(!isRegistering)}
                  >
                    {isRegistering ? 'Sign in' : 'Sign up'}
                  </span>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
