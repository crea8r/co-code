import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { apiGet, apiPost, type Channel, type Message } from '../lib/api';
import { createSocket } from '../lib/ws';
import { useAuthStore } from '../state/auth';

type TypingState = {
  entityId: string;
  entityType: string;
  expiresAt: number;
};

type PresenceEvent = {
  entityId: string;
  entityType: string;
  status: string;
  timestamp: number;
};

type AttentionEvent = {
  agentId: string;
  state: string;
  queueSize: number;
  timestamp: number;
};

export default function ChannelView() {
  const { id } = useParams();
  const token = useAuthStore((state) => state.token);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(true);
  const [socketStatus, setSocketStatus] = useState<'idle' | 'open' | 'closed'>(
    'idle'
  );
  const [composer, setComposer] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
  const [attentionEvents, setAttentionEvents] = useState<AttentionEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<number>(0);
  const lastTypingSentRef = useRef<number>(0);

  const orderedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : a.createdAt;
      const bTime = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : b.createdAt;
      return aTime - bTime;
    });
  }, [messages]);

  useEffect(() => {
    if (!token || !id) return;

    const load = async () => {
      try {
        const channelData = await apiGet<{ channel: Channel }>(
          `/channels/${id}`,
          token
        );
        setChannel(channelData.channel);
        setJoined(true);

        const messageData = await apiGet<{ messages: Message[] }>(
          `/channels/${id}/messages`,
          token
        );
        setMessages(messageData.messages);
        setError(null);
      } catch (err) {
        setJoined(false);
        setError((err as Error).message);
      }
    };

    load();
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    const socket = createSocket();
    socketRef.current = socket;
    setSocketStatus('idle');

    const send = (payload: object) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    };

    socket.addEventListener('open', () => {
      setSocketStatus('open');
      send({ type: 'authenticate', token, timestamp: Date.now() });
    });
    socket.addEventListener('close', () => setSocketStatus('closed'));
    socket.addEventListener('error', () => setSocketStatus('closed'));
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          message?: Message;
          entityId?: string;
          entityType?: string;
          status?: string;
          agentId?: string;
          state?: string;
          queueSize?: number;
          timestamp?: number;
        };

        if (data.type === 'authenticated' && id) {
          send({ type: 'join_channel', channelId: id, timestamp: Date.now() });
        }

        if (data.type === 'new_message' && data.message) {
          if (data.message.channelId !== id) return;
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.message?.id)) {
              return prev;
            }
            return [...prev, data.message];
          });
        }

        if (data.type === 'member_typing' && data.entityId && data.entityType) {
          const expiresAt = Date.now() + 3000;
          setTypingUsers((prev) => {
            const without = prev.filter((entry) => entry.entityId !== data.entityId);
            return [...without, { entityId: data.entityId, entityType: data.entityType, expiresAt }];
          });
        }

        if (data.type === 'presence_change' && data.entityId && data.entityType && data.status) {
          setPresenceEvents((prev) => {
            const next = [
              {
                entityId: data.entityId,
                entityType: data.entityType,
                status: data.status,
                timestamp: data.timestamp ?? Date.now(),
              },
              ...prev,
            ];
            return next.slice(0, 6);
          });
        }

        if (data.type === 'attention_change' && data.agentId && data.state) {
          setAttentionEvents((prev) => {
            const next = [
              {
                agentId: data.agentId,
                state: data.state,
                queueSize: data.queueSize ?? 0,
                timestamp: data.timestamp ?? Date.now(),
              },
              ...prev,
            ];
            return next.slice(0, 6);
          });
        }
      } catch {
        // ignore malformed events
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token, id]);

  useEffect(() => {
    window.clearInterval(typingTimerRef.current);
    typingTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => prev.filter((entry) => entry.expiresAt > now));
    }, 1000);

    return () => window.clearInterval(typingTimerRef.current);
  }, []);

  const handleJoin = async () => {
    if (!token || !id) return;
    try {
      const data = await apiPost<{ channel: Channel }>(
        `/channels/${id}/join`,
        {},
        token
      );
      setChannel(data.channel);
      setJoined(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!composer.trim() || !id || !socketRef.current) return;

    socketRef.current.send(
      JSON.stringify({
        type: 'send_message',
        channelId: id,
        content: { text: composer.trim() },
        timestamp: Date.now(),
      })
    );
    setComposer('');
  };

  const handleComposerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setComposer(event.target.value);

    if (!socketRef.current || !id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1200) return;
    lastTypingSentRef.current = now;

    socketRef.current.send(
      JSON.stringify({
        type: 'typing',
        channelId: id,
        timestamp: Date.now(),
      })
    );
  };

  return (
    <div className="channel">
      <Card
        title={channel ? `#${channel.name}` : 'Channel'}
        description={channel?.description ?? 'Real-time messages and agent output.'}
      >
        <div className="channel__meta">
          <p className="panel__meta">WebSocket: {socketStatus}</p>
          {typingUsers.length ? (
            <p className="panel__meta">
              Typing: {typingUsers
                .map((entry) => `${entry.entityType}:${entry.entityId.slice(0, 6)}`)
                .join(', ')}
            </p>
          ) : null}
        </div>
        {!joined ? (
          <div className="empty">
            <p>Join this channel to view messages.</p>
            <Button variant="primary" onClick={handleJoin}>
              Join channel
            </Button>
            {error ? <p className="form__error">{error}</p> : null}
          </div>
        ) : (
          <div className="message-list">
            {orderedMessages.length ? (
              orderedMessages.map((message) => (
                <div key={message.id} className="message">
                  <div>
                    <p className="message__author">{message.senderType}</p>
                    <p className="message__body">
                      {message.content?.text ?? '[no text]'}
                    </p>
                  </div>
                  <span className="message__time">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="empty">No messages yet.</p>
            )}
          </div>
        )}

        {joined ? (
          <form className="composer" onSubmit={handleSend}>
            <input
              className="composer__input"
              placeholder="Write a message..."
              value={composer}
              onChange={handleComposerChange}
            />
            <Button variant="primary" type="submit">
              Send
            </Button>
          </form>
        ) : null}
      </Card>

      <Card title="Presence" description="Live status updates from the collective.">
        <div className="card__stack">
          {presenceEvents.length ? (
            presenceEvents.map((event) => (
              <div key={`${event.entityId}-${event.timestamp}`} className="chip">
                <span className="chip__name">
                  {event.entityType}:{event.entityId.slice(0, 6)}
                </span>
                <span className="chip__meta">{event.status}</span>
              </div>
            ))
          ) : (
            <p className="empty">No presence updates yet.</p>
          )}
        </div>
      </Card>

      <Card title="Attention" description="Agent attention state for mentions.">
        <div className="card__stack">
          {attentionEvents.length ? (
            attentionEvents.map((event) => (
              <div key={`${event.agentId}-${event.timestamp}`} className="chip">
                <span className="chip__name">
                  agent:{event.agentId.slice(0, 6)}
                </span>
                <span className="chip__meta">
                  {event.state}
                  {event.queueSize ? ` · ${event.queueSize} queued` : ''}
                </span>
              </div>
            ))
          ) : (
            <p className="empty">No attention updates yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
