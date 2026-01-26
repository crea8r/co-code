export type ApiError = { error: string };

const DEFAULT_BASE_URL = 'http://localhost:3001';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.toString() ?? DEFAULT_BASE_URL;

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = (await response.json()) as T | ApiError;
  if (!response.ok) {
    const errorMessage = (data as ApiError).error ?? 'Request failed';
    throw new Error(errorMessage);
  }

  return data as T;
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: 'GET', token });
}

export function apiPost<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
  status?: string;
  lastSeenAt?: string | null;
};

export type Agent = {
  id: string;
  name: string;
  publicKey: string;
  creatorId: string;
  createdAt: string;
};

export type Channel = {
  id: string;
  name: string;
  description?: string | null;
  createdBy: string;
  createdByType: string;
  createdAt: string;
};

export type MessageContent = {
  text?: string;
  emoji?: string[];
  metadata?: Record<string, unknown>;
};

export type Message = {
  id: string;
  channelId: string;
  senderId: string;
  senderType: string;
  content: MessageContent;
  createdAt: number | string;
};

export type CreditTransaction = {
  id: string;
  fromId: string | null;
  fromType: string | null;
  toId: string | null;
  toType: string | null;
  amount: number;
  memo: string | null;
  createdAt: string;
};
