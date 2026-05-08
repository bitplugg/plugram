import React, { useState, useEffect } from 'react';
import { settings as settingsApi, auth, plugins as pluginsApi } from '../api';

function GeneralTab({ onFontSizeChange, onDensityChange }) {
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [saved, setSaved] = useState(false);
  const [ghost, setGhost] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('plugram_fontSize') || '14'));
  const [density, setDensity] = useState(localStorage.getItem('plugram_density') || 'normal');
  const [animations, setAnimations] = useState(localStorage.getItem('plugram_animations') !== 'off');

  useEffect(() => {
    settingsApi.getKey('api_id').then(r => r.value && setApiId(r.value)).catch(() => {});
    settingsApi.getKey('api_hash').then(r => r.value && setApiHash(r.value)).catch(() => {});
    settingsApi.getKey('ghost_mode').then(r => setGhost(r.value === 'true')).catch(() => {});
    settingsApi.getKey('theme').then(r => r.value && setTheme(r.value)).catch(() => {});
  }, []);

  const save = async () => {
    if (apiId) await settingsApi.set('api_id', apiId);
    if (apiHash) await settingsApi.set('api_hash', apiHash);
    await settingsApi.set('ghost_mode', ghost ? 'true' : 'false');
    await settingsApi.set('theme', theme);
    setSaved(true);
    document.documentElement.setAttribute('data-theme', theme);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFontSize = (v) => { setFontSize(v); localStorage.setItem('plugram_fontSize', v); onFontSizeChange?.(v); };
  const handleDensity = (v) => { setDensity(v); localStorage.setItem('plugram_density', v); onDensityChange?.(v); };
  const handleAnimations = (v) => { setAnimations(v); localStorage.setItem('plugram_animations', v ? 'on' : 'off'); document.documentElement.setAttribute('data-animations', v ? 'on' : 'off'); };

  return (
    <div>
      <div className="settings-group">
        <div className="settings-group-title">API Credentials</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Get from my.telegram.org</p>
        <input className="auth-input" placeholder="API ID" value={apiId} onChange={e => setApiId(e.target.value)} type="number" />
        <input className="auth-input" placeholder="API Hash" value={apiHash} onChange={e => setApiHash(e.target.value)} />
      </div>

      <div className="settings-group">
        <div className="settings-group-title">👻 Ghost Mode</div>
        <div className="settings-row">
          <span className="settings-label">Invisible mode</span>
          <button className={`toggle-switch ${ghost ? 'on' : ''}`} onClick={() => setGhost(!ghost)} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          When enabled: no read receipts, no typing indicators, stay offline.
        </p>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">🎨 Theme</div>
        <div className="settings-row">
          <span className="settings-label">Current theme</span>
          <span className="settings-value">{theme === 'dark' ? 'Liquid Glass Dark' : 'Liquid Glass Light'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className={`btn btn-ghost`} style={{ flex: 1, background: theme === 'dark' ? 'rgba(124,92,252,0.2)' : '', borderColor: theme === 'dark' ? 'var(--accent)' : '' }}
            onClick={() => setTheme('dark')}>🌙 Dark</button>
          <button className={`btn btn-ghost`} style={{ flex: 1, background: theme === 'light' ? 'rgba(124,92,252,0.2)' : '', borderColor: theme === 'light' ? 'var(--accent)' : '' }}
            onClick={() => setTheme('light')}>☀️ Light</button>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">🎨 Customization</div>
        <div className="settings-row">
          <span className="settings-label">Font Size</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn-icon" style={{ fontSize: 11, width: 28, height: 28 }} onClick={() => handleFontSize(Math.max(12, fontSize - 1))}>A−</button>
            <span style={{ fontSize: 13, width: 30, textAlign: 'center' }}>{fontSize}px</span>
            <button className="btn-icon" style={{ fontSize: 11, width: 28, height: 28 }} onClick={() => handleFontSize(Math.min(20, fontSize + 1))}>A+</button>
          </div>
        </div>
        <div className="settings-row">
          <span className="settings-label">Density</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['compact', 'normal', 'spacious'].map(d => (
              <button key={d} className={`btn btn-ghost`} style={{ padding: '4px 12px', fontSize: 12, background: density === d ? 'rgba(124,92,252,0.2)' : '' }}
                onClick={() => handleDensity(d)}>{d}</button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <span className="settings-label">Animations</span>
          <button className={`toggle-switch ${animations ? 'on' : ''}`} onClick={() => handleAnimations(!animations)} />
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">About</div>
        <div className="settings-row"><span className="settings-label">Version</span><span className="settings-value">1.0.0</span></div>
        <div className="settings-row"><span className="settings-label">Author</span><span className="settings-value">bitplugg</span></div>
        <div className="settings-row"><span className="settings-label">TG API</span><span className="settings-value">12.7</span></div>
      </div>

      <button className="btn btn-primary" onClick={save} style={{ marginTop: 16 }}>{saved ? '✓ Saved' : 'Save Settings'}</button>
    </div>
  );
}

function PluginConfigPanel({ plugin, onBack }) {
  const [config, setConfig] = useState(plugin.config || {});
  const schema = plugin.configSchema || {};

  const handleChange = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  const saveConfig = async () => {
    await pluginsApi.setConfig(plugin.id, config);
    onBack();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-icon" onClick={onBack}>←</button>
        <span style={{ fontSize: 28 }}>{plugin.icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{plugin.displayName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{plugin.manifest?.version || '1.0'}</div>
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-group-title">{plugin.manifest?.description || 'Settings'}</div>
        {Object.keys(schema).length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No configurable settings.</p>
        ) : (
          Object.entries(schema).map(([key, field]) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{field.label || key}</label>
              {field.type === 'boolean' ? (
                <button className={`toggle-switch ${config[key] ?? field.default ? 'on' : ''}`}
                  onClick={() => handleChange(key, !(config[key] ?? field.default))} />
              ) : field.type === 'number' ? (
                <input className="auth-input" type="number" value={config[key] ?? field.default} onChange={e => handleChange(key, e.target.value)} />
              ) : (
                <input className="auth-input" value={config[key] ?? field.default} onChange={e => handleChange(key, e.target.value)} />
              )}
            </div>
          ))
        )}
        <button className="btn btn-primary" onClick={saveConfig}>Save Settings</button>
      </div>
    </div>
  );
}

function PluginsTab() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);

  const load = () => {
    setLoading(true);
    pluginsApi.list().then(setPlugins).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id, enabled) => { await pluginsApi.toggle(id, enabled); load(); };
  const reload = async () => { await pluginsApi.reload(); load(); };

  if (configOpen) return <PluginConfigPanel plugin={configOpen} onBack={() => setConfigOpen(null)} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="settings-group-title" style={{ margin: 0 }}>Installed Plugins</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={() => setStoreOpen(!storeOpen)} title="Store">🏪</button>
          <button className="btn-icon" onClick={reload} title="Reload">🔄</button>
        </div>
      </div>
      {storeOpen && (
        <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>🏪 Plugin Store</span>
            <button className="btn-icon" onClick={() => setStoreOpen(false)}>✕</button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Browse from <strong>github.com/bitplugg/plugram-plugin</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Admin Helper', icon: '🛠️', desc: 'Group management tools', id: 'adminhelper' },
              { name: 'Meme Gen', icon: '🎨', desc: 'Meme templates', id: 'memegen' },
              { name: 'Voice Transcriber', icon: '🎤', desc: 'Transcribe voice', id: 'voicetrans' },
              { name: 'Weather', icon: '🌤️', desc: 'Weather forecasts', id: 'weather' },
            ].map(sp => (
              <div key={sp.id} className="plugin-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{sp.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{sp.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sp.desc}</div>
                </div>
                <button className="btn-ghost" style={{ padding: '6px 16px', fontSize: 13 }}
                  onClick={() => alert(`Install ${sp.name}? Would download from ${window.location.origin}/api/plugins/install/${sp.id}`)}>
                  Install
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : plugins.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
          <p>No plugins installed</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plugins.filter(p => !p.system || p.name === 'pluglib').map(p => (
            <div key={p.id} className="plugin-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28, width: 36, textAlign: 'center' }}>{p.icon || '⚡'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.displayName}</span>
                    {p.system && <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(124,92,252,0.2)', borderRadius: 8, color: 'var(--accent-light)' }}>CORE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.manifest?.description || p.filename}</div>
                  {p.hooks?.length > 0 && (
                    <div className="plugin-hooks">
                      {p.hooks.map(h => <span key={h} className="plugin-hook-tag">{h}</span>)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {!p.system && (
                    <button className="btn-icon" style={{ fontSize: 14, width: 32, height: 32 }}
                      onClick={() => setConfigOpen(p)}>⚙️</button>
                  )}
                  {!p.system && (
                    <button className={`toggle-switch ${p.enabled ? 'on' : ''}`} onClick={() => toggle(p.id, !p.enabled)} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountTab({ user, onLogout }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    auth.sessions().then(setSessions).catch(() => {});
  }, []);

  return (
    <div>
      <div className="settings-group">
        <div className="settings-group-title">Profile</div>
        <div className="settings-row"><span className="settings-label">Name</span><span className="settings-value">{user?.firstName} {user?.lastName}</span></div>
        <div className="settings-row"><span className="settings-label">Username</span><span className="settings-value">@{user?.username || 'N/A'}</span></div>
        <div className="settings-row"><span className="settings-label">Phone</span><span className="settings-value">{user?.phone || 'N/A'}</span></div>
        <div className="settings-row"><span className="settings-label">ID</span><span className="settings-value">{user?.id || 'N/A'}</span></div>
      </div>
      <div className="settings-group">
        <div className="settings-group-title">Sessions</div>
        {sessions.map(s => (
          <div key={s.user_id} className="settings-row">
            <span className="settings-label">User {s.user_id}</span>
            <span className="settings-value" style={{ fontSize: 12 }}>{s.created_at}</span>
          </div>
        ))}
      </div>
      <div className="settings-group">
        <div className="settings-group-title">Danger Zone</div>
        <button className="btn btn-ghost" onClick={onLogout} style={{ color: 'var(--danger)', width: '100%' }}>Log Out</button>
      </div>
    </div>
  );
}

export default function Settings({ user, onClose, onLogout, initialTab = 'plugins', onFontSizeChange, onDensityChange }) {
  const [tab, setTab] = useState(initialTab);

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'plugins', label: 'Plugins', icon: '⚡' },
    { id: 'account', label: 'Account', icon: '👤' },
  ];

  return (
    <div className="settings-panel">
      <div className="settings-header glass-light">
        <h2>Settings</h2>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 12px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '12px 8px', background: 'none', border: 'none',
              color: tab === t.id ? 'var(--accent-light)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              transition: 'all 0.2s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="settings-content">
        {tab === 'general' && <GeneralTab onFontSizeChange={onFontSizeChange} onDensityChange={onDensityChange} />}
        {tab === 'plugins' && <PluginsTab />}
        {tab === 'account' && <AccountTab user={user} onLogout={onLogout} />}
      </div>
    </div>
  );
}
