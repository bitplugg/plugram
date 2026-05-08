import React, { useState } from 'react';

export default function ScheduleMessage({ onSchedule, onClose }) {
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return alert('Enter a message');
    const ts = new Date(date).getTime() / 1000;
    if (ts <= Date.now() / 1000) return alert('Time must be in the future');
    onSchedule(text.trim(), Math.floor(ts));
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass" style={{ padding: 20, borderRadius: 16, maxWidth: 380, width: '90%', margin: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>⏰ Schedule Message</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea placeholder="Message text" value={text} onChange={e => setText(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }} />
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--glass)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );
}
