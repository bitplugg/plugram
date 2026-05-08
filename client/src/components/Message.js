import React, { useState, useRef } from 'react';
import PollView from './PollView';

function formatTime(ts) { return ts ? new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; }
function formatDate(ts) { return ts ? new Date(ts * 1000).toLocaleDateString() : ''; }

export default function Message({ msg, isOwn, onDelete, onReply, onForward, onProfile, onMediaOpen, onVidRate, onEdit }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg?.text || '');
  const videoRef = useRef(null);

  const handleMenu = (e) => { e.stopPropagation(); setMenu(!menu); };

  const handleAction = (action) => {
    setMenu(false);
    if (action === 'delete') onDelete?.(msg.id);
    if (action === 'reply') onReply?.(msg);
    if (action === 'forward') onForward?.(msg);
    if (action === 'profile') onProfile?.(msg.fromId);
    if (action === 'copy') navigator.clipboard.writeText(msg.text || '');
    if (action === 'edit') setEditing(true);
  };

  const handleEditSubmit = () => {
    onEdit?.(msg.id, editText);
    setEditing(false);
  };

  const isPoll = msg.media?.type === 'poll' || (msg.mediaType === 'poll');
  const isLocation = msg.media?.type === 'geo' || (msg.mediaData && msg.mediaType === 'location');
  const isVideo = msg.mediaType === 'video' || msg.mediaType === 'gif';
  const isPhoto = msg.mediaType === 'photo';
  const isVoice = msg.mediaType === 'voice';
  const isSticker = msg.mediaType === 'sticker';

  let locationData = null;
  if (isLocation) {
    try { locationData = typeof msg.mediaData === 'string' ? JSON.parse(msg.mediaData) : msg.mediaData; } catch {}
  }

  let pollData = null;
  if (isPoll) {
    try { pollData = typeof msg.media?.poll === 'object' ? msg.media.poll : (typeof msg.mediaData === 'string' ? JSON.parse(msg.mediaData) : msg.mediaData); } catch {}
  }

  const hasMedia = isPhoto || isVideo || isVoice || isSticker || msg.mediaType === 'file' || msg.mediaType === 'document';

  return (
    <div className={`message ${isOwn ? 'out' : 'in'} ${hasMedia || isPoll || isLocation ? 'media' : ''}`}
      style={{ position: 'relative' }}
      onContextMenu={(e) => { e.preventDefault(); setMenu(!menu); }}>

      {isPoll && pollData && (
        <PollView poll={pollData} />
      )}

      {isLocation && locationData && (
        <div className="location-message" style={{ cursor: 'pointer' }}
          onClick={() => window.open(`https://maps.google.com/maps?q=${locationData.lat},${locationData.lon}`, '_blank')}>
          <div style={{ fontSize: 32, textAlign: 'center' }}>📍</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            {locationData.lat?.toFixed(4)}, {locationData.lon?.toFixed(4)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--accent)', textAlign: 'center', marginTop: 4 }}>Open in Maps →</div>
        </div>
      )}

      {isPhoto && (
        <div className="message-media" style={{ cursor: 'pointer' }} onClick={() => onMediaOpen?.({ url: msg.mediaUrl, type: 'photo', caption: msg.text })}>
          {msg.mediaUrl ? <img src={msg.mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} /> : <div style={{ padding: 20, textAlign: 'center' }}>📷 Photo</div>}
        </div>
      )}

      {isVideo && (
        <div className="message-media" onClick={() => onMediaOpen?.({ url: msg.mediaUrl, type: 'video', id: msg.id, caption: msg.text })} style={{ cursor: 'pointer', position: 'relative' }}>
          <video ref={videoRef} src={msg.mediaUrl} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} preload="metadata" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff' }}>▶️</div>
          </div>
        </div>
      )}

      {isVoice && <div className="voice-message" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>🎤 <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Voice message</span></div>}

      {isSticker && <div className="sticker" style={{ fontSize: 60, textAlign: 'center' }}>{msg.text || '🎯'}</div>}

      {isPhoto && msg.text && <div className="message-text" style={{ marginTop: 4 }}>{msg.text}</div>}

      {!hasMedia && !isPoll && !isLocation && msg.text && (
        editing ? (
          <div style={{ padding: 8 }}>
            <input value={editText} onChange={e => setEditText(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="btn-icon" style={{ fontSize: 11 }} onClick={handleEditSubmit}>Save</button>
              <button className="btn-icon" style={{ fontSize: 11 }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="message-text">{msg.text}</div>
        )
      )}

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
          <button onClick={() => handleAction('edit')}>✏️ Edit</button>
          {isOwn && <button onClick={() => handleAction('delete')} style={{ color: 'var(--danger)' }}>🗑️ Delete</button>}
        </div>
      )}
    </div>
  );
}
