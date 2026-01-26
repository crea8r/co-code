const DEFAULT_WS_URL = 'ws://localhost:3001/ws';

export const WS_URL =
  import.meta.env.VITE_WS_URL?.toString() ?? DEFAULT_WS_URL;

export function createSocket(token?: string): WebSocket {
  const url = new URL(WS_URL);
  if (token) {
    url.searchParams.set('token', token);
  }
  return new WebSocket(url.toString());
}
