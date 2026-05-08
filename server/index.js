const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { WebSocketServer } = require('ws');
const db = require('./db');
const authRoute = require('./api/auth');
const dialogsRoute = require('./api/dialogs');
const messagesRoute = require('./api/messages');
const contactsRoute = require('./api/contacts');
const pluginsRoute = require('./api/plugins');
const mediaRoute = require('./api/media');
const usersRoute = require('./api/users');
const actionsRoute = require('./api/actions');
const settingsRoute = require('./api/settings');
const tgClient = require('./telegram/client');
const tgHandlers = require('./telegram/handlers');
const pligRuntime = require('./plig/runtime');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/api/auth', authRoute);
app.use('/api/dialogs', dialogsRoute);
app.use('/api/messages', messagesRoute);
app.use('/api/contacts', contactsRoute);
app.use('/api/plugins', pluginsRoute);
app.use('/api/media', mediaRoute);
app.use('/api/users', usersRoute);
app.use('/api/actions', actionsRoute);
app.use('/api/settings', settingsRoute);

app.get('/api/me', async (req, res) => {
  try {
    const user = tgClient.getCurrentUser();
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName, phone: user.phone });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', name: 'Plugram', author: 'bitplugg' });
});

const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(event, data) {
  const msg = JSON.stringify({ event, data });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

tgHandlers.setBroadcast(broadcast);

async function loadPlugins() {
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  if (!fs.existsSync(pluginsDir)) return;
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.plugram'));
  for (const file of files) {
    try {
      const code = fs.readFileSync(path.join(pluginsDir, file), 'utf-8');
      pligRuntime.register(file, code);
      const existing = db.prepare('SELECT id FROM plugins WHERE filename = ?').get(file);
      if (!existing) {
        const manifest = pligRuntime.getManifest(file);
        db.prepare('INSERT INTO plugins (name, filename, enabled) VALUES (?, ?, 1)').run(manifest.name || file, file);
      }
    } catch (e) {
      console.error(`Failed to load plugin ${file}:`, e.message);
    }
  }
}

server.listen(PORT, async () => {
  console.log(`Plugram server running on port ${PORT}`);
  await loadPlugins();
  const sessions = db.prepare('SELECT * FROM sessions').all();
  if (sessions.length > 0) {
    try {
      await tgClient.connectWithSession(sessions[0].user_id);
      console.log('Auto-connected with session');
    } catch (e) {
      console.log('Session expired, re-login required');
    }
  }
});

// Scheduled message sender
setInterval(async () => {
  try {
    const pending = db.prepare(`SELECT * FROM scheduled_messages WHERE status = 'pending' AND schedule_at <= ?`).all(Math.floor(Date.now() / 1000));
    for (const msg of pending) {
      try {
        await tgClient.sendMessage(msg.dialog_id, msg.text);
        db.prepare(`UPDATE scheduled_messages SET status = 'sent' WHERE id = ?`).run(msg.id);
      } catch (e) {
        db.prepare(`UPDATE scheduled_messages SET status = 'failed', error = ? WHERE id = ?`).run(e.message, msg.id);
      }
    }
  } catch {}
}, 15000);
