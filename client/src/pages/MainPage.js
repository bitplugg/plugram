import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import Settings from '../components/Settings';
import { dialogs as dialogsApi } from '../api';

export default function MainPage({ user, onLogout }) {
  const [dialogs, setDialogs] = useState([]);
  const [activeDialog, setActiveDialog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('plugins');
  const [search, setSearch] = useState('');
  const [mobileChat, setMobileChat] = useState(false);

  useEffect(() => {
    dialogsApi.list().then(setDialogs).catch(console.error);
  }, []);

  const filtered = dialogs.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (d) => {
    setActiveDialog(d);
    setMobileChat(true);
  };

  const handleBack = () => setMobileChat(false);

  const openSettings = (tab) => {
    setSettingsTab(tab);
    setShowSettings(true);
  };

  return (
    <div className="app">
      <div className={`sidebar ${mobileChat ? 'hide' : ''}`}>
        <div className="sidebar-header glass-light">
          <h1>Plugram</h1>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-icon" onClick={() => openSettings('plugins')} title="Plugins">⚡</button>
            <button className="btn-icon" onClick={() => openSettings('general')} title="Settings">⚙️</button>
          </div>
        </div>
        <div className="sidebar-search">
          <input className="search-input" placeholder="Search dialogs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Sidebar dialogs={filtered} activeId={activeDialog?.id} onSelect={handleSelect} />
      </div>
      <div className={`main-area ${mobileChat ? 'show' : ''}`}>
        {activeDialog ? (
          <Chat dialog={activeDialog} user={user} onBack={handleBack} />
        ) : (
          <div className="no-chat">
            <div className="no-chat-icon">💬</div>
            <h2>Select a chat</h2>
            <p>Choose a conversation from the sidebar</p>
          </div>
        )}
      </div>
      {showSettings && (
        <Settings
          user={user}
          initialTab={settingsTab}
          onClose={() => setShowSettings(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}
