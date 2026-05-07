import React, { useState, useRef, useEffect } from 'react';

export default function MessageInput({ onSend, onVoiceSend, onTyping, initialValue = '', onDraftChange, dialogId }) {
  const [text, setText] = useState(initialValue);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const inputRef = useRef(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const recTimer = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    setText(initialValue);
  }, [initialValue, dialogId]);

  useEffect(() => {
    onDraftChange?.(text);
  }, [text]);

  const handleSubmit = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {}, 2000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      chunks.current = [];
      setRecording(true);
      setRecTime(0);

      recTimer.current = setInterval(() => {
        setRecTime(t => t + 1);
      }, 1000);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        clearInterval(recTimer.current);
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        if (blob.size > 0) onVoiceSend?.(blob);
        setRecording(false);
        setRecTime(0);
      };

      recorder.start();
    } catch (e) {
      console.error('Mic error:', e);
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="message-input-area">
      <div className="input-container">
        {recording ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
            <span style={{ color: 'var(--danger)', fontSize: 14 }}>🔴 Recording</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{formatTime(recTime)}</span>
            <div style={{ flex: 1 }} />
            <button className="btn-icon" onClick={stopRecording} title="Stop" style={{ background: 'var(--danger)', color: '#fff' }}>⬛</button>
          </div>
        ) : (
          <>
            <textarea
              ref={inputRef}
              className="message-input"
              placeholder="Message..."
              value={text}
              onChange={handleChange}
              onKeyDown={handleKey}
              rows={1}
            />
            <div className="input-actions">
              <button className="btn-icon" onClick={startRecording} title="Voice">🎤</button>
              <button className="btn-icon" onClick={handleSubmit} title="Send" style={text.trim() ? { color: 'var(--accent)' } : {}}>➤</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
