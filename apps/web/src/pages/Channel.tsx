import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import {
  apiGet,
  apiPost,
  type Agent,
  type Channel,
  type ChannelMember,
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
  const user = useAuthStore((state) => state.user);
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
  const [activeTab, setActiveTab] = useState<'messages' | 'presence' | 'details'>('messages');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [messagePage, setMessagePage] = useState(1);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<number>(0);
  const lastTypingSentRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastMessagePageRef = useRef(1);

  const MESSAGE_PAGE_SIZE = 50;

  useEffect(() => {
    if (!id) return;
    return () => {
      try {
        localStorage.setItem(`channel:lastSeen:${id}`, `${Date.now()}`);
      } catch {
        // ignore storage issues
      }
    };
  }, [id]);

  const orderedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime =
        typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : a.createdAt;
      const bTime =
        typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : b.createdAt;
      return aTime - bTime;
    });
  }, [messages]);

  const messageBlocks = useMemo(() => {
    const blocks: Array<
      | { kind: 'day'; id: string; label: string }
      | { kind: 'unread'; id: string; label: string }
      | { kind: 'message'; id: string; message: Message; grouped: boolean; showMeta: boolean }
    > = [];

    let lastDay: string | null = null;
    let lastSenderKey: string | null = null;
    let lastMessageTime = 0;
    let unreadInserted = false;
    let lastSeen = 0;

    if (id) {
      try {
        const stored = localStorage.getItem(`channel:lastSeen:${id}`);
        lastSeen = stored ? Number(stored) : 0;
      } catch {
        lastSeen = 0;
      }
    }

    orderedMessages.forEach((message) => {
      const created =
        typeof message.createdAt === 'string'
          ? new Date(message.createdAt)
          : new Date(message.createdAt);
      const createdAt = created.getTime();
      const dayKey = created.toDateString();

      if (dayKey !== lastDay) {
        blocks.push({
          kind: 'day',
          id: `day-${dayKey}`,
          label: created.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
        });
        lastDay = dayKey;
        lastSenderKey = null;
        lastMessageTime = 0;
      }

      if (!unreadInserted && lastSeen && createdAt > lastSeen) {
        blocks.push({
          kind: 'unread',
          id: `unread-${message.id}`,
          label: 'New messages',
        });
        unreadInserted = true;
      }

      const senderKey = `${message.senderType}:${message.senderId}`;
      const withinGroupWindow = Math.abs(createdAt - lastMessageTime) < 5 * 60 * 1000;
      const grouped = senderKey === lastSenderKey && withinGroupWindow;
      blocks.push({
        kind: 'message',
        id: message.id,
        message,
        grouped,
        showMeta: !grouped,
      });
      lastSenderKey = senderKey;
      lastMessageTime = createdAt;
    });

    return blocks;
  }, [orderedMessages, id]);

  const totalMessagePages = useMemo(() => {
    return Math.max(1, Math.ceil(messageBlocks.length / MESSAGE_PAGE_SIZE));
  }, [messageBlocks.length]);

  useEffect(() => {
    if (messagePage > totalMessagePages) {
      setMessagePage(totalMessagePages);
    }
  }, [messagePage, totalMessagePages]);

  useEffect(() => {
    if (messagePage === lastMessagePageRef.current) {
      setMessagePage(totalMessagePages);
    }
    lastMessagePageRef.current = totalMessagePages;
  }, [totalMessagePages, messagePage]);

  const pagedMessageBlocks = useMemo(() => {
    const start = (messagePage - 1) * MESSAGE_PAGE_SIZE;
    return messageBlocks.slice(start, start + MESSAGE_PAGE_SIZE);
  }, [messageBlocks, messagePage]);

  const memberMap = useMemo(() => {
    return members.reduce<Record<string, ChannelMember>>((acc, member) => {
      acc[`${member.type}:${member.id}`] = member;
      return acc;
    }, {});
  }, [members]);

  const memberCountLabel = members.length ? `${members.length} members` : '—';

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

        const memberData = await apiGet<{ members: ChannelMember[] }>(
          `/channels/${id}/members`,
          token
        );
        setMembers(memberData.members);
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

          setMembers((prev) =>
            prev.map((member) =>
              member.id === data.entityId && member.type === data.entityType
                ? { ...member, status: data.status ?? member.status }
                : member
            )
          );
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
      const memberData = await apiGet<{ members: ChannelMember[] }>(
        `/channels/${id}/members`,
        token
      );
      setMembers(memberData.members);
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
      <section className="card channel__panel">
        <div className="channel__header">
          <div className="channel__headline">
            <p className="channel__eyebrow">Channel</p>
            <h2 className="channel__title">{title}</h2>
            <p className="channel__topic">
              {channel?.description ?? 'Real-time messages and agent output.'}
            </p>
          </div>
          <div className="channel__actions">
            <div className="channel__stats">
              <div className="chip chip--soft">
                <span className="chip__name">Visibility</span>
                <span className="chip__meta">{channel?.visibility ?? 'public'}</span>
              </div>
              <div className="chip chip--soft">
                <span className="chip__name">Members</span>
                <span className="chip__meta">{memberCountLabel}</span>
              </div>
              <div className="chip chip--soft">
                <span className="chip__name">Messages</span>
                <span className="chip__meta">{orderedMessages.length}</span>
              </div>
            </div>
            <div className="channel__status">
              <span className="channel__status-pill">WS {socketStatus}</span>
              {typingUsers.length ? (
                <span className="channel__status-pill">
                  Typing {typingUsers.length}
                </span>
              ) : null}
            </div>
            <div className="channel__quick-actions">
              <Button variant="ghost" type="button">
                Invite
              </Button>
              <Button variant="ghost" type="button">
                Pins
              </Button>
              <Button variant="ghost" type="button">
                Settings
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setDetailsOpen((prev) => !prev)}
            >
              {detailsOpen ? 'Hide details' : 'Show details'}
            </Button>
            {!joined ? (
              <Button variant="primary" onClick={handleJoin}>
                Join channel
              </Button>
            ) : null}
          </div>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'messages' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            Messages
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'presence' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('presence')}
          >
            Presence
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'details' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
        </div>
        <div className={`channel__body ${detailsOpen ? 'channel__body--split' : ''}`}>
          {activeTab === 'messages' ? (
            <>
              {!joined ? (
                <div className="empty">
                  <p>Join this channel to view messages.</p>
                  {error ? <p className="form__error">{error}</p> : null}
                </div>
              ) : (
                <div className="channel__messages">
                  <div className="message-list">
                    {pagedMessageBlocks.length ? (
                      pagedMessageBlocks.map((block) => {
                        if (block.kind === 'day') {
                          return (
                            <div key={block.id} className="message-day">
                              <span>{block.label}</span>
                            </div>
                          );
                        }
                        if (block.kind === 'unread') {
                          return (
                            <div key={block.id} className="message-unread">
                              <span>{block.label}</span>
                            </div>
                          );
                        }

                        const message = block.message;
                        const memberKey = `${message.senderType}:${message.senderId}`;
                        const member = memberMap[memberKey];
                        const displayName = member?.name ?? message.senderType;
                        const timeLabel = new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const initials = displayName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join('');
                        const isMention = user?.name
                          ? (message.content?.text ?? '').includes(`@${user.name}`)
                          : false;

                        return (
                          <div
                            key={block.id}
                            className={`message ${block.grouped ? 'message--grouped' : ''} ${
                              isMention ? 'message--mention' : ''
                            }`}
                          >
                            <div className="message__main">
                              {block.showMeta ? (
                                <div className="message__meta">
                                  <div className="message__avatar">
                                    {member?.avatarUrl ? (
                                      <img
                                        src={member.avatarUrl}
                                        alt={displayName}
                                        className="message__avatar-img"
                                      />
                                    ) : (
                                      <span className="message__avatar-text">{initials}</span>
                                    )}
                                  </div>
                                  <div className="message__meta-text">
                                    <span className="message__author">{displayName}</span>
                                    <span className="message__time-inline">{timeLabel}</span>
                                  </div>
                                </div>
                              ) : null}
                              <p className="message__body">
                                {(message.content?.text ?? '')
                                  .split(/(\@[\w-]+)/g)
                                  .map((part, index) => {
                                    if (part.startsWith('@')) {
                                      return (
                                        <span key={`${message.id}-m-${index}`} className="mention">
                                          {part}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span key={`${message.id}-t-${index}`}>{part}</span>
                                    );
                                  })}
                              </p>
                            </div>
                            <div className="message__actions">
                              <button type="button" className="message__action">
                                🙂
                              </button>
                              <button type="button" className="message__action">
                                ↩
                              </button>
                              <button type="button" className="message__action">
                                ⋯
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="empty">No messages yet.</p>
                    )}
                  </div>
                  <Pagination
                    page={messagePage}
                    pageSize={MESSAGE_PAGE_SIZE}
                    total={messageBlocks.length}
                    onPageChange={setMessagePage}
                    label="items"
                  />
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
            </>
          ) : null}

          {activeTab === 'presence' ? (
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
          ) : null}

          {activeTab === 'details' ? (
            <div className="card__stack">
              {channel ? (
                <>
                  <div className="chip">
                    <span className="chip__name">Created by</span>
                    <span className="chip__meta">
                      {channel.createdByType}:{channel.createdBy.slice(0, 6)}
                    </span>
                  </div>
                  <div className="chip">
                    <span className="chip__name">Created</span>
                    <span className="chip__meta">
                      {new Date(channel.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {channel.description ? (
                    <div className="result">
                      <p className="result__title">Topic</p>
                      <p className="result__meta">{channel.description}</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="empty">Channel details unavailable.</p>
              )}
            </div>
          ) : null}
          {detailsOpen ? (
            <aside className="channel__details">
              <div className="channel__details-header">
                <p className="channel__details-title">Thread & details</p>
                <span className="channel__details-sub">
                  {title}
                </span>
              </div>
              <div className="channel__details-body">
                <p className="empty">Thread view coming soon.</p>
                <div className="details__section">
                  <p className="details__label">Members</p>
                  <div className="card__stack">
                    {members.length ? (
                      members.map((member) => (
                        <div key={`${member.type}-${member.id}`} className="chip chip--soft">
                          <span className="chip__name">{member.name}</span>
                          <span className="chip__meta-row">
                            <span className={`presence-dot presence-dot--${member.status ?? 'offline'}`} />
                            <span className="chip__meta">{member.status ?? 'offline'}</span>
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="empty">No members yet.</p>
                    )}
                  </div>
                </div>
                <div className="details__section">
                  <p className="details__label">Pins</p>
                  <div className="card__stack">
                    <div className="chip chip--soft">
                      <span className="chip__name">Pinned items</span>
                      <span className="chip__meta">None</span>
                    </div>
                  </div>
                </div>
                <div className="details__section">
                  <p className="details__label">Files</p>
                  <div className="card__stack">
                    <div className="chip chip--soft">
                      <span className="chip__name">Recent files</span>
                      <span className="chip__meta">None</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}
