import React, { useState, useEffect, useRef } from 'react';
import Message from './Message';
import MessageInput from './MessageInput';
import UserProfile from './UserProfile';
import MediaViewer from './MediaViewer';
import { messages as msgsApi } from '../api';

function groupByDate(msgs) {
  const groups = [];
  let lastDate = null;
  for (const m of msgs) {
    const date = m.date ? new Date(m.date * 1000).toLocaleDateString() : '';
    if (date !== lastDate) { groups.push({ type: 'date', date, key: date }); lastDate = date; }
    groups.push({ type: 'msg', msg: m, key: m.id });
  }
  return groups;
}

export default function Chat({ dialog, user, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [draft, setDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsgs, setForwardMsgs] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [mediaView, setMediaView] = useState(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinnedMsgs, setPinnedMsgs] = useState([]);
  const [wallpaper, setWallpaper] = useState(null);
  const bottomRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setLoading(true); setSearchOpen(false); setSearchResults([]); setTypingUsers({});
    setReplyTo(null); setForwardMsgs([]); setPinOpen(false);
    msgsApi.list(dialog.id).then(data => {
      setMsgs(data.reverse()); setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    }).catch(() => setLoading(false));
    const savedDraft = localStorage.getItem(`draft_${dialog.id}`);
    if (savedDraft) setDraft(savedDraft);
    const savedWall = localStorage.getItem(`wallpaper_${dialog.id}`);
    if (savedWall) setWallpaper(savedWall);
    msgsApi.pinned(dialog.id).then(setPinnedMsgs).catch(() => {});
    return () => { if (draft) localStorage.setItem(`draft_${dialog.id}`, draft); };
  }, [dialog.id]);

  useEffect(() => {
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'typing' && data.data.chatId === dialog.id)
          setTypingUsers(prev => ({ ...prev, [data.data.userId]: Date.now() }));
        if (data.event === 'new_message' && String(data.data.dialogId) === String(dialog.id)) {
          setMsgs(prev => [...prev, data.data]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          if (!document.hidden && Notification.permission === 'granted')
            new Notification(data.data.text?.substring(0, 60) || 'New message', { body: `From ${dialog.title}`, icon: '⚡' });
        }
      } catch {}
    };
    const ws = new WebSocket(`ws://${window.location.hostname}:3001`);
    ws.addEventListener('message', handler);
    return () => ws.close();
  }, [dialog.id]);

  useEffect(() => {
    if (draft) localStorage.setItem(`draft_${dialog.id}`, draft);
    else localStorage.removeItem(`draft_${dialog.id}`);
  }, [draft, dialog.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now(); const filtered = {};
        for (const [k, v] of Object.entries(prev)) { if (now - v < 5000) filtered[k] = v; }
        return filtered;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }, [msgs.length]);

  useEffect(() => {
    const handle = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }
      if (e.key === 'Escape') { setSearchOpen(false); setReplyTo(null); setForwardMsgs([]); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const handleSend = async (text, replyToMsg) => {
    if (!text.trim()) return;
    const res = await msgsApi.send(dialog.id, text, replyToMsg?.id || null);
    if (res) {
      setMsgs(prev => [...prev, { id: Date.now(), text, out: 1, date: Math.floor(Date.now() / 1000), fromId: user.id, dialogId: dialog.id, status: 'sending' }]);
      setDraft(''); setReplyTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleForward = async () => {
    if (forwardMsgs.length === 0) return;
    const ids = forwardMsgs.map(m => m.id);
    const fromId = forwardMsgs[0].dialogId || dialog.id;
    await msgsApi.forward(dialog.id, fromId, ids);
    setForwardMsgs([]);
  };

  const handleDelete = async (msgId) => {
    await msgsApi.delete(dialog.id, [msgId]);
    setMsgs(prev => prev.filter(m => m.id !== msgId));
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const results = await msgsApi.search(dialog.id, q);
    setSearchResults(results);
  };

  const handleJumpTo = (msgId) => {
    document.getElementById(`msg-${msgId}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVoiceSend = async (blob) => {
    const file = new File([blob], `voice-${Date.now()}.ogg`, { type: 'audio/ogg' });
    const fd = new FormData(); fd.append('file', file); fd.append('dialogId', dialog.id);
    try {
      await fetch(`/api/media/send`, { method: 'POST', body: fd });
      setMsgs(prev => [...prev, { id: Date.now(), text: '🎤 Voice', out: 1, date: Math.floor(Date.now() / 1000), fromId: user.id, mediaType: 'voice' }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {}
  };

  const handleWallpaper = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) { const url = URL.createObjectURL(file); setWallpaper(url); localStorage.setItem(`wallpaper_${dialog.id}`, url); }
    };
    input.click();
  };

  const groups = groupByDate(msgs);
  const hasTyping = Object.keys(typingUsers).length > 0;

  return (
    <>
      <div className="chat-header glass-light">
        <button className="btn-icon" onClick={onBack}>←</button>
        <div className="chat-header-info">
          <div className="chat-header-name">{dialog.title}</div>
          <div className="chat-header-status">
            {hasTyping ? 'typing...' : dialog.type}
            {pinnedMsgs.length > 0 && ` · ${pinnedMsgs.length} pinned`}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className={`btn-icon ${pinOpen ? 'active' : ''}`} onClick={() => setPinOpen(!pinOpen)} title="Pinned">📌</button>
          <button className="btn-icon" onClick={handleWallpaper} title="Wallpaper">🖼️</button>
          <button className={`btn-icon ${searchOpen ? 'active' : ''}`} onClick={() => setSearchOpen(true)} title="Search (Ctrl+K)">🔍</button>
        </div>
      </div>

      {pinOpen && pinnedMsgs.length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', maxHeight: 150, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>📌 Pinned</div>
          {pinnedMsgs.map(p => (
            <div key={p.id} onClick={() => handleJumpTo(p.id)} style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              {p.text?.substring(0, 80) || '(media)'}
            </div>
          ))}
        </div>
      )}

      {forwardMsgs.length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>📨 {forwardMsgs.length} to forward</span>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" style={{ padding: '6px 16px', fontSize: 13 }} onClick={handleForward}>Send Here</button>
          <button className="btn-icon" onClick={() => setForwardMsgs([])}>✕</button>
        </div>
      )}

      {searchOpen && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input className="search-input" ref={searchInputRef} placeholder="Search messages..." value={searchQuery}
            onChange={e => handleSearch(e.target.value)} autoFocus />
          {searchResults.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
              {searchResults.map(r => (
                <div key={r.id} onClick={() => handleJumpTo(r.id)} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {r.text?.substring(0, 80) || '(media)'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="messages-area" style={wallpaper ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        {loading ? <div className="loading"><div className="spinner" /></div>
          : groups.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>No messages</div>
          : groups.map(g =>
              g.type === 'date'
                ? <div key={g.key} className="date-separator">{g.date}</div>
                : <div key={g.key} id={`msg-${g.msg.id}`}>
                    <Message msg={g.msg} isOwn={g.msg.out || g.msg.fromId === String(user.id)}
                      onDelete={handleDelete} onReply={setReplyTo}
                      onForward={(m) => setForwardMsgs(prev => [...prev, m])} onProfile={setProfileId} />
                  </div>
            )}
        {hasTyping && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 16px' }}>typing...</div>}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={(t) => handleSend(t, replyTo)} onVoiceSend={handleVoiceSend}
        onTyping={() => msgsApi.typing(dialog.id, 'typing').catch(() => {})}
        initialValue={draft} onDraftChange={setDraft} dialogId={dialog.id}
        replyTo={replyTo} onClearReply={() => setReplyTo(null)}
        forwarded={forwardMsgs} onClearForward={() => setForwardMsgs([])} />

      {profileId && <UserProfile userId={profileId} onClose={() => setProfileId(null)} />}
      {mediaView && <MediaViewer src={mediaView.src} type={mediaView.type} onClose={() => setMediaView(null)} />}
    </>
  );
}
