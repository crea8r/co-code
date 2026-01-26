export function formatLastSeen(value?: string | null): string {
  if (!value) return 'last seen unknown';
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return 'last seen unknown';
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'last seen just now';
  if (minutes < 60) return `last seen ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `last seen ${days}d ago`;
}
