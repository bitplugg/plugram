import React, { useState, useEffect } from 'react';
import { contacts as contactsApi, actions as actApi } from '../api';

export default function ChatInfo({ dialog, onClose, onStartChat }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUserId, setAddUserId] = useState('');
  const [tab, setTab] = useState('info');

  useEffect(() => {
    if (dialog.type === 'group' || dialog.type === 'supergroup') {
      loadMembers();
    } else {
      setLoading(false);
    }
  }, [dialog]);

  const loadMembers = async () => {
    try {
      const d = await contactsApi.list();
      setMembers(Array.isArray(d) ? d : d?.users || []);
    } catch {}
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!addUserId) return;
    try {
      await actApi.groupAdd(dialog.id, addUserId);
      setAddUserId('');
      alert('Member added');
    } catch (e) { alert(e.message); }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await actApi.groupRemove(dialog.id, userId);
      loadMembers();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass" style={{ padding: 0, borderRadius: 16, maxWidth: 420, width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', margin: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
          {['info', 'members', 'media'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            }}>{t === 'info' ? 'ℹ️ Info' : t === 'members' ? '👥 Members' : '📎 Media'}</button>
          ))}
          <button className="btn-icon" onClick={onClose} style={{ position: 'absolute', top: 8, right: 8 }}>✕</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {tab === 'info' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{dialog.photo ? <img src={dialog.photo} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : (dialog.title?.charAt(0) || '?')}</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{dialog.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{dialog.type}</div>
              </div>
              <div className="settings-group">
                <div className="settings-row"><span className="settings-label">Type</span><span className="settings-value">{dialog.type}</span></div>
                <div className="settings-row"><span className="settings-label">ID</span><span className="settings-value">{dialog.id}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
              </div>
            </div>
          )}
          {tab === 'members' && (
            <div>
              {(dialog.type === 'group' || dialog.type === 'supergroup') ? (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input className="auth-input" placeholder="User ID to add" value={addUserId} onChange={e => setAddUserId(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn btn-primary" onClick={handleAdd}>Add</button>
                  </div>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading...</div>
                  ) : members.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No members loaded</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {members.slice(0, 50).map((u, i) => (
                        <div key={u.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--glass)' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>
                            {u.firstName?.charAt(0) || u.username?.charAt(0) || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.firstName} {u.lastName || ''}</div>
                            {u.username && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>}
                          </div>
                          <button className="btn-icon" style={{ color: 'var(--danger)', fontSize: 12 }} onClick={() => handleRemove(u.id)} title="Remove">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>This is not a group</div>
              )}
            </div>
          )}
          {tab === 'media' && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Shared media coming soon</div>
          )}
        </div>
      </div>
    </div>
  );
}
