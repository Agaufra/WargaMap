import React, { useState } from 'react';
import axios from 'axios';
import { X, Send, MapPin, Camera, ShieldAlert } from 'lucide-react';

const ReportModal = ({ onClose, onSuccess, currentCenter, userId, routeData }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: routeData ? 'alternative_route' : 'garbage',
    description: '',
    lat: currentCenter[0], 
    lng: currentCenter[1],
    image: '',
    routeData: routeData || null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fungsi untuk menghitung jarak antara dua koordinat (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius bumi dalam KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Hasil dalam Meter
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      setError("Silakan login untuk mengirim laporan.");
      return;
    }

    setLoading(true);
    setError(null);

    // 1. VALIDASI GPS LOKASI (GPS LOCK)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        const distance = calculateDistance(userLat, userLng, formData.lat, formData.lng);

        // Jika jarak lebih dari 500 meter, anggap tidak valid
        if (distance > 500) {
          setError(`Validasi Lokasi Gagal! Anda berada ${Math.round(distance)}m dari lokasi kejadian. Anda harus berada di lokasi untuk melapor.`);
          setLoading(false);
          return;
        }

        try {
          // 2. KIRIM LAPORAN KE SERVER
          await axios.post('http://localhost:3001/api/reports', {
            ...formData,
            userId: userId,
            title: formData.category === 'alternative_route' 
              ? `RUTE: ${formData.description.substring(0, 20)}...`
              : `${formData.category.toUpperCase()} at ${formData.lat.toFixed(4)}, ${formData.lng.toFixed(4)}`
          });
          onSuccess();
        } catch (err) {
          const message = err.response?.data?.error || 'Gagal mengirim laporan';
          setError(message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Gagal mengakses GPS. Izin lokasi diperlukan untuk validasi kejujuran laporan.");
        setLoading(false);
      }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '90%', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Validasi Laporan AI</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Sistem akan memverifikasi lokasi GPS dan identitas Anda untuk mencegah Hoax.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Kategori Masalah</label>
            <select 
              className="form-control" 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              required
            >
              <option value="garbage">Sampah / Limbah</option>
              <option value="street light">Lampu Jalan Mati</option>
              <option value="road damage">Jalan Rusak / Lubang</option>
              <option value="flood">Banjir / Genangan</option>
              <option value="crime">Kriminal / Keamanan</option>
              <option value="fire">Kebakaran</option>
              <option value="alternative_route">Rute Alternatif / Jalur Baru</option>
            </select>
          </div>
          
          {routeData && (
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', color: '#818cf8', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, background: '#6366f1', borderRadius: '50%' }}></div>
              Jalur Rute Alternatif Terlampir ({routeData.length} Titik)
            </div>
          )}
          
          <div className="form-group">
            <label>Deskripsi Singkat</label>
            <textarea 
              className="form-control" 
              rows="3"
              placeholder="Ceritakan sedikit detail kejadiannya..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Lokasi Kejadian (GPS Locked)</label>
            <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
              <MapPin size={16} color="#3b82f6" />
              <span style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: 'bold' }}>
                {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
              </span>
            </div>
          </div>
          
          <div className="form-group">
            <label>Bukti Foto (Real-time Upload)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label className="btn-primary" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', flex: 1, padding: '0.8rem' }}>
                <Camera size={18} />
                <span>Ambil / Upload Foto</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} required />
              </label>
              {formData.image && (
                <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #3b82f6' }}>
                  <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }} disabled={loading}>
            <Send size={18} />
            {loading ? 'Memvalidasi Lokasi & Mengirim...' : 'Kirim Laporan Terverifikasi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
