import { useEffect, useState } from 'react';
import type React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Field from '../components/Field';
import { apiGet, apiPost, type Agent } from '../lib/api';
import { useAuthStore } from '../state/auth';

type DestinationRecord = {
  id: string;
  destination: string;
  policy: Record<string, unknown>;
  config: Record<string, unknown>;
};

export default function Destinations() {
  const token = useAuthStore((state) => state.token);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [slackToken, setSlackToken] = useState('');
  const [slackSigningSecret, setSlackSigningSecret] = useState('');
  const [slackHandle, setSlackHandle] = useState('');
  const [slackTeam, setSlackTeam] = useState('');
  const [slackMentions, setSlackMentions] = useState(true);
  const [slackDMs, setSlackDMs] = useState(true);
  const [slackWhitelist, setSlackWhitelist] = useState('');

  const [telegramToken, setTelegramToken] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [telegramMentions, setTelegramMentions] = useState(true);
  const [telegramDMs, setTelegramDMs] = useState(true);
  const [telegramWhitelist, setTelegramWhitelist] = useState('');

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
      const data = await apiGet<{ destinations: DestinationRecord[] }>(
        `/agents/${selectedAgent}/destinations`,
        token
      );
      setDestinations(data.destinations);
    };
    load().catch(() => null);
  }, [token, selectedAgent]);

  useEffect(() => {
    const slack = destinations.find((item) => item.destination === 'slack');
    if (slack) {
      setSlackToken((slack.config.token as string) ?? '');
      setSlackSigningSecret((slack.config.signingSecret as string) ?? '');
      setSlackHandle((slack.config.handle as string) ?? '');
      setSlackTeam((slack.config.team as string) ?? '');
      setSlackMentions((slack.policy.respondToMentions as boolean) ?? true);
      setSlackDMs((slack.policy.respondToDMs as boolean) ?? true);
      setSlackWhitelist(((slack.policy.whitelist as string[]) ?? []).join(', '));
    }

    const telegram = destinations.find((item) => item.destination === 'telegram');
    if (telegram) {
      setTelegramToken((telegram.config.token as string) ?? '');
      setTelegramHandle((telegram.config.handle as string) ?? '');
      setTelegramMentions((telegram.policy.respondToMentions as boolean) ?? true);
      setTelegramDMs((telegram.policy.respondToDMs as boolean) ?? true);
      setTelegramWhitelist(((telegram.policy.whitelist as string[]) ?? []).join(', '));
    }
  }, [destinations]);

  const saveDestination = async (destination: string) => {
    if (!token || !selectedAgent) return;
    setStatus('Saving...');

    const payload =
      destination === 'slack'
        ? {
            destination,
            policy: {
              respondToMentions: slackMentions,
              respondToDMs: slackDMs,
              whitelist: slackWhitelist
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            },
            config: {
              token: slackToken,
              signingSecret: slackSigningSecret,
              handle: slackHandle,
              team: slackTeam,
            },
          }
        : {
            destination,
            policy: {
              respondToMentions: telegramMentions,
              respondToDMs: telegramDMs,
              whitelist: telegramWhitelist
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            },
            config: {
              token: telegramToken,
              handle: telegramHandle,
            },
          };

    await apiPost<{ destination: DestinationRecord }>(
      `/agents/${selectedAgent}/destinations`,
      payload,
      token
    );
    setStatus('Saved');
    setTimeout(() => setStatus(null), 1500);
  };

  return (
    <div className="dashboard">
      <Card title="Destination policy" description="Routing rules for external platforms.">
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
        {status ? <p className="form__hint">{status}</p> : null}
      </Card>

      <Card title="Slack" description="Socket mode or events API.">
        <div className="form">
          <Field
            label="Bot token"
            type="password"
            value={slackToken}
            onChange={(event) => setSlackToken(event.target.value)}
          />
          <Field
            label="Signing secret"
            type="password"
            value={slackSigningSecret}
            onChange={(event) => setSlackSigningSecret(event.target.value)}
          />
          <Field
            label="Display handle"
            value={slackHandle}
            onChange={(event) => setSlackHandle(event.target.value)}
            placeholder="e.g. agent-bot"
          />
          <Field
            label="Workspace"
            value={slackTeam}
            onChange={(event) => setSlackTeam(event.target.value)}
            placeholder="e.g. Crea8r"
          />
          <label className="form__label">
            <input
              type="checkbox"
              checked={slackMentions}
              onChange={(event) => setSlackMentions(event.target.checked)}
            />
            Respond to mentions
          </label>
          <label className="form__label">
            <input
              type="checkbox"
              checked={slackDMs}
              onChange={(event) => setSlackDMs(event.target.checked)}
            />
            Respond to DMs
          </label>
          <Field
            label="Whitelist (comma separated user IDs)"
            value={slackWhitelist}
            onChange={(event) => setSlackWhitelist(event.target.value)}
          />
          <Button variant="primary" onClick={() => saveDestination('slack')}>
            Save Slack config
          </Button>
        </div>
      </Card>

      <Card title="Telegram" description="Bot routing for Telegram chats.">
        <div className="form">
          <Field
            label="Bot token"
            type="password"
            value={telegramToken}
            onChange={(event) => setTelegramToken(event.target.value)}
          />
          <Field
            label="Display handle"
            value={telegramHandle}
            onChange={(event) => setTelegramHandle(event.target.value)}
            placeholder="e.g. agent_bot"
          />
          <label className="form__label">
            <input
              type="checkbox"
              checked={telegramMentions}
              onChange={(event) => setTelegramMentions(event.target.checked)}
            />
            Respond to mentions
          </label>
          <label className="form__label">
            <input
              type="checkbox"
              checked={telegramDMs}
              onChange={(event) => setTelegramDMs(event.target.checked)}
            />
            Respond to DMs
          </label>
          <Field
            label="Whitelist (comma separated user IDs)"
            value={telegramWhitelist}
            onChange={(event) => setTelegramWhitelist(event.target.value)}
          />
          <Button variant="primary" onClick={() => saveDestination('telegram')}>
            Save Telegram config
          </Button>
        </div>
      </Card>
    </div>
  );
}
