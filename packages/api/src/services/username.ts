export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return /^[a-z][a-z0-9._-]{2,39}$/.test(username) ? username : null;
}
