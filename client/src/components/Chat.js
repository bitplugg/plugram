import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageInput from './MessageInput';
import Message from './Message';
import MediaViewer from './MediaViewer';
import PollView from './PollView';
import PollCreate from './PollCreate';
import UserProfile from './UserProfile';
import { messages as msgApi, actions as actApi, dialogs as dlgApi } from '../api';
import { useWebSocket } from '../websocket';

export default function Chat({ dialog, onBack, config, onNewMessage, onFontSizeChange, onDensityChange }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [forwarded, setForwarded] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const [pinned, setPinned] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProf, setShowProf] = useState(false);
  const [profUser, setProfUser] = useState(null);
  const [mediaView, setMediaView] = useState(null);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [contextMsg, setContextMsg] = useState(null);
  const [draft, setDraft] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState([]);
  const [vidSpeed, setVidSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(config?.fontSize || 14);
  const [density, setDensity] = useState(config?.density || 'normal');
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const ws = useWebSocket();
  const timerRef = useRef(null);

  useEffect(() => { if (ws && dialog) loadMessages(); }, [dialog, ws]);

  useEffect(() => {
    if (ws) {
      const handler = (data) => {
        if (data.dialogId === dialog?.id) {
          setMsgs(prev => { const exists = prev.some(m => m.id === data.message?.id); return exists ? prev : [data.message, ...prev]; });
        }
        if (data.type === 'message_edited' && data.dialogId === dialog?.id) {
          setMsgs(prev => prev.map(m => m.id === data.message?.id ? { ...m, ...data.message } : m));
        }
        if (data.type === 'message_deleted' && data.dialogId === dialog?.id) {
          setMsgs(prev => prev.filter(m => !data.ids?.includes(m.id)));
        }
      };
      ws.on('message', handler);
      return () => ws.off('message', handler);
    }
  }, [ws, dialog]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await msgApi.list(dialog.id, 50);
      setMsgs(data.messages || []);
      const p = await msgApi.pinned(dialog.id);
      setPinned(p || []);
      if ((data.messages?.length || 0) > 0) {
        msgApi.read(dialog.id, Math.max(...data.messages.map(m => m.id)));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadMore = async () => {
    if (msgs.length === 0) return;
    const oldest = msgs[msgs.length - 1];
    try {
      const data = await msgApi.list(dialog.id, 50, oldest.id);
      setMsgs(prev => [...prev, ...(data.messages || []).filter(m => !prev.some(p => p.id === m.id))]);
    } catch (e) { console.error(e); }
  };

  const handleSend = async (text) => {
    await msgApi.send(dialog.id, text, replyTo?.id);
    setReplyTo(null);
    setForwarded([]);
    loadMessages();
  };

  const handleVoiceSend = async (blob) => {
    const fd = new FormData();
    fd.append('file', blob, 'voice.webm'); fd.append('dialogId', dialog.id);
    await fetch(`/api/media/send`, { method: 'POST', body: fd });
    loadMessages();
  };

  const handleAttach = async (file) => {
    setAttachmentPreview(p => [...p, file]);
    const fd = new FormData();
    fd.append('file', file); fd.append('dialogId', dialog.id);
    await fetch(`/api/media/send`, { method: 'POST', body: fd });
    loadMessages();
  };

  const handleLocation = async (lat, lon) => {
    await actApi.location(dialog.id, lat, lon);
    loadMessages();
  };

  const handlePoll = async (question, options) => {
    await actApi.poll(dialog.id, question, options);
    setShowPollCreate(false);
    loadMessages();
  };

  const handleReply = (msg) => { setReplyTo(msg); setForwarded([]); setShowContext(false); };
  const handleForward = (msg) => setForwarded(prev => prev.includes(msg.id) ? prev : [...prev, msg.id]);

  const handleEdit = async (msgId, text) => {
    await msgApi.edit(dialog.id, msgId, text);
    loadMessages();
  };

  const handleDelete = async (msgId) => {
    await msgApi.delete(dialog.id, [msgId]);
    setShowContext(false);
    loadMessages();
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const data = await msgApi.search(dialog.id, searchQ);
      setSearchResults(data.messages || []);
      setSearchIdx(0);
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  const jumpToSearch = (idx) => {
    setSearchIdx(idx);
    const msgId = searchResults[idx]?.id;
    if (msgId && listRef.current) {
      const el = listRef.current.querySelector(`[data-msg-id="${msgId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleContext = (e, msg) => { e.preventDefault(); setContextMsg(msg); setShowContext(true); };
  const handleProfile = async (userId) => { setProfUser(userId); setShowProf(true); };

  const handleDraft = (t) => localStorage.setItem(`draft_${dialog?.id}`, t);
  const savedDraft = dialog ? (localStorage.getItem(`draft_${dialog.id}`) || '') : '';

  const handleWheel = (e) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (e.target.scrollTop === 0) loadMore();
    }, 200);
  };

  const videoRefs = useRef({});
  const setVidRef = (id) => (el) => { if (el) videoRefs.current[id] = el; };

  const handleVidPlaybackRate = (id, rate) => {
    const vid = videoRefs.current[id];
    if (vid) { vid.playbackRate = rate; setVidSpeed(rate); }
  };

  if (!dialog) return <div className="chat-empty"><div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 20 }}><h2>Plugram</h2><p style={{ color: 'var(--text-muted)' }}>Select a chat to start messaging</p></div></div>;

  return (
    <div className="chat-view">
      <div className="chat-header glass">
        <div className="chat-header-left">
          <button className="btn-icon mobile-only" onClick={onBack}>←</button>
          <div className="chat-avatar" onClick={() => handleProfile(dialog.id)}>
            {dialog.photo ? <img src={dialog.photo} alt="" /> : dialog.title?.charAt(0)?.toUpperCase()}
          </div>
          <div className="chat-header-info">
            <div className="chat-header-title" style={{ cursor: 'pointer' }} onClick={() => handleProfile(dialog.id)}>
              {dialog.type === 'saved' ? 'Saved Messages' : dialog.title}
              {dialog.type === 'saved' && <span style={{ marginLeft: 6 }}>🔒</span>}
            </div>
            <div className="chat-header-status">{dialog.online ? 'online' : dialog.lastSeen || ''}</div>
          </div>
        </div>
        <div className="chat-header-actions">
          {pinned.length > 0 && <button className="btn-icon" onClick={() => setShowPinned(!showPinned)} title="Pinned">📌</button>}
          <button className="btn-icon" onClick={() => dlgApi.pin(dialog.id, true)} title="Pin chat">📌</button>
          <button className="btn-icon" onClick={() => setShowSearch(!showSearch)} title="Search">🔍</button>
        </div>
      </div>

      {showSearch && (
        <div className="search-bar glass" style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input ref={searchRef} type="text" placeholder="Search in chat..." value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none' }} />
          <button className="btn-icon" onClick={handleSearch}>{searching ? '⏳' : '🔍'}</button>
          {searchResults.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{searchIdx + 1}/{searchResults.length}</span>
          )}
          {searchResults.length > 0 && (
            <>
              <button className="btn-icon" onClick={() => jumpToSearch(Math.max(0, searchIdx - 1))}>↑</button>
              <button className="btn-icon" onClick={() => jumpToSearch(Math.min(searchResults.length - 1, searchIdx + 1))}>↓</button>
            </>
          )}
          <button className="btn-icon" onClick={() => { setShowSearch(false); setSearchQ(''); setSearchResults([]); }}>✕</button>
        </div>
      )}

      {showPinned && pinned.length > 0 && (
        <div className="pinned-bar glass" style={{ padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>📌</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {pinned.slice(0, 3).map(m => <div key={m.id} style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.text || 'Media'}</div>)}
          </div>
          <button className="btn-icon" style={{ fontSize: 10 }} onClick={() => setShowPinned(false)}>✕</button>
        </div>
      )}

      {showPollCreate && <PollCreate onSubmit={handlePoll} onClose={() => setShowPollCreate(false)} />}

      <div className="messages-container" ref={listRef} onScroll={handleWheel}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
        ) : msgs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No messages yet</div>
        ) : (
          msgs.map((msg, i) => (
            <div key={msg.id || i} data-msg-id={msg.id} style={{ position: 'relative' }}
              onContextMenu={(e) => handleContext(e, msg)}>
              <Message msg={msg} onReply={handleReply} onForward={handleForward}
                onEdit={handleEdit} onDelete={handleDelete} onProfile={handleProfile}
                onMediaOpen={setMediaView} onVidRate={handleVidPlaybackRate}
                fontSize={fontSize} density={density} />
            </div>
          ))
        )}
      </div>

      <div className="attachment-preview" style={{ display: attachmentPreview.length > 0 ? 'flex' : 'none', gap: 8, padding: '6px 12px', overflowX: 'auto' }}>
        {attachmentPreview.map((f, i) => (
          <div key={i} style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'var(--glass)' }}>
            {f.type?.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 20, color: 'var(--text-muted)' }}>📄</div>}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, padding: '1px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
          </div>
        ))}
      </div>

      <MessageInput onSend={handleSend} onVoiceSend={handleVoiceSend} onTyping={() => msgApi.typing(dialog.id, 'typing')}
        initialValue={savedDraft} onDraftChange={handleDraft} dialogId={dialog.id}
        replyTo={replyTo} onClearReply={() => setReplyTo(null)}
        forwarded={forwarded} onClearForward={() => setForwarded([])}
        onPoll={() => setShowPollCreate(true)} onAttachment={handleAttach} onLocation={handleLocation} />

      {showContext && contextMsg && (
        <div className="context-menu-overlay" onClick={() => setShowContext(false)}>
          <div className="context-menu glass" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => handleReply(contextMsg)}>↩️ Reply</button>
            <button onClick={() => { handleForward(contextMsg); setShowContext(false); }}>📨 Forward</button>
            <button onClick={() => { navigator.clipboard.writeText(contextMsg.text || ''); setShowContext(false); }}>📋 Copy</button>
            <button onClick={() => { handleProfile(contextMsg.fromId); setShowContext(false); }}>👤 Profile</button>
            {(contextMsg.text || contextMsg.media?.type === 'poll') && <button onClick={() => { const t = prompt('Edit:', contextMsg.text || ''); if (t !== null) { handleEdit(contextMsg.id, t); } setShowContext(false); }}>✏️ Edit</button>}
            <button style={{ color: 'var(--danger)' }} onClick={() => { if (window.confirm('Delete?')) handleDelete(contextMsg.id); }}>🗑️ Delete</button>
          </div>
        </div>
      )}

      {mediaView && <MediaViewer media={mediaView} onClose={() => setMediaView(null)} vidSpeed={vidSpeed} onVidRate={handleVidPlaybackRate} />}
      {showProf && <UserProfile userId={profUser} onClose={() => setShowProf(false)} />}
    </div>
  );
}
