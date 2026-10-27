export function validateMessage(value: unknown): { name: string; body: string } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== 'string' || typeof v.body !== 'string') return null;
  const name = v.name.trim(), body = v.body.trim();
  if (name.length < 1 || name.length > 30 || body.length < 1 || body.length > 500) return null;
  return { name, body };
}
