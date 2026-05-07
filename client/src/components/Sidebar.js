import React, { useState, useRef, useEffect } from 'react';

const COLORS = ['#7c5cfc', '#ff6b6b', '#2ed573', '#ffa502', '#1e90ff', '#ff6b81', '#a29bfe', '#fd79a8'];

function getAvatarColor(id) {
  let hash = 0;
  for (const c of (id || '')) hash = ((hash << 5) - hash) + c.charCodeAt(0);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date * 1000);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function Sidebar({ dialogs, activeId, onSelect, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const listRef = useRef(null);

  const handleTouchStart = (e) => {
    if (listRef.current && listRef.current.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = async (e) => {
    const diff = e.changedTouches[0].clientY - touchStart;
    if (diff > 100 && !refreshing) {
      setRefreshing(true);
      await onRefresh?.();
      setTimeout(() => setRefreshing(false), 500);
    }
    setTouchStart(0);
  };

  return (
    <div className="chat-list" ref={listRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      {refreshing && <div className="pull-indicator">🔄 Refreshing...</div>}
      {dialogs.map(d => (
        <div key={d.id} className={`chat-item ${d.id === activeId ? 'active' : ''}`} onClick={() => onSelect(d)}>
          <div className={`chat-avatar ${d.type}`} style={{ background: getAvatarColor(d.id) }}>
            {d.title?.charAt(0)?.toUpperCase() || '?'}
            <span className={d.online ? 'online-dot' : 'offline-dot'} />
          </div>
          <div className="chat-info">
            <div className="chat-name">
              {d.pinned ? '📌 ' : ''}{d.title || 'Unknown'}
            </div>
            <div className="chat-preview">{d.lastMessage || 'No messages'}</div>
          </div>
          <div className="chat-meta">
            <span className="chat-time">{formatTime(d.lastMessageDate)}</span>
            {d.unreadCount > 0 && <span className="unread-badge">{d.unreadCount > 99 ? '99+' : d.unreadCount}</span>}
          </div>
        </div>
      ))}
      {dialogs.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No dialogs</div>
      )}
    </div>
  );
}
