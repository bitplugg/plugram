import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';

export default function MessageInput({ onSend, onVoiceSend, onTyping, initialValue = '', onDraftChange, dialogId, replyTo, onClearReply, forwarded, onClearForward, onPoll, onAttachment, onLocation }) {
  const [text, setText] = useState(initialValue);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const inputRef = useRef(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const recTimer = useRef(null);

  useEffect(() => { setText(initialValue); }, [initialValue, dialogId]);
  useEffect(() => { onDraftChange?.(text); }, [text]);

  const handleSubmit = () => { if (text.trim()) { onSend(text); setText(''); inputRef.current?.focus(); } };
  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } };
  const handleChange = (e) => { setText(e.target.value); onTyping?.(); };
  const handleEmoji = (e) => { setText(t => t + e); setShowEmoji(false); inputRef.current?.focus(); };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(f => onAttachment?.(f));
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleAttachClick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.zip';
    input.multiple = true;
    input.onchange = (e) => Array.from(e.target.files).forEach(f => onAttachment?.(f));
    input.click();
  };

  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => onLocation?.(pos.coords.latitude, pos.coords.longitude),
      () => alert('Location permission denied')
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder; chunks.current = [];
      setRecording(true); setRecTime(0);
      recTimer.current = setInterval(() => setRecTime(t => t + 1), 1000);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        clearInterval(recTimer.current);
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        if (blob.size > 0) onVoiceSend?.(blob);
        setRecording(false); setRecTime(0);
      };
      recorder.start();
    } catch { alert('Microphone access denied'); }
  };

  const stopRecording = () => { if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') mediaRecorder.current.stop(); };
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="message-input-area" style={{ position: 'relative' }}
      onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {dragOver && <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(124,92,252,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>📎 Drop files here</div>}
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', background: 'rgba(124,92,252,0.08)', borderRadius: '8px 8px 0 0' }}>
          <span style={{ color: 'var(--accent)' }}>↩️</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Replying: {replyTo.text?.substring(0, 50) || 'media'}</span>
          <button className="btn-icon" style={{ width: 20, height: 20, fontSize: 10 }} onClick={onClearReply}>✕</button>
        </div>
      )}
      {forwarded?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', background: 'rgba(46,213,115,0.08)', borderRadius: '8px 8px 0 0' }}>
          <span style={{ color: 'var(--success)' }}>📨</span>
          <span style={{ flex: 1 }}>Forwarding {forwarded.length} msg(s)</span>
          <button className="btn-icon" style={{ width: 20, height: 20, fontSize: 10 }} onClick={onClearForward}>✕</button>
        </div>
      )}
      <div className="input-container" style={{ position: 'relative' }}>
        {recording ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
            <span style={{ color: 'var(--danger)', fontSize: 14 }}>🔴</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmt(recTime)}</span>
            <div style={{ flex: 1 }} />
            <button className="btn-icon" onClick={stopRecording} style={{ background: 'var(--danger)', color: '#fff' }}>⬛</button>
          </div>
        ) : (
          <>
            <textarea ref={inputRef} className="message-input" placeholder="Message..." value={text}
              onChange={handleChange} onKeyDown={handleKey} rows={1} />
            <div className="input-actions">
              <button className="btn-icon" onClick={() => setShowEmoji(!showEmoji)} title="Emoji">😊</button>
              <button className="btn-icon" onClick={handleAttachClick} title="Attach">📎</button>
              <button className="btn-icon" onClick={() => setShowMore(!showMore)} title="More">•••</button>
              {showMore && (
                <div className="glass" style={{ position: 'absolute', bottom: '100%', right: 0, display: 'flex', gap: 4, padding: 6, zIndex: 50 }}>
                  <button className="btn-icon" onClick={() => { onPoll?.(); setShowMore(false); }} title="Poll">📊</button>
                  <button className="btn-icon" onClick={() => { handleLocation(); setShowMore(false); }} title="Location">📍</button>
                </div>
              )}
              <button className="btn-icon" onClick={startRecording} title="Voice">🎤</button>
              <button className="btn-icon" onClick={handleSubmit} title="Send" style={text.trim() ? { color: 'var(--accent)' } : {}}>➤</button>
            </div>
          </>
        )}
      </div>
      {showEmoji && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 100 }}>
          <EmojiPicker onSelect={handleEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}
    </div>
  );
}
