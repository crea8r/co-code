import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Field from '../components/Field';
import Pagination from '../components/Pagination';
import { apiGet, createDm, type Agent, type Channel, type User } from '../lib/api';
import { apiPost } from '../lib/api';
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
  const [activeTab, setActiveTab] = useState<'humans' | 'channels' | 'agents' | 'credits'>('humans');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [channelVisibility, setChannelVisibility] = useState<'public' | 'invite-only'>('public');
  const [channelError, setChannelError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [humanPage, setHumanPage] = useState(1);
  const [channelPage, setChannelPage] = useState(1);
  const [agentPage, setAgentPage] = useState(1);
  const [presence, setPresence] = useState<Record<string, PresenceUpdate>>({});
  const [attention, setAttention] = useState<Record<string, AttentionUpdate>>({});
  const [agentDestinations, setAgentDestinations] = useState<
    Record<string, DestinationInfo[]>
  >({});

  const PAGE_SIZE = 6;

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

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(humans.length / PAGE_SIZE));
    if (humanPage > totalPages) setHumanPage(1);
  }, [humans.length, humanPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(channels.length / PAGE_SIZE));
    if (channelPage > totalPages) setChannelPage(1);
  }, [channels.length, channelPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(agents.length / PAGE_SIZE));
    if (agentPage > totalPages) setAgentPage(1);
  }, [agents.length, agentPage]);

  const pagedHumans = useMemo(() => {
    const start = (humanPage - 1) * PAGE_SIZE;
    return humans.slice(start, start + PAGE_SIZE);
  }, [humans, humanPage]);

  const pagedChannels = useMemo(() => {
    const start = (channelPage - 1) * PAGE_SIZE;
    return channels.slice(start, start + PAGE_SIZE);
  }, [channels, channelPage]);

  const pagedAgents = useMemo(() => {
    const start = (agentPage - 1) * PAGE_SIZE;
    return agents.slice(start, start + PAGE_SIZE);
  }, [agents, agentPage]);

  const handleDm = async (id: string, type: 'user' | 'agent') => {
    if (!token) return;
    try {
      const data = await createDm(id, type, token);
      navigate(`/channels/${data.channel.id}`);
    } catch {
      // ignore for now
    }
  };

  const handleCreateChannel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      const data = await apiPost<{ channel: Channel }>(
        '/channels',
        {
          name: channelName,
          description: channelDescription,
          visibility: channelVisibility,
        },
        token
      );
      setChannels((prev) => [data.channel, ...prev]);
      setChannelName('');
      setChannelDescription('');
      setChannelVisibility('public');
      setChannelError(null);
      setShowCreateChannel(false);
    } catch (err) {
      setChannelError((err as Error).message);
    }
  };

  return (
    <div className="dashboard">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'humans' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('humans')}
        >
          Humans
        </button>
        <button
          className={`tab ${activeTab === 'channels' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          Channels
        </button>
        <button
          className={`tab ${activeTab === 'agents' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          Agents
        </button>
        <button
          className={`tab ${activeTab === 'credits' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('credits')}
        >
          Credits
        </button>
      </div>

      {activeTab === 'humans' ? (
        <Card title="Humans" description="Everyone in the collective right now.">
          <div className="card__stack">
            {pagedHumans.length ? (
              pagedHumans.map((human) => (
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
          <Pagination
            page={humanPage}
            pageSize={PAGE_SIZE}
            total={humans.length}
            onPageChange={setHumanPage}
            label="humans"
          />
        </Card>
      ) : null}

      {activeTab === 'channels' ? (
        <>
          <Card
            title="Channels"
            description="Shared rooms for humans and agents. Use the sidebar to jump in."
          >
            <div className="card__stack">
              {pagedChannels.length ? (
                pagedChannels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant="ghost"
                    onClick={() => navigate(`/channels/${channel.id}`)}
                  >
                    {channel.visibility === 'invite-only' ? '🔒 ' : ''}
                    #{channel.name}
                  </Button>
                ))
              ) : (
                <p className="empty">No channels yet. Create one below.</p>
              )}
            </div>
            <Pagination
              page={channelPage}
              pageSize={PAGE_SIZE}
              total={channels.length}
              onPageChange={setChannelPage}
              label="channels"
            />
          </Card>

          <Card title="Create channel" highlight>
            {showCreateChannel ? (
              <form className="form" onSubmit={handleCreateChannel}>
                <Field
                  label="Channel name"
                  value={channelName}
                  onChange={(event) => setChannelName(event.target.value)}
                  required
                />
                <Field
                  label="Description"
                  value={channelDescription}
                  onChange={(event) => setChannelDescription(event.target.value)}
                />
                <label className="form__label">
                  Visibility
                  <select
                    className="form__input"
                    value={channelVisibility}
                    onChange={(event) =>
                      setChannelVisibility(
                        event.target.value as 'public' | 'invite-only'
                      )
                    }
                  >
                    <option value="public">Public</option>
                    <option value="invite-only">Invite-only</option>
                  </select>
                </label>
                {channelError ? <p className="form__error">{channelError}</p> : null}
                <div className="form__actions">
                  <Button variant="primary" type="submit">
                    Create channel
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setShowCreateChannel(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="primary"
                onClick={() => setShowCreateChannel(true)}
              >
                New channel
              </Button>
            )}
          </Card>
        </>
      ) : null}

      {activeTab === 'agents' ? (
        <Card title="Agents" description="Your active digital beings.">
          <div className="card__stack">
            {pagedAgents.length ? (
              pagedAgents.map((agent) => {
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
          <Pagination
            page={agentPage}
            pageSize={PAGE_SIZE}
            total={agents.length}
            onPageChange={setAgentPage}
            label="agents"
          />
        </Card>
      ) : null}

      {activeTab === 'credits' ? (
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
      ) : null}
    </div>
  );
}
