import React from 'react';

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

export default function Sidebar({ dialogs, activeId, onSelect }) {
  return (
    <div className="chat-list">
      {dialogs.map(d => (
        <div key={d.id} className={`chat-item ${d.id === activeId ? 'active' : ''}`} onClick={() => onSelect(d)}>
          <div className={`chat-avatar ${d.type}`} style={{ background: getAvatarColor(d.id) }}>
            {d.title?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="chat-info">
            <div className="chat-name">{d.title || 'Unknown'}</div>
            <div className="chat-preview">{d.lastMessage || 'No messages'}</div>
          </div>
          <div className="chat-meta">
            <span className="chat-time">{formatTime(d.lastMessageDate)}</span>
            {d.unreadCount > 0 && <span className="unread-badge">{d.unreadCount > 99 ? '99+' : d.unreadCount}</span>}
          </div>
        </div>
      ))}
      {dialogs.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          No dialogs found
        </div>
      )}
    </div>
  );
}
