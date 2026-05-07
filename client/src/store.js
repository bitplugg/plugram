const listeners = new Map();
let state = {
  connected: false,
  user: null,
  dialogs: [],
  messages: {},
  activeDialog: null,
  plugins: [],
  settings: {},
  theme: 'dark',
  loading: false,
};

export function getState() { return state; }

export function setState(updates) {
  Object.assign(state, updates);
  for (const [key, fns] of listeners) {
    if (updates[key] !== undefined) {
      fns.forEach(fn => fn(state[key]));
    }
  }
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}
