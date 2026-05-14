import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, LogIn, MessageSquare, ShieldAlert, CheckCircle, Shield } from 'lucide-react';
import { io } from 'socket.io-client';
import './CommunityChat.css';

const socket = io('http://localhost:3001');

// Helper to assign consistent colors to usernames
const getStringColor = (str) => {
  if (!str) return '#ffffff';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316'];
  return colors[Math.abs(hash) % colors.length];
};

const CommunityChat = ({ user, onLoginClick }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const fetchChats = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/chats');
      setMessages(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();

    // Listen for real-time messages
    socket.on('newMessage', (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate appending
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      socket.off('newMessage');
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user) return;

    const msg = inputMessage;
    setInputMessage('');

    // Send through WebSocket to broadcast instantly
    socket.emit('chatMessage', {
      userId: user.id,
      message: msg
    });
  };

  const getTrustBadge = (score) => {
    if (score >= 80) return <CheckCircle size={10} color="#10b981" title="Verified Citizen" />;
    if (score <= 30) return <ShieldAlert size={10} color="#ef4444" title="Low Trust" />;
    return null; // Don't show badge for normal users in compact mode to save space
  };

  return (
    <div className="live-chat-container">
      {/* Header */}
      <div className="live-chat-header">
        <MessageSquare size={16} color="#6366f1" />
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
          Warga Talk
        </h2>
        <div style={{ marginLeft: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
          <div style={{ width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
          LIVE
        </div>
      </div>

      {/* Message List (YouTube Style) */}
      <div className="live-chat-messages scrollable-content">
        {loading ? (
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2rem' }}>Connecting to live feed...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2rem' }}>Welcome to live chat!</div>
        ) : (
          messages.map((msg, index) => {
            const displayName = msg.userHandle || msg.userName || 'Anonymous';
            const nameColor = getStringColor(displayName);

            return (
              <div key={msg.id || index} className="live-chat-message-row">
                <div className="live-chat-author-section">
                  {getTrustBadge(msg.trustScore)}
                  <span className="live-chat-author-name" style={{ color: nameColor }}>
                    {displayName}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '4px' }}>:</span>
                </div>
                <div className="live-chat-content">
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="live-chat-input-area">
        {user ? (
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Chat..."
              className="live-chat-input"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="live-chat-send-btn"
            >
              <Send size={16} />
            </button>
          </form>
        ) : (
          <button onClick={onLoginClick} className="live-chat-login-prompt">
            <LogIn size={14} />
            Login to chat
          </button>
        )}
      </div>
    </div>
  );
};

export default CommunityChat;
