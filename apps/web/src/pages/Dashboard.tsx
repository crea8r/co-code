import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { apiGet, createDm, type Agent, type Channel, type User } from '../lib/api';
import { createSocket } from '../lib/ws';
import { describeIdentity, type DestinationInfo } from '../lib/destinations';
import { formatLastSeen } from '../lib/presence';
import { useAuthStore } from '../state/auth';

type PresenceUpdate = {
  entityId: string;
  entityType: string;
  status: string;
  timestamp: number;
};

type AttentionUpdate = {
  agentId: string;
  state: string;
  queueSize: number;
  channelId: string;
};

export default function Dashboard() {
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceUpdate>>({});
  const [attention, setAttention] = useState<Record<string, AttentionUpdate>>({});
  const [agentDestinations, setAgentDestinations] = useState<
    Record<string, DestinationInfo[]>
  >({});

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
    if (!token || !agents.length) return;

    const loadDestinations = async () => {
      const entries = await Promise.all(
        agents.map(async (agent) => {
          try {
            const data = await apiGet<{ destinations: DestinationInfo[] }>(
              `/agents/${agent.id}/destinations`,
              token
            );
            return [agent.id, data.destinations] as const;
          } catch {
            return [agent.id, []] as const;
          }
        })
      );

      setAgentDestinations(
        entries.reduce<Record<string, DestinationInfo[]>>((acc, [id, list]) => {
          acc[id] = list;
          return acc;
        }, {})
      );
    };

    loadDestinations();
  }, [token, agents]);

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
          agentId?: string;
          state?: string;
          queueSize?: number;
          channelId?: string;
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

        if (data.type === 'attention_change' && data.agentId) {
          setAttention((prev) => ({
            ...prev,
            [data.agentId]: {
              agentId: data.agentId,
              state: data.state ?? 'idle',
              queueSize: data.queueSize ?? 0,
              channelId: data.channelId ?? '',
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

  const handleDm = async (id: string, type: 'user' | 'agent') => {
    if (!token) return;
    try {
      const data = await createDm(id, type, token);
      navigate(`/channels/${data.channel.id}`);
    } catch {
      // ignore for now
    }
  };

  return (
    <div className="dashboard">
      <Card title="Humans" description="Everyone in the collective right now.">
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
                <Button variant="ghost" onClick={() => handleDm(human.id, 'user')}>
                  DM
                </Button>
              </div>
            ))
          ) : (
            <p className="empty">No humans found.</p>
          )}
        </div>
      </Card>

      <Card title="Channels" description="Shared rooms for humans and agents.">
        <div className="card__stack">
          {channels.length ? (
            channels.map((channel) => (
              <div key={channel.id} className="chip">
                <span className="chip__name">
                  {channel.visibility === 'invite-only' ? '🔒 ' : ''}#{channel.name}
                </span>
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
            agents.map((agent) => {
              const dests = agentDestinations[agent.id] ?? [];
              const identity = dests
                .map((dest) => describeIdentity(dest))
                .filter(Boolean)
                .join(' · ');
              const attentionState = attention[agent.id];

              return (
                <div key={agent.id} className="chip">
                  <span className="chip__name">{agent.name}</span>
                  <span className="chip__meta">
                    {identity ? `ext: ${identity}` : agent.id.slice(0, 8)}
                  </span>
                  {attentionState ? (
                    <Badge className={`badge--${attentionState.state}`}>
                      {attentionState.state} ({attentionState.queueSize})
                    </Badge>
                  ) : null}
                  <Button variant="ghost" onClick={() => handleDm(agent.id, 'agent')}>
                    DM
                  </Button>
                </div>
              );
            })
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
