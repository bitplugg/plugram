import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WSContext = createContext(null);

export function useWebSocket() {
  const ctx = useContext(WSContext);
  return ctx;
}

const listeners = {};
let globalWs = null;
let reconnectTimer = null;
let reconnectAttempt = 0;

function connect() {
  const API = process.env.REACT_APP_API || 'http://localhost:3001';
  const wsUrl = API.replace(/^http/, 'ws');
  const ws = new WebSocket(wsUrl);
  globalWs = ws;

  ws.onopen = () => { reconnectAttempt = 0; };
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type && listeners[data.type]) {
        listeners[data.type].forEach(fn => fn(data));
      }
      if (listeners['*']) listeners['*'].forEach(fn => fn(data));
    } catch {}
  };
  ws.onclose = () => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
    reconnectAttempt++;
    reconnectTimer = setTimeout(connect, delay);
  };
  ws.onerror = () => ws.close();
}

connect();

export function WebSocketProvider({ children }) {
  const api = useRef({
    on: (type, fn) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
      return () => { listeners[type] = listeners[type].filter(f => f !== fn); };
    },
    off: (type, fn) => {
      if (listeners[type]) listeners[type] = listeners[type].filter(f => f !== fn);
    },
  });

  useEffect(() => {
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (globalWs) globalWs.close();
    };
  }, []);

  return <WSContext.Provider value={api.current}>{children}</WSContext.Provider>;
}
