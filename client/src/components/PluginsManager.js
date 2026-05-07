import React, { useState, useEffect } from 'react';
import { plugins as pluginsApi } from '../api';

export default function PluginsManager({ onClose }) {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    pluginsApi.list().then(setPlugins).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id, enabled) => {
    await pluginsApi.toggle(id, enabled);
    load();
  };

  const reload = async () => {
    await pluginsApi.reload();
    load();
  };

  return (
    <div className="plugins-panel">
      <div className="plugins-header glass-light">
        <h2>⚡ Plugins</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={reload} title="Reload">🔄</button>
          <button className="btn-icon" onClick={onClose} title="Close">✕</button>
        </div>
      </div>
      <div className="plugins-list">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : plugins.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            No plugins installed
          </div>
        ) : plugins.map(p => (
          <div key={p.id} className="plugin-card">
            <div className="plugin-card-header">
              <span className="plugin-name">{p.manifest?.name || p.filename}</span>
              <button className={`toggle-switch ${p.enabled ? 'on' : ''}`} onClick={() => toggle(p.id, !p.enabled)} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.filename}</div>
            {p.manifest?.description && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{p.manifest.description}</div>
            )}
            {p.hooks && p.hooks.length > 0 && (
              <div className="plugin-hooks">
                {p.hooks.map(h => <span key={h} className="plugin-hook-tag">{h}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
