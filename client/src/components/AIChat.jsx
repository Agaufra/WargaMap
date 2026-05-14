import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, MapPin, X, Navigation } from 'lucide-react';
import '../AIChat.css';

const AIChat = ({ currentMapCenter, onViewChange, regionName }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya Kawan Lyzer, teman analisis lokasi Anda. Beritahu saya apa yang Anda cari (Misal: "Rekomendasi tempat wisata terdekat" atau "Tempat makan enak di sini") agar saya bisa bantu temukan.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3001/api/ai/recommend', {
        query: userMessage.content,
        currentMapCenter: currentMapCenter
      });

      if (response.data.recommendations) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          type: 'recommendation',
          content: 'Berikut hasil pencarian saya untuk area ini:',
          data: response.data.recommendations
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.error || "Maaf, saya tidak dapat menemukan rekomendasi saat ini."
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Terjadi kesalahan saat menghubungi server AI.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLocation = (lat, lng) => {
    onViewChange([lat, lng], 16);
  };

  return (
    <div className="ai-chat-floating-container">
      <div className="ai-chat-header">
        <div className="bot-label">
          <Bot size={18} color="#6366f1" />
          <span>KAWAN LYZER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>{regionName}</div>
          <button
            onClick={() => onViewChange(null, null, 'close-ai')}
            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="ai-chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="message-bubble">
              {msg.content}

              {/* Render Recommendation Cards */}
              {msg.type === 'recommendation' && msg.data && (
                <div className="recommendation-list">
                  {msg.data.map((rec, i) => (
                    <div key={i} className="recommendation-card" onClick={() => navigateToLocation(rec.lat, rec.lng)}>
                      <div className="rec-header">
                        <strong>{rec.name}</strong>
                        <span className="rec-category">{rec.category}</span>
                      </div>
                      <p className="rec-desc">{rec.description}</p>
                      <button className="rec-nav-btn">
                        <Navigation size={12} /> Lihat di Peta
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant">
            <div className="message-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="ai-chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cari wisata atau kuliner..."
          className="ai-chat-input"
          disabled={isLoading}
        />
        <button type="submit" className="ai-chat-send-btn" disabled={isLoading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default AIChat;
