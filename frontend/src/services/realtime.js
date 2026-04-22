const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (!API_BASE_URL) return 'ws://127.0.0.1:8000/ws';
  const base = new URL(API_BASE_URL, window.location.origin);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = '/ws';
  return base.toString();
};

class RealtimeClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.lastSeenTimestamp = localStorage.getItem('lastSeenRealtimeTimestamp') || null;
    this.manuallyClosed = false;
  }

  connect(userId = localStorage.getItem('userId') || '') {
    this.userId = userId;
    if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) return;
    this.manuallyClosed = false;
    this.socket = new WebSocket(getWebSocketUrl());

    this.socket.onopen = () => {
      this.sync();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'pong') {
        window.clearTimeout(this.pongTimer);
        return;
      }
      if (message.timestamp) {
        this.lastSeenTimestamp = message.timestamp;
        localStorage.setItem('lastSeenRealtimeTimestamp', message.timestamp);
      }
      if (message.type === 'SYNC_MISSED_EVENTS') {
        (message.data || []).forEach((item) => this.emit(item));
        return;
      }
      this.emit(message);
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      if (!this.manuallyClosed) this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  subscribe(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
    this.connect();
    return () => this.listeners.get(type)?.delete(handler);
  }

  emit(message) {
    const typed = this.listeners.get(message.type) || new Set();
    const all = this.listeners.get('*') || new Set();
    [...typed, ...all].forEach((handler) => handler(message));
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  sync() {
    this.send({
      type: 'sync',
      user_id: this.userId,
      last_seen_timestamp: this.lastSeenTimestamp,
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping' });
      this.pongTimer = window.setTimeout(() => this.socket?.close(), 10_000);
    }, 30_000);
  }

  stopHeartbeat() {
    window.clearInterval(this.heartbeatTimer);
    window.clearTimeout(this.pongTimer);
  }

  scheduleReconnect() {
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => this.connect(this.userId), 2_000);
  }

  close() {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    window.clearTimeout(this.reconnectTimer);
    this.socket?.close();
  }
}

export const realtimeClient = new RealtimeClient();
