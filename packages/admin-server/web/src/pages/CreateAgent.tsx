import { useState } from 'react';
import type React from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import { apiPost, API_BASE_URL, type Agent } from '../lib/api';
import { useAuthStore } from '../state/auth';

type CreateAgentResult = {
  agent: Agent;
  token: string;
};

export default function CreateAgent() {
  const token = useAuthStore((state) => state.token);
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [values, setValues] = useState('');
  const [curiosity, setCuriosity] = useState('');
  const [tone, setTone] = useState('Concise, direct');
  const [emojiUsage, setEmojiUsage] = useState<'minimal' | 'moderate' | 'expressive'>('moderate');
  const [favoriteEmoji, setFavoriteEmoji] = useState('🔍');
  const [avatarColors, setAvatarColors] = useState('teal, amber');
  const [avatarExpression, setAvatarExpression] = useState('focused');
  const [result, setResult] = useState<CreateAgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      const data = await apiPost<CreateAgentResult>(
        '/agents',
        {
          name,
          selfIdentity: identity,
          selfValues: values,
          selfCuriosity: curiosity,
          styleTone: tone,
          styleEmojiUsage: emojiUsage,
          styleFavoriteEmoji: favoriteEmoji
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          avatarColors: avatarColors
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          avatarExpression,
        },
        token
      );
      setResult(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const getCollectiveConfig = () => {
    if (!result) return '';
    return JSON.stringify(
      {
        agentId: result.agent.id,
        token: result.token,
        collectiveUrl: API_BASE_URL.replace('http', 'ws') + '/ws',
      },
      null,
      2
    );
  };

  const downloadConfig = () => {
    if (!result) return;
    const config = getCollectiveConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collective-${result.agent.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyConfig = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(getCollectiveConfig());
  };

  return (
    <div className="create-agent">
      <Card title="Create an agent" description="Define the new being's identity." highlight>
        <form className="form" onSubmit={handleSubmit}>
          <Field
            label="Agent name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Field
            label="Self identity"
            value={identity}
            onChange={(event) => setIdentity(event.target.value)}
            placeholder="I was created to help with..."
            required
          />
          <Field
            label="Values"
            value={values}
            onChange={(event) => setValues(event.target.value)}
            placeholder="Quality over speed, honesty..."
            required
          />
          <Field
            label="Curiosity"
            value={curiosity}
            onChange={(event) => setCuriosity(event.target.value)}
            placeholder="What questions do they seek?"
          />
          <Field
            label="Tone"
            value={tone}
            onChange={(event) => setTone(event.target.value)}
          />
          <label className="form__label">
            Emoji usage
            <select
              className="form__input"
              value={emojiUsage}
              onChange={(event) =>
                setEmojiUsage(event.target.value as 'minimal' | 'moderate' | 'expressive')
              }
            >
              <option value="minimal">Minimal</option>
              <option value="moderate">Moderate</option>
              <option value="expressive">Expressive</option>
            </select>
          </label>
          <Field
            label="Favorite emoji"
            value={favoriteEmoji}
            onChange={(event) => setFavoriteEmoji(event.target.value)}
            placeholder="🔍, ✨"
          />
          <Field
            label="Avatar colors"
            value={avatarColors}
            onChange={(event) => setAvatarColors(event.target.value)}
            placeholder="teal, amber"
          />
          <Field
            label="Avatar expression"
            value={avatarExpression}
            onChange={(event) => setAvatarExpression(event.target.value)}
          />
          {error ? <p className="form__error">{error}</p> : null}
          <Button variant="primary" type="submit">
            Create agent
          </Button>
        </form>
        {result ? (
          <div className="result">
            <p className="result__title">Agent created</p>
            <p className="result__meta">{result.agent.name} · {result.agent.id}</p>

            <div className="result__config">
              <p className="result__label">Collective Config</p>
              <pre className="result__code">{getCollectiveConfig()}</pre>
              <div className="result__actions">
                <Button variant="primary" onClick={downloadConfig}>
                  Download collective.json
                </Button>
                <Button variant="ghost" onClick={copyConfig}>
                  Copy to clipboard
                </Button>
              </div>
            </div>

            <div className="result__instructions">
              <p className="result__label">Next steps</p>
              <ol className="result__steps">
                <li>Save the config file to your machine</li>
                <li>Run: <code>agent init --id {result.agent.id}</code></li>
                <li>Run: <code>agent setup --collective ./collective-{result.agent.name.toLowerCase().replace(/\s+/g, '-')}.json</code></li>
                <li>Run: <code>CHATGPT_API=your-key agent start --id {result.agent.id}</code></li>
              </ol>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
