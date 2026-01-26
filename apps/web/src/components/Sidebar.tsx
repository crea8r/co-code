import { Link, NavLink } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiGet, type Channel, type User, type Agent } from '../lib/api';
import { formatDmLabel, parseDmName } from '../lib/dm';
import { useAuthStore } from '../state/auth';

export default function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

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
        <NavLink to="/channels" className="sidebar__link">
          Channels
        </NavLink>
        <NavLink to="/agents/new" className="sidebar__link">
          Create Agent
        </NavLink>
        <NavLink to="/destinations" className="sidebar__link">
          Destinations
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
                {formatDmLabel(channel.name, user?.id, userMap, agentMap)}
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
                #{channel.name}
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
