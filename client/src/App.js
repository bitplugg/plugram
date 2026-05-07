import React, { useEffect, useState } from 'react';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import { me, settings } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      me().catch(() => null),
      settings.getKey('theme').catch(() => ({ value: 'dark' })),
    ]).then(([u, themeRow]) => {
      setUser(u);
      document.documentElement.setAttribute('data-theme', themeRow?.value || 'dark');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (loading) return <div className="app"><div className="loading"><div className="spinner" /></div></div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return <MainPage user={user} onLogout={() => setUser(null)} />;
}
