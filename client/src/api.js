const API = process.env.REACT_APP_API || 'http://localhost:3001';

async function request(path, opts = {}) {
  const res = await fetch(`${API}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers }, ...opts,
  });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || 'Request failed'); }
  return res.json();
}

export const auth = {
  sendCode: (phone, apiId, apiHash) => request('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone, apiId, apiHash }) }),
  signIn: (code) => request('/auth/sign-in', { method: 'POST', body: JSON.stringify({ code }) }),
  twoFA: (password) => request('/auth/2fa', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  sessions: () => request('/auth/sessions'),
  removeSession: (userId) => request(`/auth/sessions/${userId}`, { method: 'DELETE' }),
};

export const dialogs = {
  list: () => request('/dialogs'),
  search: (q) => request(`/dialogs/search?q=${encodeURIComponent(q)}`),
  resolve: (username) => request(`/dialogs/resolve?username=${encodeURIComponent(username)}`),
  read: (dialogId, maxId) => request('/dialogs/read', { method: 'POST', body: JSON.stringify({ dialogId, maxId }) }),
  pin: (dialogId, pin) => request('/dialogs/pin', { method: 'POST', body: JSON.stringify({ dialogId, pin }) }),
};

export const messages = {
  list: (dialogId, limit = 50, offsetId = 0) => request(`/messages/${dialogId}?limit=${limit}&offsetId=${offsetId}`),
  search: (dialogId, q) => request(`/messages/search/${dialogId}?q=${encodeURIComponent(q)}`),
  searchGlobal: (q) => request(`/messages/search/global?q=${encodeURIComponent(q)}`),
  send: (dialogId, text, replyTo) => request('/messages/send', { method: 'POST', body: JSON.stringify({ dialogId, text, replyTo }) }),
  forward: (dialogId, fromDialogId, messageIds) => request('/messages/forward', { method: 'POST', body: JSON.stringify({ dialogId, fromDialogId, messageIds }) }),
  edit: (dialogId, messageId, text) => request('/messages/edit', { method: 'POST', body: JSON.stringify({ dialogId, messageId, text }) }),
  delete: (dialogId, messageIds) => request('/messages/delete', { method: 'POST', body: JSON.stringify({ dialogId, messageIds }) }),
  typing: (dialogId, action) => request('/messages/typing', { method: 'POST', body: JSON.stringify({ dialogId, action }) }),
  read: (dialogId, maxId) => request(`/messages/read/${dialogId}`, { method: 'POST', body: JSON.stringify({ maxId }) }),
  pinned: (dialogId) => request(`/messages/pinned/${dialogId}`),
};

export const actions = {
  poll: (dialogId, question, options) => request('/actions/poll', { method: 'POST', body: JSON.stringify({ dialogId, question, options }) }),
  mute: (dialogId, mute) => request('/actions/mute', { method: 'POST', body: JSON.stringify({ dialogId, mute }) }),
  archive: (dialogId, archive) => request('/actions/archive', { method: 'POST', body: JSON.stringify({ dialogId, archive }) }),
  block: (userId) => request('/actions/block', { method: 'POST', body: JSON.stringify({ userId }) }),
  unblock: (userId) => request('/actions/unblock', { method: 'POST', body: JSON.stringify({ userId }) }),
  groupAdd: (chatId, userId) => request('/actions/group/add', { method: 'POST', body: JSON.stringify({ chatId, userId }) }),
  groupRemove: (chatId, userId) => request('/actions/group/remove', { method: 'POST', body: JSON.stringify({ chatId, userId }) }),
  location: (dialogId, lat, lon) => request('/actions/location', { method: 'POST', body: JSON.stringify({ dialogId, lat, lon }) }),
  saved: () => request('/actions/saved'),
};

export const users = { get: (userId) => request(`/users/${userId}`) };
export const contacts = { list: () => request('/contacts') };

export const media = {
  send: (dialogId, file, replyTo) => {
    const fd = new FormData(); fd.append('file', file); fd.append('dialogId', dialogId);
    if (replyTo) fd.append('replyTo', replyTo);
    return fetch(`${API}/api/media/send`, { method: 'POST', body: fd }).then(r => r.json());
  },
  upload: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return fetch(`${API}/api/media/upload`, { method: 'POST', body: fd }).then(r => r.json());
  },
};

export const plugins = {
  list: () => request('/plugins'),
  toggle: (id, enabled) => request('/plugins/toggle', { method: 'POST', body: JSON.stringify({ id, enabled }) }),
  setConfig: (id, config) => request('/plugins/config', { method: 'POST', body: JSON.stringify({ id, config }) }),
  reload: () => request('/plugins/reload', { method: 'POST' }),
  remove: (id) => request(`/plugins/${id}`, { method: 'DELETE' }),
  bundle: (filename) => request(`/plugins/bundle/${filename}`),
  docs: () => request('/plugins/docs'),
  checkUpdates: () => request('/plugins/check-updates'),
  install: (url, filename) => request('/plugins/install', { method: 'POST', body: JSON.stringify({ url, filename }) }),
};

export const settings = {
  get: () => request('/settings'),
  set: (key, value) => request('/settings', { method: 'POST', body: JSON.stringify({ key, value }) }),
  getKey: (key) => request(`/settings/${key}`),
};

export const me = () => request('/me');
export const status = () => request('/status');
