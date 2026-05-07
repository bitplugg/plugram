const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const { Api } = require('gramjs');
const db = require('../db');
const plugramRuntime = require('../plugram/runtime');
const { setupHandlers } = require('./handlers');

let client = null;
let sessionString = null;
let currentUser = null;

function getClient() { return client; }
function getCurrentUser() { return currentUser; }

async function startClient(sessionStr, apiId, apiHash) {
  const stringSession = new StringSession(sessionStr || '');
  client = new TelegramClient(stringSession, Number(apiId), apiHash, {
    connectionRetries: 5,
    useWSS: true,
  });

  await client.start({
    phoneNumber: async () => { throw new Error('Phone required'); },
    password: async () => { throw new Error('Password required'); },
    phoneCode: async () => { throw new Error('Code required'); },
    onError: (err) => console.error('Auth error:', err),
  });

  const saved = client.session.save();
  sessionString = saved;
  const me = await client.getMe();
  currentUser = me;

  const existing = db.prepare('SELECT id FROM sessions WHERE user_id = ?').get(String(me.id));
  if (existing) {
    db.prepare('UPDATE sessions SET session_string = ? WHERE user_id = ?').run(saved, String(me.id));
  } else {
    db.prepare('INSERT INTO sessions (user_id, session_string) VALUES (?, ?)').run(String(me.id), saved);
  }

  await setupHandlers();
  return me;
}

async function connectWithSession(userId) {
  const row = db.prepare('SELECT session_string FROM sessions WHERE user_id = ?').get(userId);
  if (!row) throw new Error('Session not found');
  const config = db.prepare("SELECT value FROM settings WHERE key = 'api_id'").get();
  const hashRow = db.prepare("SELECT value FROM settings WHERE key = 'api_hash'").get();
  if (!config || !hashRow) throw new Error('API credentials not configured');
  return startClient(row.session_string, config.value, hashRow.value);
}

async function sendCode(phone, apiId, apiHash) {
  const stringSession = new StringSession('');
  client = new TelegramClient(stringSession, Number(apiId), apiHash, {
    connectionRetries: 5,
    useWSS: true,
  });
  await client.connect();
  const result = await client.sendCode({ apiId: Number(apiId), apiHash }, phone);
  sessionString = client.session.save();
  return { phoneCodeHash: result.phoneCodeHash, phone };
}

async function signIn(phone, code, phoneCodeHash) {
  if (!client) throw new Error('Client not initialized');
  try {
    await client.invoke(new Api.auth.SignIn({
      phoneNumber: phone, phoneCode: code, phoneCodeHash,
    }));
  } catch (e) {
    if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') return { need2fa: true };
    throw e;
  }
  const me = await client.getMe();
  currentUser = me;
  const saved = client.session.save();
  const existing = db.prepare('SELECT id FROM sessions WHERE user_id = ?').get(String(me.id));
  if (existing) {
    db.prepare('UPDATE sessions SET session_string = ? WHERE user_id = ?').run(saved, String(me.id));
  } else {
    db.prepare('INSERT INTO sessions (user_id, session_string) VALUES (?, ?)').run(String(me.id), saved);
  }
  await setupHandlers();
  return { user: me, session: saved };
}

async function signInWith2fa(password) {
  if (!client) throw new Error('Client not initialized');
  await client.signInWithPassword({ password });
  const me = await client.getMe();
  currentUser = me;
  const saved = client.session.save();
  const existing = db.prepare('SELECT id FROM sessions WHERE user_id = ?').get(String(me.id));
  if (existing) {
    db.prepare('UPDATE sessions SET session_string = ? WHERE user_id = ?').run(saved, String(me.id));
  } else {
    db.prepare('INSERT INTO sessions (user_id, session_string) VALUES (?, ?)').run(String(me.id), saved);
  }
  await setupHandlers();
  return { user: me, session: saved };
}

async function getDialogs() {
  if (!client) throw new Error('Client not initialized');
  const result = await client.getDialogs({});
  return result.map(d => ({
    id: String(d.id),
    type: d.isUser ? 'user' : d.isGroup ? 'group' : d.isChannel ? 'channel' : 'user',
    title: d.name || '',
    username: d.username || '',
    unreadCount: d.unreadCount || 0,
    lastMessage: d.message?.message || '',
    lastMessageDate: d.message?.date || null,
    photo: '',
  }));
}

