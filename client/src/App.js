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
      settings.getKey('ghost_mode').catch(() => ({ value: 'false' })),
    ]).then(([u, themeRow]) => {
      setUser(u);
      const theme = themeRow?.value || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="app"><div className="loading"><div className="spinner" /></div></div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return <MainPage user={user} onLogout={() => setUser(null)} />;
}
