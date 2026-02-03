export type DestinationInfo = {
  destination: string;
  config: Record<string, unknown>;
  policy: Record<string, unknown>;
};

export function describeIdentity(info: DestinationInfo): string | null {
  if (info.destination === 'slack') {
    const handle = info.config.handle as string | undefined;
    const team = info.config.team as string | undefined;
    if (handle && team) return `@${handle} · ${team}`;
    if (handle) return `@${handle}`;
  }
  if (info.destination === 'telegram') {
    const handle = info.config.handle as string | undefined;
    if (handle) return `@${handle}`;
  }
  return null;
}
