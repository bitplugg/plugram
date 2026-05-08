import React, { useState } from 'react';

const REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '🎉', '💯', '👎'];

export default function Reactions({ onReact, existing = [], onClose }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="reactions-picker glass" style={{ display: 'flex', gap: 4, padding: '6px 8px', borderRadius: 12, position: 'relative' }}
      onMouseLeave={() => setHovered(null)}>
      {REACTIONS.map(r => (
        <button key={r} className="reaction-btn"
          style={{
            fontSize: hovered === r ? 24 : 20, transition: 'all 0.15s',
            background: existing.includes(r) ? 'rgba(124,92,252,0.2)' : 'transparent',
            border: 'none', cursor: 'pointer', borderRadius: 8, padding: '2px 4px', lineHeight: 1,
          }}
          onMouseEnter={() => setHovered(r)}
          onClick={() => { onReact?.(r); onClose?.(); }}>
          {r}
        </button>
      ))}
    </div>
  );
}
