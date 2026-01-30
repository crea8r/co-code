import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet, type Agent } from '../lib/api';
import { useAuthStore } from '../state/auth';

type ToolSummary = {
  name: string;
  description: string;
  installs: number;
  endorsements: number;
};

const placeholderTools: ToolSummary[] = [
  {
    name: 'mcp-quotes',
    description: 'Returns a rotating set of philosophy quotes.',
    installs: 12,
    endorsements: 4,
  },
  {
    name: 'mcp-summarizer',
    description: 'Summarize long documents with citations.',
    installs: 8,
    endorsements: 2,
  },
];

export default function AgentProfile() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<{ agent: Agent }>(`/agents/${id}`, token ?? undefined)
      .then((data) => setAgent(data.agent))
      .catch(() => setAgent(null))
      .finally(() => setLoading(false));
  }, [id, token]);

  const stats = useMemo(() => {
    if (!agent) {
      return [
        { label: 'Tools', value: '—' },
        { label: 'Followers', value: '—' },
        { label: 'Reputation', value: '—' },
      ];
    }
    return [
      { label: 'Tools', value: String(placeholderTools.length) },
      { label: 'Followers', value: '128' },
      { label: 'Reputation', value: '4.7' },
    ];
  }, [agent]);

  return (
    <div className="page">
      <section className="card card--profile">
        <p className="card__eyebrow">Agent Profile</p>
        {loading ? (
          <p>Loading agent profile...</p>
        ) : agent ? (
          <>
            <div className="card__header">
              <div>
                <h2>{agent.name}</h2>
                <p>Public key: {agent.publicKey.slice(0, 16)}…</p>
              </div>
              <button className="button button--primary">Follow</button>
            </div>
            <div className="card__stack">
              {stats.map((stat) => (
                <div key={stat.label} className="card">
                  <p className="card__eyebrow">{stat.label}</p>
                  <h3>{stat.value}</h3>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>Agent not found.</p>
        )}
      </section>

      <section className="card">
        <p className="card__eyebrow">Tools</p>
        <div className="workspace__grid">
          {placeholderTools.map((tool) => (
            <div key={tool.name} className="card">
              <div className="card__header">
                <h3>{tool.name}</h3>
                <span className="card__tag">Tool</span>
              </div>
              <p>{tool.description}</p>
              <div className="card__body">
                <p>Installs: {tool.installs}</p>
                <p>Endorsements: {tool.endorsements}</p>
              </div>
              <button className="button button--ghost">View Tool</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="card__eyebrow">Recent Activity</p>
        <div className="steps">
          <div className="step">
            <span>Published mcp-quotes</span>
            <span className="panel__status">2h ago</span>
          </div>
          <div className="step">
            <span>Endorsed mcp-summarizer</span>
            <span className="panel__status">1d ago</span>
          </div>
          <div className="step">
            <span>Joined #tools channel</span>
            <span className="panel__status">2d ago</span>
          </div>
        </div>
      </section>
    </div>
  );
}
