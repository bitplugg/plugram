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

router.get('/bundle/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', '..', 'plugins', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Plugin not found' });
    const code = fs.readFileSync(filePath, 'utf-8');
    const manifest = plugramRuntime.parseManifest(code, filename);
    const bundle = {
      manifest,
      code,
      filename,
      size: Buffer.byteLength(code, 'utf-8'),
      compiledAt: new Date().toISOString(),
    };
    res.json(bundle);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/docs', (req, res) => {
  res.json({
    hooks: [
      { name: 'onMessage', params: ['text', 'fromId', 'chatId', 'messageId', 'date', 'isPrivate', 'isGroup', 'isChannel', 'mediaType', 'replyTo'], description: 'Triggered on any new message' },
      { name: 'onCommand', params: ['command', 'args', 'chatId', 'fromId', 'messageId'], description: 'Triggered on /commands' },
      { name: 'onSend', params: ['dialogId', 'text', 'replyTo', 'cancelled'], description: 'Before sending a message' },
    ],
    functions: [
      { name: 'sendMessage(chatId, text)', description: 'Send a text message' },
      { name: 'deleteMessages(chatId, [ids])', description: 'Delete messages by IDs' },
      { name: 'editMessage(chatId, msgId, text)', description: 'Edit a message' },
      { name: 'getMessages(chatId, limit)', description: 'Fetch recent messages' },
      { name: 'getDialogs()', description: 'Get all dialogs' },
      { name: 'getContacts()', description: 'Get contact list' },
      { name: 'getMe()', description: 'Get current user info' },
      { name: 'resolveUsername(name)', description: 'Resolve @username to entity' },
      { name: 'searchMessages(query)', description: 'Search messages globally' },
      { name: 'setOnline(bool)', description: 'Set online status' },
      { name: 'markAsRead(chatId, maxId)', description: 'Mark messages as read' },
      { name: 'sleep(ms)', description: 'Delay execution' },
      { name: 'log(...)', description: 'Console log' },
      { name: 'getConfig(pluginId)', description: 'Get plugin config' },
      { name: 'setConfig(pluginId, key, val)', description: 'Set plugin config' },
      { name: 'toString(val)', description: 'Convert to string' },
      { name: 'toNumber(val)', description: 'Convert to number' },
      { name: 'length(arr)', description: 'Array length' },
      { name: 'random(min, max)', description: 'Random integer' },
    ],
    metadata: {
      fields: [
        { name: '__name__', type: 'string', required: true, description: 'Display name' },
        { name: '__id__', type: 'string', required: true, description: 'Unique plugin ID' },
        { name: '__version__', type: 'string', description: 'Semantic version' },
        { name: '__author__', type: 'string', description: 'Plugin author' },
        { name: '__description__', type: 'string', description: 'Short description' },
        { name: '__icon__', type: 'string', description: 'Emoji icon' },
        { name: '__config__', type: 'object', description: 'JSON config schema' },
      ],
    },
    examples: [
      {
        title: 'Basic Auto-Reply',
        code: '__name__: "Auto Reply"\n__id__: "autoreply"\n__version__: "1.0"\n__icon__: "🤖"\n\nhook onMessage(text, fromId, chatId) {\n  if (text == "ping") {\n    sendMessage(chatId, "pong")\n  }\n}',
      },
    ],
  });
});

router.get('/check-updates', async (req, res) => {
  try {
    const https = require('https');
    const repoUrl = 'https://api.github.com/repos/bitplugg/plugram-plugin/contents';
    https.get(repoUrl, { headers: { 'User-Agent': 'Plugram' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const files = JSON.parse(data);
          const remote = files.filter(f => f.name.endsWith('.plugram')).map(f => ({
            name: f.name, url: f.download_url, size: f.size,
          }));
          const local = require('fs').readdirSync(require('path').join(__dirname, '..', '..', 'plugins'))
            .filter(f => f.endsWith('.plugram'));
          const updates = remote.filter(r => !local.includes(r.name));
          res.json({ total: remote.length, local: local.length, updates });
        } catch { res.json({ error: 'Parse error', total: 0, local: 0, updates: [] }); }
      });
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/install', async (req, res) => {
  try {
    const { url, filename } = req.body;
    if (!url || !filename) return res.status(400).json({ error: 'Missing params' });
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        const filePath = path.join(__dirname, '..', '..', 'plugins', filename);
        fs.writeFileSync(filePath, data);
        plugramRuntime.register(filename, data);
        const manifest = plugramRuntime.parseManifest(data, filename);
        const db = require('../db');
        const existing = db.prepare('SELECT id FROM plugins WHERE filename = ?').get(filename);
        if (!existing) {
          db.prepare('INSERT INTO plugins (name, filename, display_name, icon, system, config_schema) VALUES (?, ?, ?, ?, ?, ?)')
            .run(manifest.id, filename, manifest.name, manifest.icon, manifest.system ? 1 : 0, JSON.stringify(manifest.configSchema));
        }
        res.json({ success: true, filename, manifest });
      });
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
