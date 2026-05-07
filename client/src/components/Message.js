import React from 'react';

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Message({ msg, isOwn, onDelete }) {
  const hasMedia = msg.mediaType && msg.mediaType !== 'null' && msg.mediaType !== null;

  return (
    <div className={`message ${isOwn ? 'out' : 'in'} ${hasMedia ? 'media' : ''}`}>
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
      </div>
    </div>
  );
}
