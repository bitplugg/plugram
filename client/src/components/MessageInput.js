import React, { useState, useRef } from 'react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

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

  return (
    <div className="message-input-area">
      <div className="input-container">
        <textarea
          ref={inputRef}
          className="message-input"
          placeholder="Message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <div className="input-actions">
          <button className="btn-icon" onClick={handleSubmit} title="Send">➤</button>
        </div>
      </div>
    </div>
  );
}
