const express = require('express');
const router = express.Router();
const db = require('../db');
const plugramRuntime = require('../plugram/runtime');

router.get('/', (req, res) => {
  const dbPlugins = db.prepare('SELECT * FROM plugins ORDER BY system DESC, name ASC').all();
  const runtime = plugramRuntime.getPlugins();
  const merged = dbPlugins.map(p => {
    const rt = runtime.find(r => r.filename === p.filename);
    const manifest = rt?.manifest || {};
    return {
      id: p.id, name: p.name, filename: p.filename,
      displayName: p.display_name || manifest.displayName || p.name,
      icon: p.icon || manifest.icon || '⚡',
      enabled: !!p.enabled, system: !!p.system,
      config: JSON.parse(p.config || '{}'),
      configSchema: JSON.parse(p.config_schema || '{}'),
      hooks: rt?.hooks || [], manifest,
      installedAt: p.installed_at,
    };
  });
  const runtimeOnly = runtime.filter(r => !merged.find(m => m.filename === r.filename));
  for (const r of runtimeOnly) {
    merged.push({
      id: -1, name: r.manifest?.name || r.filename, filename: r.filename,
      displayName: r.manifest?.displayName || r.manifest?.name || r.filename,
      icon: r.manifest?.icon || '⚡', enabled: true, system: false,
      config: {}, configSchema: r.manifest?.configSchema || {},
      hooks: r.hooks, manifest: r.manifest,
      installedAt: null,
    });
  }
  res.json(merged);
});

router.post('/toggle', (req, res) => {
  const { id, enabled } = req.body;
  db.prepare('UPDATE plugins SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
  res.json({ success: true });
});

router.post('/config', (req, res) => {
  const { id, config } = req.body;
  db.prepare('UPDATE plugins SET config = ? WHERE id = ?').run(JSON.stringify(config), id);
  res.json({ success: true });
});

router.post('/reload', (req, res) => {
  try {
    plugramRuntime.reloadAll();
    const pluginsDir = require('path').join(__dirname, '..', '..', 'plugins');
    const fs = require('fs');
    if (fs.existsSync(pluginsDir)) {
      const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.plugram'));
      for (const file of files) {
        const manifest = plugramRuntime.parseManifest(fs.readFileSync(require('path').join(pluginsDir, file), 'utf-8'));
        const existing = db.prepare('SELECT id FROM plugins WHERE filename = ?').get(file);
        if (!existing) {
          db.prepare('INSERT INTO plugins (name, filename, display_name, icon, system, config_schema) VALUES (?, ?, ?, ?, ?, ?)')
            .run(manifest.name, file, manifest.displayName, manifest.icon, manifest.system ? 1 : 0, JSON.stringify(manifest.configSchema));
        }
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  const plugin = db.prepare('SELECT * FROM plugins WHERE id = ?').get(req.params.id);
  if (plugin && !plugin.system) {
    plugramRuntime.unregister(plugin.filename);
    db.prepare('DELETE FROM plugins WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

module.exports = router;
