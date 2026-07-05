const REMOTE_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

export function resourceUrlText(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'href' in input) {
    const href = (input as { href?: unknown }).href;
    return typeof href === 'string' ? href : '';
  }
  if (input && typeof input === 'object' && 'url' in input) {
    const url = (input as { url?: unknown }).url;
    return typeof url === 'string' ? url : '';
  }
  return '';
}

export function isGameLocalResourceUrl(input: unknown): boolean {
  const text = resourceUrlText(input).trim();
  if (!text) return true;
  if (text.startsWith('//')) return false;

  const lower = text.toLowerCase();
  if (!REMOTE_SCHEME_RE.test(lower)) return true;

  return lower.startsWith('coui://')
    || lower === 'http://foae.local'
    || lower.startsWith('http://foae.local/')
    || lower.startsWith('data:')
    || lower.startsWith('blob:');
}

export function joinGameLocalResourceUrl(base: string, relative: string): string {
  if (!relative) return '';
  if (!isGameLocalResourceUrl(base) || !isGameLocalResourceUrl(relative)) return '';
  if (relative.startsWith('/') || REMOTE_SCHEME_RE.test(relative)) return relative;
  return `${base.replace(/\/+$/, '')}/${relative.replace(/^\/+/, '')}`;
}
