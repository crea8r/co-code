export type DmMember = {
  id: string;
  type: 'user' | 'agent';
};

export function parseDmName(name: string): DmMember[] | null {
  if (!name.startsWith('dm:')) return null;
  const parts = name.split(':');
  if (parts.length !== 5) return null;
  const [, typeA, idA, typeB, idB] = parts;
  if (!typeA || !idA || !typeB || !idB) return null;
  if ((typeA !== 'user' && typeA !== 'agent') || (typeB !== 'user' && typeB !== 'agent')) {
    return null;
  }
  return [
    { id: idA, type: typeA as 'user' | 'agent' },
    { id: idB, type: typeB as 'user' | 'agent' },
  ];
}

export function getOtherMember(members: DmMember[], selfId?: string | null): DmMember | null {
  if (!members.length) return null;
  if (!selfId) return members[0];
  const other = members.find((member) => member.id !== selfId);
  return other ?? members[0];
}

export function formatDmLabel(
  name: string,
  selfId: string | null | undefined,
  userNames: Record<string, string>,
  agentNames: Record<string, string>
): string {
  const members = parseDmName(name);
  if (!members) return name;
  const other = getOtherMember(members, selfId);
  if (!other) return 'Direct message';
  if (other.type === 'user') {
    return userNames[other.id] ?? `user:${other.id.slice(0, 6)}`;
  }
  return agentNames[other.id] ?? `agent:${other.id.slice(0, 6)}`;
}
