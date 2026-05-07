import React, { useState, useEffect, useRef } from 'react';
import Message from './Message';
import MessageInput from './MessageInput';
import { messages, dialogs as dialogsApi } from '../api';

function groupByDate(msgs) {
  const groups = [];
  let lastDate = null;
  for (const m of msgs) {
    const date = m.date ? new Date(m.date * 1000).toLocaleDateString() : '';
    if (date !== lastDate) {
      groups.push({ type: 'date', date, key: date });
      lastDate = date;
    }
    groups.push({ type: 'msg', msg: m, key: m.id });
  }
  return groups;
}

export default function Chat({ dialog, user, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    messages.list(dialog.id).then(data => {
      setMsgs(data.reverse());
      setLoading(false);
      bottomRef.current?.scrollIntoView();
    }).catch(() => setLoading(false));
  }, [dialog.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const handleSend = async (text, replyTo) => {
    if (!text.trim()) return;
    const res = await messages.send(dialog.id, text, replyTo);
    if (res) {
      setMsgs(prev => [...prev, { id: Date.now(), text, out: 1, date: Math.floor(Date.now() / 1000), fromId: user.id, dialogId: dialog.id }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleDelete = async (msgId) => {
    await messages.delete(dialog.id, [msgId]);
    setMsgs(prev => prev.filter(m => m.id !== msgId));
  };

  const groups = groupByDate(msgs);

  return (
    <>
      <div className="chat-header glass-light">
        <button className="btn-icon" onClick={onBack} style={{ display: 'none' }} id="backBtn">←</button>
        <div className="chat-header-info">
          <div className="chat-header-name">{dialog.title}</div>
          <div className="chat-header-status">{dialog.type === 'user' ? 'user' : dialog.type}</div>
        </div>
      </div>
      <div className="messages-area" id="msgArea">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No messages yet</div>
        ) : groups.map(g =>
          g.type === 'date' ? (
            <div key={g.key} className="date-separator">{g.date}</div>
          ) : (
            <Message key={g.key} msg={g.msg} isOwn={g.msg.out || g.msg.fromId === String(user.id)} onDelete={handleDelete} onReply={handleSend} />
          )
        )}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </>
  );
}
