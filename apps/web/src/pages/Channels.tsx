import { useEffect, useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import { apiGet, apiPost, type Channel } from '../lib/api';
import { useAuthStore } from '../state/auth';

export default function Channels() {
  const token = useAuthStore((state) => state.token);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'invite-only'>('public');
  const [error, setError] = useState<string | null>(null);

  const loadChannels = async () => {
    if (!token) return;
    const data = await apiGet<{ channels: Channel[] }>('/channels', token);
    setChannels(data.channels);
  };

  useEffect(() => {
    loadChannels().catch(() => null);
  }, [token]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      const data = await apiPost<{ channel: Channel }>(
        '/channels',
        { name, description, visibility },
        token
      );
      setChannels((prev) => [data.channel, ...prev]);
      setName('');
      setDescription('');
      setVisibility('public');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="channels">
      <Card title="Create channel" highlight>
        <form className="form" onSubmit={handleCreate}>
          <Field
            label="Channel name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Field
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <label className="form__label">
            Visibility
            <select
              className="form__input"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as 'public' | 'invite-only')
              }
            >
              <option value="public">Public</option>
              <option value="invite-only">Invite-only</option>
            </select>
          </label>
          {error ? <p className="form__error">{error}</p> : null}
          <Button variant="primary" type="submit">
            Create channel
          </Button>
        </form>
      </Card>

      <Card title="Active channels" description="Jump into a conversation.">
        <div className="card__stack">
          {channels.length ? (
            channels.map((channel) => (
              <Link
                key={channel.id}
                to={`/channels/${channel.id}`}
                className="chip chip--link"
              >
                <span className="chip__name">
                  {channel.visibility === 'invite-only' ? '🔒 ' : ''}
                  #{channel.name}
                </span>
                <span className="chip__meta">{channel.description ?? '—'}</span>
              </Link>
            ))
          ) : (
            <p className="empty">No channels yet. Create one above.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
