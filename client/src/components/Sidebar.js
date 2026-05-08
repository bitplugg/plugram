import React, { useState, useRef, useEffect } from 'react';
import { dialogs as dlgApi, actions as actApi } from '../api';

export default function Sidebar({ dialogs, onSelect, onNewChat, onSettings, search, setSearch, searchResults, onSearchSelect, activeDialog, onSavedMessages }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [contextDialog, setContextDialog] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const handleContext = (e, d) => {
    e.preventDefault();
    setContextDialog(d);
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleAction = async (action) => {
    if (!contextDialog) return;
    try {
      if (action === 'mute') await actApi.mute(contextDialog.id, true);
      if (action === 'unmute') await actApi.mute(contextDialog.id, false);
      if (action === 'archive') {
        await actApi.archive(contextDialog.id, true);
        setShowArchived(true);
      }
      if (action === 'unarchive') await actApi.archive(contextDialog.id, false);
      if (action === 'pin') await dlgApi.pin(contextDialog.id, true);
      if (action === 'unpin') await dlgApi.pin(contextDialog.id, false);
      if (action === 'block') await actApi.block(contextDialog.id);
      if (action === 'unblock') await actApi.unblock(contextDialog.id);
    } catch (e) { console.error(e); }
    setContextMenu(null);
    setContextDialog(null);
  };

  const displayed = showArchived ? dialogs.filter(d => d.archived) : dialogs.filter(d => !d.archived);
  const archivedCount = dialogs.filter(d => d.archived).length;

  const handleSwipe = (d, startX, endX) => {
    if (startX - endX > 80) { actApi.archive(d.id, true); } else if (endX - startX > 80) { actApi.archive(d.id, false); }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header glass">
        <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Plugram</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-icon" onClick={onSavedMessages} title="Saved Messages">🔒</button>
            <button className="btn-icon" onClick={onNewChat} title="New Chat">✏️</button>
            <button className="btn-icon" onClick={onSettings} title="Settings">⚙️</button>
          </div>
        </div>
      </div>

      <div className="search-box glass">
        <input type="text" placeholder="Search or start new chat..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontSize: 14 }} />
        {search && <button className="btn-icon" onClick={() => setSearch('')} style={{ fontSize: 12 }}>✕</button>}
      </div>

      {archivedCount > 0 && (
        <div className="archived-bar" onClick={() => setShowArchived(!showArchived)} style={{ cursor: 'pointer' }}>
          <div className="glass" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, margin: '4px 8px', borderRadius: 10 }}>
            <span>📦</span>
            <span style={{ flex: 1, fontWeight: 500 }}>Archived</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{archivedCount}</span>
            <span style={{ fontSize: 12 }}>{showArchived ? '▲' : '▼'}</span>
          </div>
        </div>
      )}

      <div className="dialogs-list" style={{ flex: 1, overflowY: 'auto' }}>
        {search ? (
          (searchResults || []).map(d => (
            <div key={d.id} className={`dialog-item glass ${activeDialog?.id === d.id ? 'active' : ''}`} onClick={() => onSearchSelect(d)}>
              <div className="dialog-avatar">{d.photo ? <img src={d.photo} alt="" /> : d.title?.charAt(0)?.toUpperCase()}</div>
              <div className="dialog-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="dialog-title">{d.title}</div>
                <div className="dialog-preview" style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.type === 'user' ? '@' : ''}{d.username || d.type}</div>
              </div>
            </div>
          ))
        ) : (
          displayed.map(d => (
            <DialogRow key={d.id} dialog={d} active={activeDialog?.id === d.id}
              onSelect={() => onSelect(d)}
              onContext={handleContext}
              onSwipe={handleSwipe} />
          ))
        )}
      </div>

      {contextMenu && (
        <div className="overlay" style={{ background: 'transparent' }} onClick={() => setContextMenu(null)}>
          <div className="context-menu glass" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1000 }}
            onClick={e => e.stopPropagation()}>
            {contextDialog?.muted
              ? <button onClick={() => handleAction('unmute')}>🔔 Unmute</button>
              : <button onClick={() => handleAction('mute')}>🔇 Mute</button>}
            {contextDialog?.archived
              ? <button onClick={() => handleAction('unarchive')}>📦 Unarchive</button>
              : <button onClick={() => handleAction('archive')}>📦 Archive</button>}
            <button onClick={() => handleAction('pin')}>📌 Pin</button>
            {contextDialog?.type === 'user' && (
              contextDialog?.blocked
                ? <button onClick={() => handleAction('unblock')}>✅ Unblock</button>
                : <button onClick={() => handleAction('block')} style={{ color: 'var(--danger)' }}>🚫 Block</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DialogRow({ dialog, active, onSelect, onContext, onSwipe }) {
  const touchStartX = useRef(0);
  const rowRef = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    if (Math.abs(touchStartX.current - endX) > 80) onSwipe(dialog, touchStartX.current, endX);
  };

  const getInitials = (title) => (title || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  return (
    <div ref={rowRef} className={`dialog-item glass ${active ? 'active' : ''} ${dialog.muted ? 'muted' : ''} ${dialog.blocked ? 'blocked' : ''}`}
      onClick={onSelect} onContextMenu={(e) => onContext(e, dialog)}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="dialog-avatar" style={dialog.type === 'saved' ? { background: 'var(--accent)', color: '#fff' } : {}}>
        {dialog.photo ? <img src={dialog.photo} alt="" /> : dialog.type === 'saved' ? '🔒' : getInitials(dialog.title)}
      </div>
      <div className="dialog-info" style={{ flex: 1, minWidth: 0 }}>
        <div className="dialog-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {dialog.type === 'saved' ? 'Saved Messages' : dialog.title}
          {dialog.muted && <span style={{ fontSize: 10, opacity: 0.5 }}>🔇</span>}
        </div>
        <div className="dialog-preview">{dialog.lastMessage?.text?.substring(0, 50) || (dialog.type === 'group' ? 'Group' : dialog.type === 'channel' ? 'Channel' : '')}</div>
      </div>
      <div className="dialog-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, fontSize: 11, color: 'var(--text-muted)' }}>
        {dialog.lastMessage?.date && <span>{new Date(dialog.lastMessage.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        {dialog.unread > 0 && <span className="unread-badge">{dialog.unread}</span>}
      </div>
    </div>
  );
}
