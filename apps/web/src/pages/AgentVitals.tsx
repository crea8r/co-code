import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import { apiGet, type Agent } from '../lib/api';
import { useAuthStore } from '../state/auth';

type Cycle = {
  id: string;
  wakeAt: string;
  sleepAt: string;
  beforeSleep: Record<string, number>;
  afterSleep: Record<string, number>;
  modelsUsed: Record<string, number>;
  budget: Record<string, number>;
};

type Current = {
  state: Record<string, number>;
  updatedAt: string;
};

type Alert = {
  title: string;
  detail: string;
  severity: 'warning' | 'critical';
};

export default function AgentVitals() {
  const token = useAuthStore((state) => state.token);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [current, setCurrent] = useState<Current | null>(null);
  const [cyclePage, setCyclePage] = useState(1);

  const PAGE_SIZE = 6;

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const agentData = await apiGet<{ agents: Agent[] }>('/agents', token);
      setAgents(agentData.agents);
      if (agentData.agents[0]) {
        setSelectedAgent(agentData.agents[0].id);
      }
    };
    load().catch(() => null);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedAgent) return;
    const load = async () => {
      const cycleData = await apiGet<{ cycles: Cycle[] }>(
        `/agents/${selectedAgent}/vitals/cycles`,
        token
      );
      setCycles(cycleData.cycles);
      const currentData = await apiGet<{ current: Current | null }>(
        `/agents/${selectedAgent}/vitals/current`,
        token
      );
      setCurrent(currentData.current);
    };
    load().catch(() => null);
  }, [token, selectedAgent]);

  const latest = cycles[0];

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(cycles.length / PAGE_SIZE));
    if (cyclePage > totalPages) setCyclePage(1);
  }, [cycles.length, cyclePage]);

  const pagedCycles = useMemo(() => {
    const start = (cyclePage - 1) * PAGE_SIZE;
    return cycles.slice(start, start + PAGE_SIZE);
  }, [cycles, cyclePage]);

  const trends = useMemo(() => {
    if (cycles.length < 2) return null;
    const stress = cycles.map((cycle) => cycle.afterSleep?.stress ?? 0);
    const mood = cycles.map((cycle) => cycle.afterSleep?.mood ?? 0);
    const budget = cycles.map((cycle) => cycle.budget?.end ?? 0);
    const delta = (values: number[]) =>
      values[0] !== undefined && values[values.length - 1] !== undefined
        ? values[0] - values[values.length - 1]
        : 0;
    return {
      stress: delta(stress),
      mood: delta(mood),
      budget: delta(budget),
    };
  }, [cycles]);

  const alerts = useMemo<Alert[]>(() => {
    if (cycles.length < 3) return [];
    const recent = cycles.slice(0, 3);
    const previous = cycles.slice(3, 6);
    const avg = (values: number[]) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const avgStressRecent = avg(recent.map((c) => c.afterSleep?.stress ?? 0));
    const avgStressPrev = avg(previous.map((c) => c.afterSleep?.stress ?? 0));
    const avgMoodRecent = avg(recent.map((c) => c.afterSleep?.mood ?? 0));
    const avgMoodPrev = avg(previous.map((c) => c.afterSleep?.mood ?? 0));
    const avgBudgetDeltaRecent = avg(recent.map((c) => c.budget?.delta ?? 0));
    const avgBudgetDeltaPrev = avg(previous.map((c) => c.budget?.delta ?? 0));
    const avgDurationRecent = avg(
      recent.map((c) => Date.parse(c.sleepAt) - Date.parse(c.wakeAt))
    );
    const avgDurationPrev = avg(
      previous.map((c) => Date.parse(c.sleepAt) - Date.parse(c.wakeAt))
    );

    const items: Alert[] = [];

    if (avgStressRecent - avgStressPrev > 0.1) {
      items.push({
        title: 'Stress trending up',
        detail: `Recent avg ${avgStressRecent.toFixed(2)} vs ${avgStressPrev.toFixed(2)}`,
        severity: 'warning',
      });
    }

    if (avgMoodPrev - avgMoodRecent > 0.1) {
      items.push({
        title: 'Mood trending down',
        detail: `Recent avg ${avgMoodRecent.toFixed(2)} vs ${avgMoodPrev.toFixed(2)}`,
        severity: 'warning',
      });
    }

    if (avgDurationPrev > 0 && avgDurationRecent / avgDurationPrev < 0.8) {
      items.push({
        title: 'Sleep cycles shorter',
        detail: 'Average sleep duration dropped >20%',
        severity: 'warning',
      });
    }

    if (avgBudgetDeltaRecent < avgBudgetDeltaPrev - 0.5) {
      items.push({
        title: 'Budget depleting faster',
        detail: `Delta recent ${avgBudgetDeltaRecent.toFixed(2)} vs ${avgBudgetDeltaPrev.toFixed(2)}`,
        severity: 'critical',
      });
    }

    return items;
  }, [cycles]);

  const handleExport = () => {
    if (!cycles.length) return;
    const headers = [
      'id',
      'wakeAt',
      'sleepAt',
      'stress_before',
      'stress_after',
      'mood_before',
      'mood_after',
      'memories_created',
      'patterns_extracted',
      'budget_start',
      'budget_end',
      'budget_delta',
      'models_used',
    ];
    const rows = cycles.map((cycle) => [
      cycle.id,
      cycle.wakeAt,
      cycle.sleepAt,
      cycle.beforeSleep?.stress ?? '',
      cycle.afterSleep?.stress ?? '',
      cycle.beforeSleep?.mood ?? '',
      cycle.afterSleep?.mood ?? '',
      cycle.afterSleep?.memories_created ?? '',
      cycle.afterSleep?.patterns_extracted ?? '',
      cycle.budget?.start ?? '',
      cycle.budget?.end ?? '',
      cycle.budget?.delta ?? '',
      JSON.stringify(cycle.modelsUsed ?? {}),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-vitals-${selectedAgent}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard">
      <Card title="Agent vitals" description="Health diagnostics across cycles.">
        <label className="form__label">
          Select agent
          <select
            className="form__input"
            value={selectedAgent}
            onChange={(event) => setSelectedAgent(event.target.value)}
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card title="Real-time" description="Current waking status and emotional state.">
        {current ? (
          <div className="card__stack">
            <div className="chip">
              <span className="chip__name">Stress</span>
              <span className="chip__meta">{current.state.stress ?? '—'}</span>
            </div>
            <div className="chip">
              <span className="chip__name">Mood</span>
              <span className="chip__meta">{current.state.mood ?? '—'}</span>
            </div>
            <div className="chip">
              <span className="chip__name">Waking used</span>
              <span className="chip__meta">{current.state.wakingUsed ?? '—'}</span>
            </div>
          </div>
        ) : (
          <p className="empty">No current vitals reported.</p>
        )}
      </Card>

      <Card title="Cycle history" description="Latest sleep cycles.">
        <div className="card__stack">
          {pagedCycles.length ? (
            pagedCycles.map((cycle) => (
              <div key={cycle.id} className="chip">
                <span className="chip__name">
                  {new Date(cycle.sleepAt).toLocaleDateString()}
                </span>
                <span className="chip__meta">
                  stress {cycle.afterSleep?.stress ?? '—'} → mood {cycle.afterSleep?.mood ?? '—'}
                </span>
              </div>
            ))
          ) : (
            <p className="empty">No cycle history yet.</p>
          )}
        </div>
        <Pagination
          page={cyclePage}
          pageSize={PAGE_SIZE}
          total={cycles.length}
          onPageChange={setCyclePage}
          label="cycles"
        />
      </Card>

      <Card title="Trends" description="Weekly drift in health indicators.">
        {trends ? (
          <div className="card__stack">
            <div className="chip">
              <span className="chip__name">Stress trend</span>
              <span className="chip__meta">{trends.stress.toFixed(2)}</span>
            </div>
            <div className="chip">
              <span className="chip__name">Mood trend</span>
              <span className="chip__meta">{trends.mood.toFixed(2)}</span>
            </div>
            <div className="chip">
              <span className="chip__name">Budget trend</span>
              <span className="chip__meta">{trends.budget.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="empty">Not enough cycles for trends.</p>
        )}
      </Card>

      <Card title="Daily summary" description="Quick snapshot of the latest cycle.">
        {latest ? (
          <div className="card__stack">
            <div className="chip">
              <span className="chip__name">Memories created</span>
              <span className="chip__meta">{latest.afterSleep?.memories_created ?? '—'}</span>
            </div>
            <div className="chip">
              <span className="chip__name">Patterns extracted</span>
              <span className="chip__meta">{latest.afterSleep?.patterns_extracted ?? '—'}</span>
            </div>
          </div>
        ) : (
          <p className="empty">No summary yet.</p>
        )}
        <Button variant="ghost" onClick={handleExport}>
          Export CSV
        </Button>
      </Card>

      <Card title="Alerts" description="Health warnings that need attention.">
        {alerts.length ? (
          <div className="card__stack">
            {alerts.map((alert) => (
              <div key={alert.title} className="chip">
                <span className="chip__name">{alert.title}</span>
                <span className="chip__meta">{alert.detail}</span>
                <span className={`badge badge--${alert.severity === 'critical' ? 'queued' : 'away'}`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No alerts detected.</p>
        )}
      </Card>
    </div>
  );
}
