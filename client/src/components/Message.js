import React, { useState } from 'react';

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Message({ msg, isOwn, onDelete, onReply, onForward, onProfile }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const hasMedia = msg.mediaType && msg.mediaType !== 'null' && msg.mediaType !== null;

  const handleMenu = (e) => {
    e.stopPropagation();
    setMenu(!menu);
  };

  const handleAction = (action) => {
    setMenu(false);
    if (action === 'delete') onDelete?.(msg.id);
    if (action === 'reply') onReply?.(msg);
    if (action === 'forward') onForward?.(msg);
    if (action === 'profile') onProfile?.(msg.fromId);
    if (action === 'copy') navigator.clipboard.writeText(msg.text || '');
  };

  return (
    <div className={`message ${isOwn ? 'out' : 'in'} ${hasMedia ? 'media' : ''}`}
      style={{ position: 'relative' }}
      onContextMenu={(e) => { e.preventDefault(); setMenu(!menu); }}>
      {hasMedia && (
        <div className="message-media-placeholder">
          {msg.mediaType === 'photo' ? '📷 Photo' :
           msg.mediaType === 'voice' ? '🎤 Voice' :
           msg.mediaType === 'video' ? '🎥 Video' :
           msg.mediaType === 'sticker' ? '🎯 Sticker' :
           msg.mediaType === 'file' ? (() => {
             try { return `📄 ${JSON.parse(msg.mediaData).fileName || 'File'}`; }
             catch { return '📄 File'; }
           })() : '📎 Media'}
        </div>
      )}
      {msg.text && <div className="message-text">{msg.text}</div>}
      <div className="message-meta">
        {msg.edited ? <span>edited</span> : null}
        <span>{formatTime(msg.date)}</span>
        {isOwn && <span>{msg.status === 'sending' ? '○' : '✓✓'}</span>}
        <span style={{ cursor: 'pointer', fontSize: 12 }} onClick={handleMenu}>⋮</span>
      </div>

      {menu && (
        <div className="msg-actions glass">
          <button onClick={() => handleAction('reply')}>💬 Reply</button>
          <button onClick={() => handleAction('forward')}>📨 Forward</button>
          <button onClick={() => handleAction('copy')}>📋 Copy</button>
          <button onClick={() => handleAction('profile')}>👤 Profile</button>
          {isOwn && <button onClick={() => handleAction('delete')} style={{ color: 'var(--danger)' }}>🗑️ Delete</button>}
        </div>
      )}
    </div>
  );
}
