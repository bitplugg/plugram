const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const { Api } = require('gramjs');
const db = require('../db');
const plugramRuntime = require('../plugram/runtime');
const { setupHandlers } = require('./handlers');

let client = null;
let sessionString = null;
let currentUser = null;
let ghostMode = false;

function getClient() { return client; }
function getCurrentUser() { return currentUser; }
function isGhostMode() { return ghostMode; }
function setGhostMode(v) { ghostMode = v; }

async function startClient(sessionStr, apiId, apiHash) {
  const stringSession = new StringSession(sessionStr || '');
  client = new TelegramClient(stringSession, Number(apiId), apiHash, {
    connectionRetries: 5, useWSS: true,
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
  const gRow = db.prepare("SELECT value FROM settings WHERE key = 'ghost_mode'").get();
  if (gRow) ghostMode = gRow.value === 'true';
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
  client = new TelegramClient(stringSession, Number(apiId), apiHash, { connectionRetries: 5, useWSS: true });
  await client.connect();
  const result = await client.sendCode({ apiId: Number(apiId), apiHash }, phone);
  sessionString = client.session.save();
  return { phoneCodeHash: result.phoneCodeHash, phone };
}

async function signIn(phone, code, phoneCodeHash) {
  if (!client) throw new Error('Client not initialized');
  try {
    await client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCode: code, phoneCodeHash }));
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
    id: String(d.id), type: d.isUser ? 'user' : d.isGroup ? 'group' : d.isChannel ? 'channel' : 'user',
    title: d.name || '', username: d.username || '', unreadCount: d.unreadCount || 0,
    lastMessage: d.message?.message || '', lastMessageDate: d.message?.date || null, photo: '',
    pinned: d.pinned ? 1 : 0,
    online: null,
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
        mediaData = JSON.stringify({ id: m.media.document?.id, size: m.media.document?.size, mime: m.media.document?.mimeType, fileName: attr?.fileName || 'file' });
      } else if (m.media.className === 'MessageMediaSticker') { mediaType = 'sticker'; mediaData = JSON.stringify({ emoji: m.media.alt || '' }); }
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
  if (!ghostMode) {
    await sendTyping(dialogId, 'typing');
  }
  const peer = await client.getEntity(Number(dialogId));
  const hookCtx = { dialogId, text, replyTo, cancelled: false };
  await plugramRuntime.runHook('onSend', hookCtx);
  if (hookCtx.cancelled) return null;
  const result = await client.sendMessage(peer, { message: hookCtx.text, replyTo: hookCtx.replyTo });
  return result;
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

async function searchMessages(query, dialogId = null) {
  if (!client) throw new Error('Client not initialized');
  if (dialogId) {
    const peer = await client.getEntity(Number(dialogId));
    const result = await client.getMessages(peer, { search: query, limit: 50 });
    return (result || []).map(m => ({
      id: m.id, text: m.message || '', date: m.date, dialogId, fromId: String(m.senderId || ''),
    }));
  }
  const result = await client.searchMessages(query, { limit: 50 });
  return (result.messages || []).map(m => ({
    id: m.id, text: m.message || '', date: m.date, dialogId: String(m.peerId?.userId || m.peerId?.channelId || ''),
    fromId: String(m.senderId || ''),
  }));
}

async function resolveUsername(username) {
  if (!client) throw new Error('Client not initialized');
  const e = await client.getEntity(username);
  return { id: String(e.id), username: e.username, title: e.title || `${e.firstName || ''} ${e.lastName || ''}` };
}

async function markAsRead(dialogId, maxId) {
  if (!client || ghostMode) return;
  const peer = await client.getEntity(Number(dialogId));
  await client.invoke(new Api.messages.ReadHistory({ peer, maxId: maxId || 0 }));
}

async function downloadMedia(message, outputPath) {
  if (!client) throw new Error('Client not initialized');
  return client.downloadMedia(message, { outputFile: outputPath });
}

async function sendTyping(dialogId, action = 'typing') {
  if (!client || ghostMode) return;
  const peer = await client.getEntity(Number(dialogId));
  let act;
  if (action === 'typing') act = new Api.SendMessageTypingAction();
  else if (action === 'record') act = new Api.SendMessageRecordAudioAction();
  else if (action === 'upload') act = new Api.SendMessageUploadAudioAction();
  else act = new Api.SendMessageTypingAction();
  try {
    await client.invoke(new Api.messages.SetTyping({ peer, action: act }));
  } catch {}
}

async function setOnline(online = true) {
  if (!client) return;
  if (ghostMode && online) return;
  try {
    await client.invoke(new Api.account.UpdateStatus({ offline: !online }));
  } catch {}
}

async function getSessions() {
  return db.prepare('SELECT user_id, created_at FROM sessions ORDER BY created_at DESC').all();
}

