import React, { useRef, useState, useEffect } from 'react';

export default function MediaViewer({ media, onClose, vidSpeed = 1, onVidRate }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [vTime, setVTime] = useState(0);
  const [vDur, setVDur] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [pip, setPip] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => { setVTime(vid.currentTime); setVDur(vid.duration || 0); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    if (vid.readyState >= 1) setVDur(vid.duration || 0);
    return () => { vid.removeEventListener('timeupdate', onTime); vid.removeEventListener('play', onPlay); vid.removeEventListener('pause', onPause); };
  }, [media?.url]);

  const togglePlay = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause(); };
  const seek = (e) => { const v = videoRef.current; if (!v) return; const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; v.currentTime = pct * vDur; };
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
  const volChange = (e) => { const v = videoRef.current; if (!v) return; const val = parseFloat(e.target.value); v.volume = val; setVolume(val); setMuted(val === 0); };
  const togglePip = async () => { try { if (document.pictureInPictureElement) { await document.exitPictureInPicture(); setPip(false); } else { await videoRef.current?.requestPictureInPicture(); setPip(true); } } catch {} };
  const setRate = (r) => { const v = videoRef.current; if (!v) return; v.playbackRate = r; onVidRate?.(media?.id, r); setShowSpeed(false); };
  const fmt = (s) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };

  const isVideo = media?.type === 'video' || media?.url?.match(/\.(mp4|webm|mov|avi)$/i);

  return (
    <div className="overlay media-viewer" onClick={onClose} style={{ background: 'rgba(0,0,0,0.95)', cursor: 'pointer' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {isVideo ? (
          <div className="video-wrapper" style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }}>
            <video ref={videoRef} src={media.url} style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12, cursor: 'pointer' }}
              onClick={togglePlay} playsInline />
            <div className="video-controls" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '40px 16px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'default',
            }}>
              <button className="btn-icon" style={{ color: '#fff', fontSize: 18 }} onClick={togglePlay}>{playing ? '⏸' : '▶️'}</button>
              <div className="seek-bar" onClick={seek} style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, cursor: 'pointer', position: 'relative' }}>
                <div style={{ width: `${vDur ? (vTime / vDur) * 100 : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.1s' }} />
              </div>
              <span style={{ color: '#fff', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmt(vTime)} / {fmt(vDur)}</span>
              <button className="btn-icon" style={{ color: '#fff', fontSize: 14 }} onClick={toggleMute}>{muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</button>
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={volChange} style={{ width: 60 }} />
              <div style={{ position: 'relative' }}>
                <button className="btn-icon" style={{ color: '#fff', fontSize: 13 }} onClick={() => setShowSpeed(!showSpeed)}>{vidSpeed}x</button>
                {showSpeed && (
                  <div className="glass" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, padding: 6, borderRadius: 8, marginBottom: 4, zIndex: 10 }}>
                    {[0.5, 1, 1.5, 2].map(r => (
                      <button key={r} className="btn-icon" style={{ fontSize: 11, padding: '4px 8px', background: r === vidSpeed ? 'var(--accent)' : 'transparent', color: r === vidSpeed ? '#fff' : 'var(--text)', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => setRate(r)}>{r}x</button>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn-icon" style={{ color: '#fff', fontSize: 14 }} onClick={togglePip} title="Picture in Picture">🖼️</button>
            </div>
          </div>
        ) : (
          <img src={media.url} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} />
        )}
        <div style={{ color: '#fff', marginTop: 12, fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
          {media.caption && <div>{media.caption}</div>}
        </div>
        <button className="btn-icon" onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 36, height: 36, fontSize: 16, border: 'none', cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  );
}
