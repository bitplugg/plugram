import React, { useState, useEffect } from 'react';
import { users as usersApi } from '../api';

export default function UserProfile({ userId, onClose }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    usersApi.get(userId).then(setUser).catch(() => {});
  }, [userId]);

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
      <div onClick={e => e.stopPropagation()}
        className="glass" style={{ width: 340, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>
          {user?.firstName?.charAt(0) || '?'}
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>{user?.firstName} {user?.lastName}</h2>
        {user?.username && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>@{user.username}</p>}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
          <div>ID: {userId}</div>
          {user?.phone && <div>📞 {user.phone}</div>}
          <div>🟢 {user?.status || 'offline'}</div>
          {user?.commonChats > 0 && <div>👥 {user.commonChats} common chats</div>}
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 20, width: '100%' }}>Close</button>
      </div>
    </div>
  );
}
