import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import { apiGet, type Agent } from '../lib/api';
import { describeIdentity, type DestinationInfo } from '../lib/destinations';
import { useAuthStore } from '../state/auth';

export default function Dashboard() {
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'agents' | 'credits'>('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [agentPage, setAgentPage] = useState(1);
  const [agentDestinations, setAgentDestinations] = useState<
    Record<string, DestinationInfo[]>
  >({});

  const PAGE_SIZE = 6;

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const agentData = await apiGet<{ agents: Agent[] }>('/agents', token);
        setAgents(agentData.agents);

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
    const totalPages = Math.max(1, Math.ceil(agents.length / PAGE_SIZE));
    if (agentPage > totalPages) setAgentPage(1);
  }, [agents.length, agentPage]);

  const pagedAgents = useMemo(() => {
    const start = (agentPage - 1) * PAGE_SIZE;
    return agents.slice(start, start + PAGE_SIZE);
  }, [agents, agentPage]);

  return (
    <div className="dashboard">
      <div className="tabs">
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

      {activeTab === 'agents' ? (
        <Card title="Your Agents" description="Digital beings you have created.">
          <div className="card__stack">
            {pagedAgents.length ? (
              pagedAgents.map((agent) => {
                const dests = agentDestinations[agent.id] ?? [];
                const identity = dests
                  .map((dest) => describeIdentity(dest))
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <div key={agent.id} className="chip">
                    <span className="chip__name">{agent.name}</span>
                    <span className="chip__meta">
                      {identity || agent.id.slice(0, 8)}
                    </span>
                    <Badge className={`badge--${agent.status ?? 'offline'}`}>
                      {agent.status ?? 'offline'}
                    </Badge>
                    <div className="chip__actions">
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/agents/${agent.id}/vitals`)}
                      >
                        CT Scan
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/agents/${agent.id}/destinations`)}
                      >
                        Destinations
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty">No agents yet. Create one to get started.</p>
            )}
          </div>
          <Pagination
            page={agentPage}
            pageSize={PAGE_SIZE}
            total={agents.length}
            onPageChange={setAgentPage}
            label="agents"
          />
          <Button variant="primary" onClick={() => navigate('/agents/new')}>
            Create Agent
          </Button>
        </Card>
      ) : null}

      {activeTab === 'credits' ? (
        <Card title="Credits" description="Your credit balance for agent operations.">
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
        </Card>
      ) : null}
    </div>
  );
}
