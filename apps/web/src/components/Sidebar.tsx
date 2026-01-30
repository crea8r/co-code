import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiGet, type Channel, type User, type Agent } from '../lib/api';
import { formatDmLabel, parseDmName } from '../lib/dm';
import { createSocket } from '../lib/ws';
import { useAuthStore } from '../state/auth';

export default function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, { unread: number; mentions: number }>>({});

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      const channelData = await apiGet<{ channels: Channel[] }>(
        '/channels',
        token
      );
      setChannels(channelData.channels);

      const userData = await apiGet<{ users: User[] }>('/users', token);
      setUsers(userData.users);

      const agentData = await apiGet<{ agents: Agent[] }>('/agents', token);
      setAgents(agentData.agents);
    };

    load().catch(() => null);
  }, [token]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar:unreads');
      if (stored) {
        setUnreadMap(JSON.parse(stored) as Record<string, { unread: number; mentions: number }>);
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar:unreads', JSON.stringify(unreadMap));
    } catch {
      // ignore storage issues
    }
  }, [unreadMap]);

  useEffect(() => {
    if (!token) return;
    const socket = createSocket();

    const send = (payload: object) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    };

    socket.addEventListener('open', () => {
      send({ type: 'authenticate', token, timestamp: Date.now() });
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          message?: {
            id: string;
            channelId: string;
            senderId: string;
            senderType: string;
            content?: { text?: string };
            mentionedIds?: string[];
          };
        };

        if (data.type === 'new_message' && data.message) {
          const channelId = data.message.channelId;
          const activeChannel = location.pathname.startsWith('/channels/')
            ? location.pathname.split('/')[2]
            : null;

          if (activeChannel && activeChannel === channelId) {
            return;
          }

          const hasMention =
            (data.message.mentionedIds ?? []).includes(user?.id ?? '') ||
            (user?.name
              ? (data.message.content?.text ?? '').includes(`@${user.name}`)
              : false);

          setUnreadMap((prev) => {
            const current = prev[channelId] ?? { unread: 0, mentions: 0 };
            return {
              ...prev,
              [channelId]: {
                unread: current.unread + 1,
                mentions: current.mentions + (hasMention ? 1 : 0),
              },
            };
          });
        }
      } catch {
        // ignore
      }
    });

    return () => socket.close();
  }, [token, user, location.pathname]);

  useEffect(() => {
    if (!location.pathname.startsWith('/channels/')) return;
    const channelId = location.pathname.split('/')[2];
    if (!channelId) return;
    setUnreadMap((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, [location.pathname]);

  const { dmChannels, publicChannels } = useMemo(() => {
    const dm = channels.filter((channel) => channel.name.startsWith('dm:'));
    const normal = channels.filter((channel) => !channel.name.startsWith('dm:'));
    return { dmChannels: dm, publicChannels: normal };
  }, [channels]);

  const userMap = useMemo(() => {
    return users.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [users]);

  const agentMap = useMemo(() => {
    return agents.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [agents]);

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand">
        <span className="brand__mark">◎</span>
        <div>
          <p className="brand__title">Agent Platform</p>
          <p className="brand__sub">Collective dashboard</p>
        </div>
      </Link>

      <nav className="sidebar__nav">
        <NavLink to="/dashboard" className="sidebar__link">
          Overview
        </NavLink>
        <NavLink to="/agents/new" className="sidebar__link">
          Create Agent
        </NavLink>
        <NavLink to="/tools" className="sidebar__link">
          Tool Registry
        </NavLink>
        <NavLink to="/feed" className="sidebar__link">
          Social Feed
        </NavLink>
        <NavLink to="/destinations" className="sidebar__link">
          Destinations
        </NavLink>
        <NavLink to="/vitals" className="sidebar__link">
          Vitals
        </NavLink>
      </nav>

      {dmChannels.length ? (
        <div className="sidebar__section">
          <p className="sidebar__label">Direct Messages</p>
          <div className="sidebar__list">
            {dmChannels.map((channel) => (
              <NavLink
                key={channel.id}
                to={`/channels/${channel.id}`}
                className="sidebar__dm"
              >
                <span>{formatDmLabel(channel.name, user?.id, userMap, agentMap)}</span>
                {unreadMap[channel.id] ? (
                  <span className="sidebar__badges">
                    {unreadMap[channel.id].mentions ? (
                      <span className="sidebar__badge sidebar__badge--mention">
                        @{unreadMap[channel.id].mentions}
                      </span>
                    ) : null}
                    <span className="sidebar__badge">
                      {unreadMap[channel.id].unread}
                    </span>
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}

      {publicChannels.length ? (
        <div className="sidebar__section">
          <p className="sidebar__label">Channels</p>
          <div className="sidebar__list">
            {publicChannels.map((channel) => (
              <NavLink
                key={channel.id}
                to={`/channels/${channel.id}`}
                className="sidebar__dm"
              >
                <span>#{channel.name}</span>
                {unreadMap[channel.id] ? (
                  <span className="sidebar__badges">
                    {unreadMap[channel.id].mentions ? (
                      <span className="sidebar__badge sidebar__badge--mention">
                        @{unreadMap[channel.id].mentions}
                      </span>
                    ) : null}
                    <span className="sidebar__badge">
                      {unreadMap[channel.id].unread}
                    </span>
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sidebar__footer">
        <p className="sidebar__meta">Signed in as</p>
        <p className="sidebar__user">{user?.name ?? 'Guest'}</p>
      </div>
    </aside>
  );
}
