import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@crm/shared';
import { getAccessToken } from './api-client';
import { LIMITS } from '@crm/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const WS_URL = import.meta.env.VITE_WS_URL || '';

export function getSocket(): TypedSocket | null {
  return socket;
}

export function connectSocket(): TypedSocket {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token) throw new Error('No access token for socket connection');

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: LIMITS.SOCKET_RECONNECT_MAX_MS,
  }) as TypedSocket;

  heartbeatInterval = setInterval(() => {
    socket?.emit('heartbeat');
  }, LIMITS.HEARTBEAT_INTERVAL_MS);

  socket.on('disconnect', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  socket?.disconnect();
  socket = null;
}
