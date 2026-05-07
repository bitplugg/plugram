import React, { useState, useEffect, useRef } from 'react';
import Message from './Message';
import MessageInput from './MessageInput';
import { messages as msgsApi, dialogs as dialogsApi } from '../api';

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
  const bottomRef = useRef(null);
  const searchInputRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    setLoading(true);
    setSearchOpen(false);
    setSearchResults([]);
    setTypingUsers({});
    msgsApi.list(dialog.id).then(data => {
      setMsgs(data.reverse());
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    }).catch(() => setLoading(false));

    const saved = localStorage.getItem(`draft_${dialog.id}`);
    if (saved) setDraft(saved);

    return () => {
      if (draft) localStorage.setItem(`draft_${dialog.id}`, draft);
    };
  }, [dialog.id]);

  useEffect(() => {
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'typing' && data.data.chatId === dialog.id) {
          setTypingUsers(prev => ({ ...prev, [data.data.userId]: Date.now() }));
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
        const now = Date.now();
        const filtered = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v < 5000) filtered[k] = v;
        }
        return filtered;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Reset scroll on new messages
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [msgs.length]);

  const handleSend = async (text, replyTo) => {
    if (!text.trim()) return;
    const res = await msgsApi.send(dialog.id, text, replyTo);
    if (res) {
      setMsgs(prev => [...prev, {
        id: Date.now(), text, out: 1, date: Math.floor(Date.now() / 1000),
        fromId: user.id, dialogId: dialog.id, status: 'sending',
      }]);
      setDraft('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dialogId', dialog.id);
    try {
      await fetch(`${window.location.origin}/api/media/send`, { method: 'POST', body: formData });
      setMsgs(prev => [...prev, {
        id: Date.now(), text: '🎤 Voice message', out: 1, date: Math.floor(Date.now() / 1000),
        fromId: user.id, dialogId: dialog.id, mediaType: 'voice',
      }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) { console.error('Voice send failed:', e); }
  };

  const handleTyping = () => {
    msgsApi.typing(dialog.id, 'typing').catch(() => {});
  };

  const groups = groupByDate(msgs);
  const hasTyping = Object.keys(typingUsers).length > 0;

  return (
    <>
      <div className="chat-header glass-light">
        <button className="btn-icon" onClick={onBack} id="backBtn">←</button>
        <div className="chat-header-info">
          <div className="chat-header-name">{dialog.title}</div>
          <div className="chat-header-status">
            {hasTyping ? 'typing...' : dialog.type}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className={`btn-icon ${searchOpen ? 'active' : ''}`} onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchInputRef.current?.focus(), 100); }} title="Search">🔍</button>
        </div>
      </div>

      {searchOpen && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input className="search-input" ref={searchInputRef} placeholder="Search messages..." value={searchQuery}
            onChange={e => handleSearch(e.target.value)} autoFocus />
          {searchResults.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
              {searchResults.map(r => (
                <div key={r.id} onClick={() => handleJumpTo(r.id)}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)', hover: { background: 'rgba(255,255,255,0.05)' } }}>
                  {r.text?.substring(0, 80) || '(media)'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="messages-area">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>No messages yet</div>
        ) : groups.map(g =>
          g.type === 'date' ? (
            <div key={g.key} className="date-separator">{g.date}</div>
          ) : (
            <div key={g.key} id={`msg-${g.msg.id}`}>
              <Message msg={g.msg} isOwn={g.msg.out || g.msg.fromId === String(user.id)} onDelete={handleDelete} />
            </div>
          )
        )}
        {hasTyping && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 16px' }}>Someone is typing...</div>}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} onVoiceSend={handleVoiceSend} onTyping={handleTyping}
        initialValue={draft} onDraftChange={setDraft} dialogId={dialog.id} />
    </>
  );
}
