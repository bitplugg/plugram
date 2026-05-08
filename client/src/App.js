import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import Auth from './components/Auth';
import Settings from './components/Settings';
import { dialogs as dlgApi, messages as msgApi, me, status } from './api';
import { WebSocketProvider } from './websocket';

function App() {
  const [user, setUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogs, setDialogs] = useState([]);
  const [activeDialog, setActiveDialog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('plugram_fontSize') || '14'));
  const [density, setDensity] = useState(localStorage.getItem('plugram_density') || 'normal');
  const reconnectTimer = useRef(null);
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    status().then(r => {
      if (r.authenticated) { setAuthenticated(true); loadUser(); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authenticated) { loadDialogs(); connectWS(); }
  }, [authenticated]);

  const loadUser = async () => { try { const u = await me(); setUser(u); } catch {} };
  const loadDialogs = async () => { try { const d = await dlgApi.list(); setDialogs(d.dialogs || d || []); } catch {} };

  const connectWS = () => {
    const API = process.env.REACT_APP_API || 'http://localhost:3001';
    const wsUrl = API.replace(/^http/, 'ws');
    let ws = new WebSocket(wsUrl);
    ws.onopen = () => { setWsConnected(true); reconnectAttempt.current = 0; };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'new_message' && data.dialogId === activeDialog?.id) {
          setActiveDialog(prev => prev ? { ...prev, lastMessage: data.message } : prev);
        }
        if (data.type === 'dialog_update') loadDialogs();
        if (data.type === 'user_status') loadDialogs();
      } catch {}
    };
    ws.onclose = () => {
      setWsConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
      reconnectAttempt.current++;
      reconnectTimer.current = setTimeout(connectWS, delay);
    };
    ws.onerror = () => ws.close();
  };

  useEffect(() => {
    return () => { if (reconnectTimer.current) clearTimeout(reconnectTimer.current); };
  }, []);

  const handleSelect = async (dialog) => {
    setActiveDialog(dialog);
    setMobileView('chat');
    try { await msgApi.read(dialog.id, dialog.lastMessage?.id || 0); } catch {}
  };

  const handleSearchSelect = (d) => { setSearch(''); setSearchResults([]); handleSelect(d); };
  const handleNewChat = () => { const u = prompt('Enter username or phone:'); if (u) { dlgApi.resolve(u).then(d => { if (d) setActiveDialog(d); }).catch(() => alert('User not found')); } };

  const handleSavedMessages = async () => {
    try {
      const { actions } = await import('./api');
      const saved = await actions.saved();
      setActiveDialog({ ...saved, id: String(user?.id), type: 'saved' });
      setMobileView('chat');
    } catch {
      setActiveDialog({ id: String(user?.id), title: 'Saved Messages', type: 'saved' });
      setMobileView('chat');
    }
  };

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await dlgApi.search(q);
      setSearchResults(res.dialogs || res || []);
    } catch {}
  };

  const handleLogout = async () => {
    try {
      const { auth } = await import('./api');
      await auth.logout();
    } catch {}
    setAuthenticated(false);
    setUser(null);
    setActiveDialog(null);
    setDialogs([]);
  };

  const handleAuth = (u) => { setUser(u); setAuthenticated(true); };

  const handleFontSizeChange = (v) => { setFontSize(v); };
  const handleDensityChange = (v) => { setDensity(v); };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!authenticated) return <Auth onAuth={handleAuth} />;

  const config = { fontSize, density };

  return (
    <WebSocketProvider>
      <div className="app" style={{
        '--chat-font-size': `${fontSize}px`,
        '--chat-spacing': density === 'compact' ? '4px' : density === 'spacious' ? '12px' : '8px',
      }}>
        {mobileView !== 'chat' && (
          <Sidebar dialogs={dialogs} onSelect={handleSelect} onNewChat={handleNewChat}
            onSettings={() => setShowSettings(true)} search={search} setSearch={handleSearch}
            searchResults={searchResults} onSearchSelect={handleSearchSelect}
            activeDialog={activeDialog} onSavedMessages={handleSavedMessages} />
        )}
        {mobileView !== 'list' && (
          <Chat dialog={activeDialog} onBack={() => setMobileView('list')}
            config={config} onFontSizeChange={handleFontSizeChange} onDensityChange={handleDensityChange} />
        )}
        {showSettings && (
          <div className="overlay-settings">
            <Settings user={user} onClose={() => setShowSettings(false)} onLogout={handleLogout}
              initialTab="plugins" onFontSizeChange={handleFontSizeChange} onDensityChange={handleDensityChange} />
          </div>
        )}
        <div className="connection-status" style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          padding: '4px 16px', borderRadius: '0 0 12px 12px', zIndex: 9999,
          fontSize: 12, fontWeight: 500,
          background: wsConnected ? 'rgba(46,213,115,0.9)' : 'rgba(255,71,87,0.9)',
          color: '#fff', opacity: wsConnected ? 0 : 1, transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }}> {wsConnected ? 'Connected' : 'Reconnecting...'} </div>
        <div className="mobile-nav">
          <button className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}>💬</button>
          <button onClick={handleSavedMessages}>🔒</button>
          <button onClick={handleNewChat}>✏️</button>
          <button onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </div>
    </WebSocketProvider>
  );
}

export default App;
