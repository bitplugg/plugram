import React, { useEffect } from 'react';

export default function MediaViewer({ src, type, onClose }) {
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.9)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
      <button onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: 'none',
          color: '#fff', fontSize: 20, cursor: 'pointer',
        }}>✕</button>
      {type === 'video' ? (
        <video src={src} controls autoPlay style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12 }} />
      ) : (
        <img src={src} alt="media" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12 }} />
      )}
    </div>
  );
}
