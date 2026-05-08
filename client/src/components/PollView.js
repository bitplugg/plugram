import React, { useState } from 'react';

export default function PollView({ poll, results }) {
  const [showResults, setShowResults] = useState(results || false);
  const [votes, setVotes] = useState(poll?.answers?.map(a => ({ text: a.text, option: a.option, count: 0 })) || []);

  const total = votes.reduce((s, v) => s + v.count, 0) || 1;

  const handleVote = (option) => {
    setVotes(prev => prev.map(v => v.option === option ? { ...v, count: v.count + 1 } : v));
    setShowResults(true);
  };

  if (!poll) return null;

  return (
    <div className="poll-container glass" style={{ padding: 12, borderRadius: 12, maxWidth: 320 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{poll.question}</div>
      {!showResults ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {votes.map((v, i) => (
            <button key={i} className="poll-option" onClick={() => handleVote(v.option)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--glass)', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
              {v.text}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {votes.map((v, i) => (
            <div key={i} style={{ position: 'relative', padding: '8px 12px', borderRadius: 8, background: 'var(--glass)', fontSize: 13, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${(v.count / total) * 100}%`, background: 'rgba(124,92,252,0.15)', borderRadius: 8, transition: 'width 0.3s' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span>{v.text}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{Math.round((v.count / total) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {!showResults && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Tap to vote</div>}
    </div>
  );
}
