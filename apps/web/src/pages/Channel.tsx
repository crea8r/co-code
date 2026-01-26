import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import {
  apiGet,
  apiPost,
  type Agent,
  type Channel,
  type Message,
  type User,
} from '../lib/api';
import { createSocket } from '../lib/ws';
import { buildMentionables, filterMentionables } from '../lib/mentions';
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
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionables, setMentionables] = useState<Array<{ id: string; type: 'user' | 'agent'; name: string }>>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<number>(0);
  const lastTypingSentRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const orderedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : a.createdAt;
      const bTime = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : b.createdAt;
      return aTime - bTime;
    });
  }, [messages]);

  const mentionSuggestions = useMemo(() => {
    return filterMentionables(mentionables, mentionQuery).slice(0, 5);
  }, [mentionables, mentionQuery]);

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
    const loadDirectory = async () => {
      try {
        const userData = await apiGet<{ users: User[] }>('/users', token);
        const agentData = await apiGet<{ agents: Agent[] }>('/agents', token);
        setMentionables(buildMentionables(userData.users, agentData.agents));
      } catch {
        // ignore
      }
    };
    loadDirectory();
  }, [token]);

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
    setMentionQuery('');
    setMentionStart(null);
  };

  const handleComposerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setComposer(nextValue);

    const cursor = event.target.selectionStart ?? nextValue.length;
    const before = nextValue.slice(0, cursor);
    const match = /@([\w-]*)$/.exec(before);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[1].length - 1);
    } else {
      setMentionQuery('');
      setMentionStart(null);
    }

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

  const handleSelectMention = (name: string) => {
    if (mentionStart === null || !inputRef.current) return;
    const currentValue = composer;
    const cursor = inputRef.current.selectionStart ?? currentValue.length;
    const before = currentValue.slice(0, mentionStart);
    const after = currentValue.slice(cursor);
    const nextValue = `${before}@${name} ${after}`;
    setComposer(nextValue);
    setMentionQuery('');
    setMentionStart(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const title = channel?.name?.startsWith('dm:')
    ? 'Direct Message'
    : channel
      ? `#${channel.name}`
      : 'Channel';

  return (
    <div className="channel">
      <Card
        title={title}
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
                      {(message.content?.text ?? '').split(/(\@[\w-]+)/g).map((part, index) => {
                        if (part.startsWith('@')) {
                          return (
                            <span key={`${message.id}-m-${index}`} className="mention">
                              {part}
                            </span>
                          );
                        }
                        return <span key={`${message.id}-t-${index}`}>{part}</span>;
                      })}
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
            <div className="composer__field">
              <input
                ref={inputRef}
                className="composer__input"
                placeholder="Write a message..."
                value={composer}
                onChange={handleComposerChange}
              />
              {mentionQuery && mentionSuggestions.length ? (
                <div className="mention-menu">
                  {mentionSuggestions.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      className="mention-item"
                      onClick={() => handleSelectMention(item.name)}
                    >
                      @{item.name}
                      <span className="mention-meta">{item.type}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
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
    </div>
  );
}
