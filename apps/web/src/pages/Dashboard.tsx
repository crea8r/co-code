import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { apiGet, type Agent, type Channel, type User } from '../lib/api';
import { createSocket } from '../lib/ws';
import { formatLastSeen } from '../lib/presence';
import { useAuthStore } from '../state/auth';

type PresenceUpdate = {
  entityId: string;
  entityType: string;
  status: string;
  timestamp: number;
};

export default function Dashboard() {
  const token = useAuthStore((state) => state.token);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceUpdate>>({});

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const channelData = await apiGet<{ channels: Channel[] }>(
          '/channels',
          token
        );
        setChannels(channelData.channels);

        const agentData = await apiGet<{ agents: Agent[] }>('/agents', token);
        setAgents(agentData.agents);

        const userData = await apiGet<{ users: User[] }>('/users', token);
        setUsers(userData.users);

        const creditData = await apiGet<{ balance: number }>(
          '/credits/balance',
          token
        );
        setBalance(creditData.balance);
      } catch {
        // ignore for now
      }
    };

    load();
  }, [token]);

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
          entityId?: string;
          entityType?: string;
          status?: string;
          timestamp?: number;
        };

        if (data.type === 'presence_change' && data.entityId && data.entityType) {
          setPresence((prev) => ({
            ...prev,
            [data.entityId]: {
              entityId: data.entityId,
              entityType: data.entityType,
              status: data.status ?? 'offline',
              timestamp: data.timestamp ?? Date.now(),
            },
          }));
        }
      } catch {
        // ignore malformed events
      }
    });

    return () => socket.close();
  }, [token]);

  const humans = useMemo(() => {
    return users.map((user) => {
      const live = presence[user.id];
      const status = live?.status ?? user.status ?? 'offline';
      const lastSeen =
        status === 'offline'
          ? formatLastSeen(user.lastSeenAt ?? (live ? new Date(live.timestamp).toISOString() : null))
          : 'online now';
      return { ...user, status, lastSeen };
    });
  }, [users, presence]);

  return (
    <div className="dashboard">
      <Card
        title="Humans"
        description="Everyone in the collective right now."
      >
        <div className="card__stack">
          {humans.length ? (
            humans.map((human) => (
              <div key={human.id} className="chip">
                <span className="chip__name">{human.name}</span>
                <span className="chip__meta-row">
                  <Badge className={`badge--${human.status ?? 'offline'}`}>
                    {human.status ?? 'offline'}
                  </Badge>
                  <span className="chip__meta">· {human.lastSeen}</span>
                </span>
              </div>
            ))
          ) : (
            <p className="empty">No humans found.</p>
          )}
        </div>
      </Card>

      <Card
        title="Channels"
        description="Shared rooms for humans and agents."
      >
        <div className="card__stack">
          {channels.length ? (
            channels.map((channel) => (
              <div key={channel.id} className="chip">
                <span className="chip__name">#{channel.name}</span>
                <span className="chip__meta">{channel.description ?? '—'}</span>
              </div>
            ))
          ) : (
            <p className="empty">No channels yet. Create one in Channels.</p>
          )}
        </div>
      </Card>

      <Card title="Agents" description="Your active digital beings.">
        <div className="card__stack">
          {agents.length ? (
            agents.map((agent) => (
              <div key={agent.id} className="chip">
                <span className="chip__name">{agent.name}</span>
                <span className="chip__meta">{agent.id.slice(0, 8)}</span>
              </div>
            ))
          ) : (
            <p className="empty">No agents yet. Create one next.</p>
          )}
        </div>
      </Card>

      <Card title="Credits" description="Personal and treasury budgets.">
        <div className="credit">
          <div>
            <p className="credit__label">Balance</p>
            <p className="credit__value">{balance ?? 0}</p>
          </div>
          <div>
            <p className="credit__label">Platform fee</p>
            <p className="credit__value">0.5%</p>
          </div>
        </div>
        <Button variant="ghost">View transactions</Button>
      </Card>
    </div>
  );
}
