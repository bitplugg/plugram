import React, { useEffect, useState } from 'react';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import { me } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me().then(u => setUser(u)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="app"><div className="loading"><div className="spinner" /></div></div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return <MainPage user={user} onLogout={() => setUser(null)} />;
}
