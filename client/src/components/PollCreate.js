import React, { useState } from 'react';

export default function PollCreate({ onSubmit, onClose }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => setOptions([...options, '']);
  const updOption = (i, v) => { const o = [...options]; o[i] = v; setOptions(o); };
  const remOption = (i) => options.length > 2 && setOptions(options.filter((_, j) => j !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) return alert('Add a question and at least 2 options');
    onSubmit(question.trim(), clean);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass" style={{ padding: 20, borderRadius: 16, maxWidth: 400, width: '90%', margin: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Create Poll</h3>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: 12, outline: 'none' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {options.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>  
                <input type="text" placeholder={`Option ${i + 1}`} value={o} onChange={e => updOption(i, e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                {options.length > 2 && <button type="button" className="btn-icon" onClick={() => remOption(i)}>✕</button>}
              </div>
            ))}
          </div>
          {options.length < 10 && <button type="button" onClick={addOption} style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--accent)', padding: '6px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 12 }}>+ Add option</button>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--glass)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 20px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