async function removeSession(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

async function forwardMessage(dialogId, fromDialogId, messageIds) {
  if (!client) throw new Error('Client not initialized');
  const fromPeer = await client.getEntity(Number(fromDialogId));
  const toPeer = await client.getEntity(Number(dialogId));
  const result = await client.forwardMessages(toPeer, { messages: messageIds, fromPeer });
  return result;
}

async function pinDialog(dialogId, pin = true) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  await client.invoke(new Api.messages.ToggleDialogPin({ peer, pinned: pin }));
}

async function getUserInfo(userId) {
  if (!client) throw new Error('Client not initialized');
  const users = await client.getUsers([Number(userId)]);
  if (!users || users.length === 0) return null;
  const u = users[0];
  return {
    id: String(u.id), firstName: u.firstName || '', lastName: u.lastName || '',
    username: u.username || '', phone: u.phone || '', photo: '',
    status: u.status?.className || 'offline',
    lastSeen: u.status?.wasOnline || null,
    commonChats: u.commonChatsCount || 0,
  };
}

async function getPinnedMessages(dialogId) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  try {
    const result = await client.invoke(new Api.messages.Search({
      peer, filter: new Api.InputMessagesFilterPinned(), q: '', limit: 50,
    }));
    return (result.messages || []).map(m => ({
      id: m.id, text: m.message || '', date: m.date, fromId: String(m.senderId || ''),
    }));
  } catch { return []; }
}

async function sendPoll(dialogId, question, options) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  const result = await client.invoke(new Api.messages.SendMedia({
    peer, media: new Api.InputMediaPoll({
      poll: new Api.Poll({
        id: BigInt(Date.now()),
        question,
        answers: options.map((o, i) => new Api.PollAnswer({ text: o, option: Buffer.from([i]) })),
        publicVoters: false, multiChoice: false,
      }),
    }), message: '', randomId: BigInt(Math.floor(Math.random() * 1e16)),
  }));
  return result;
}

async function toggleMute(dialogId, mute) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  const settings = await client.invoke(new Api.messages.GetPeerSettings({ peer }));
  const notifySettings = new Api.PeerNotifySettings({
    showPreviews: mute ? false : true, silent: mute, muteUntil: mute ? 2147483647 : 0,
  });
  await client.invoke(new Api.account.UpdateNotifySettings({ peer, settings: notifySettings }));
}

async function toggleArchive(dialogId, archive) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  const folderId = archive ? 1 : 0;
  await client.invoke(new Api.folders.EditPeerFolders({
    folderPeers: [new Api.InputFolderPeer({ peer, folderId })],
  }));
}

async function blockUser(userId) {
  if (!client) throw new Error('Client not initialized');
  await client.invoke(new Api.contacts.Block({ id: await client.getEntity(Number(userId)) }));
}

async function unblockUser(userId) {
  if (!client) throw new Error('Client not initialized');
  await client.invoke(new Api.contacts.Unblock({ id: await client.getEntity(Number(userId)) }));
}

async function addChatMember(chatId, userId) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(chatId));
  const user = await client.getEntity(Number(userId));
  await client.invoke(new Api.messages.AddChatUser({ chatPeer: peer, userId: user, fwdLimit: 50 }));
}

async function deleteChatMember(chatId, userId) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(chatId));
  const user = await client.getEntity(Number(userId));
  await client.invoke(new Api.messages.DeleteChatUser({ chatPeer: peer, userId: user }));
}

async function sendLocation(dialogId, lat, lon) {
  if (!client) throw new Error('Client not initialized');
  const peer = await client.getEntity(Number(dialogId));
  const result = await client.invoke(new Api.messages.SendMedia({
    peer, media: new Api.InputMediaGeoPoint({
      geoPoint: new Api.GeoPoint({ lat, lon, accessHash: BigInt(0) }),
    }), message: '', randomId: BigInt(Math.floor(Math.random() * 1e16)),
  }));
  return result;
}

async function getSavedMessages() {
  if (!client) throw new Error('Client not initialized');
  const me = await client.getMe();
  return { id: String(me.id), title: 'Saved Messages', type: 'saved' };
}

async function logout() {
  if (!client) return;
  try { await client.invoke(new Api.auth.LogOut()); } catch {}
  client = null; currentUser = null; sessionString = null;
}

module.exports = {
  getClient, getCurrentUser, isGhostMode, setGhostMode,
  startClient, connectWithSession, sendCode, signIn, signInWith2fa,
  getDialogs, getMessages, sendMessage, sendMedia, deleteMessages, editMessage,
  getContacts, searchMessages, resolveUsername, markAsRead,
  downloadMedia, sendTyping, setOnline, getSessions, removeSession, logout,
  forwardMessage, pinDialog, getUserInfo, getPinnedMessages,
  sendPoll, toggleMute, toggleArchive, blockUser, unblockUser,
  addChatMember, deleteChatMember, sendLocation, getSavedMessages,
};
