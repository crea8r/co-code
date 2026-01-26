import type { Agent, User } from './api';

export type Mentionable = {
  id: string;
  type: 'user' | 'agent';
  name: string;
};

export function buildMentionables(users: User[], agents: Agent[]): Mentionable[] {
  const userItems = users.map((user) => ({
    id: user.id,
    type: 'user' as const,
    name: user.name,
  }));
  const agentItems = agents.map((agent) => ({
    id: agent.id,
    type: 'agent' as const,
    name: agent.name,
  }));
  return [...userItems, ...agentItems];
}

export function filterMentionables(
  mentionables: Mentionable[],
  query: string
): Mentionable[] {
  if (!query) return mentionables;
  const lowered = query.toLowerCase();
  return mentionables.filter((item) => item.name.toLowerCase().includes(lowered));
}

export function formatMentionToken(token: string): { label: string } {
  return { label: token.slice(1) };
}