async function getMessages(dialogId, limit = 50, offsetId = 0) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  const result = await client.getMessages(peer, { limit, offsetId });
  return result.map(m => {
    let mediaType = null, mediaData = null;
    if (m.media) {
      if (m.media.className === 'MessageMediaPhoto') mediaType = 'photo';
      else if (m.media.className === 'MessageMediaDocument') {
        const attr = m.media.document?.attributes?.[0];
        if (attr?.className === 'DocumentAttributeAudio' && attr?.voice) mediaType = 'voice';
        else if (attr?.className === 'DocumentAttributeVideo') mediaType = 'video';
        else if (m.media.document?.mimeType?.startsWith('image')) mediaType = 'photo';
        else mediaType = 'file';
        mediaData = JSON.stringify({
          id: m.media.document?.id, size: m.media.document?.size,
          mime: m.media.document?.mimeType, fileName: attr?.fileName || 'file',
        });
      } else if (m.media.className === 'MessageMediaSticker') {
        mediaType = 'sticker';
        mediaData = JSON.stringify({ emoji: m.media.alt || '' });
      }
    }
    return {
      id: m.id, dialogId, fromId: String(m.senderId || ''), text: m.message || '',
      mediaType, mediaData, replyTo: m.replyTo?.replyToMsgId || null,
      date: m.date, edited: m.editDate ? 1 : 0, out: m.out ? 1 : 0,
    };
  });
}

async function sendMessage(dialogId, text, replyTo = null) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  const hookCtx = { dialogId, text, replyTo, cancelled: false };
  await plugramRuntime.runHook('onSend', hookCtx);
  if (hookCtx.cancelled) return null;
  return client.sendMessage(peer, { message: hookCtx.text, replyTo: hookCtx.replyTo });
}

async function sendMedia(dialogId, filePath, replyTo = null) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  return client.sendFile(peer, { file: filePath, replyTo });
}

async function deleteMessages(dialogId, ids) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  await client.deleteMessages(peer, ids, { revoke: true });
}

async function editMessage(dialogId, messageId, text) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  await client.editMessage(peer, { message: messageId, text });
}

async function getContacts() {
  if (!client) throw new Error('Client not initialized');
  const result = await client.getContacts();
  return (result.users || []).map(u => ({
    id: String(u.id), firstName: u.firstName || '', lastName: u.lastName || '',
    username: u.username || '', phone: u.phone || '', photo: '',
  }));
}

async function searchMessages(query) {
  if (!client) throw new Error('Client not initialized');
  const result = await client.searchMessages(query, { limit: 50 });
  return (result.messages || []).map(m => ({
    id: m.id, text: m.message || '', date: m.date, dialogId: String(m.peerId?.userId || m.peerId?.channelId || ''),
  }));
}

async function resolveUsername(username) {
  if (!client) throw new Error('Client not initialized');
  const e = await client.getEntity(username);
  return { id: String(e.id), username: e.username, title: e.title || `${e.firstName || ''} ${e.lastName || ''}` };
}

async function markAsRead(dialogId, maxId) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  await client.invoke(new Api.messages.ReadHistory({ peer, maxId: maxId || 0 }));
}

async function downloadMedia(message, outputPath) {
  if (!client) throw new Error('Client not initialized');
  return client.downloadMedia(message, { outputFile: outputPath });
}

async function setOnline(online = true) {
  if (!client) throw new Error('Client not initialized');
  try {
    await client.invoke(new Api.account.UpdateStatus({ offline: !online }));
  } catch {}
}

async function logout() {
  if (!client) throw new Error('Client not initialized');
  try { await client.invoke(new Api.auth.LogOut()); } catch {}
  client = null; currentUser = null; sessionString = null;
}

module.exports = {
  getClient, getCurrentUser, startClient, connectWithSession,
  sendCode, signIn, signInWith2fa, getDialogs, getMessages,
  sendMessage, sendMedia, deleteMessages, editMessage,
  getContacts, searchMessages, resolveUsername, markAsRead,
  downloadMedia, setOnline, logout,
};
