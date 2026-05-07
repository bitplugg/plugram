import React, { useState, useRef, useEffect } from 'react';

const EMOJIS = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😢','😭','😤','😡','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💗','💖','💘','💝','💟','❣️','💔','❤️‍🔥','❤️‍🩹','💌','💋','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄','💬','👁️‍🗨️','🗨️','🗯️','💭','💤','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏'];

const CATEGORIES = [
  { name: 'Smileys', emojis: EMOJIS.slice(0, 90) },
  { name: 'Hearts', emojis: EMOJIS.slice(90, 110) },
  { name: 'Gestures', emojis: EMOJIS.slice(110) },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [cat, setCat] = useState(0);

  return (
    <div className="emoji-picker glass">
      <div style={{ display: 'flex', gap: 4, padding: '8px 8px 4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {CATEGORIES.map((c, i) => (
          <button key={c.name} className={`btn-icon ${cat === i ? 'active' : ''}`}
            style={{ width: 32, height: 32, fontSize: 14 }} onClick={() => setCat(i)}>
            {i === 0 ? '😀' : i === 1 ? '❤️' : '👍'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn-icon" style={{ width: 24, height: 24, fontSize: 12 }} onClick={onClose}>✕</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: 8, maxHeight: 200, overflowY: 'auto' }}>
        {CATEGORIES[cat].emojis.map(e => (
          <button key={e} onClick={() => { onSelect(e); }}
            style={{ width: 36, height: 36, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s' }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.target.style.background = 'none'}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
