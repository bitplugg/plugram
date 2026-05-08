import React, { useState, useRef, useEffect } from 'react';

export default function AudioPlayer({ src, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onDur = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onDur);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onDur); a.removeEventListener('ended', onEnd); };
  }, [src]);

  const toggle = () => { const a = audioRef.current; if (!a) return; a.paused ? a.play() : a.pause(); setPlaying(!a.paused); };
  const seek = (e) => { const a = audioRef.current; if (!a) return; const r = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - r.left) / r.width) * duration; };
  const fmt = (s) => { if (!s) return '0:00'; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };
  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="audio-player glass" style={{ padding: '8px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, minWidth: 240 }}>
      <audio ref={audioRef} src={src} preload="auto" />
      <button className="btn-icon" onClick={toggle} style={{ fontSize: 18, width: 36, height: 36 }}>{playing ? '⏸' : '▶️'}</button>
      <div className="seek-bar" onClick={seek} style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 3, cursor: 'pointer', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.1s' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>{fmt(current)}</span>
      <button className="btn-icon" style={{ fontSize: 12, width: 28, height: 28 }} onClick={() => { const a = audioRef.current; if (!a) return; const v = a.volume > 0 ? 0 : 1; a.volume = v; setVolume(v); }}>{volume > 0 ? '🔊' : '🔇'}</button>
    </div>
  );
}
