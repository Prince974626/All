/**
 * Resolve a stored media path to a browser-loadable URL.
 * - Absolute http(s) / data: / blob: → unchanged
 * - /uploads/... → prepend upload/API origin (needed when client + dashboard
 *   backends are on different hosts/folders)
 */
export function resolveMediaUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const pathPart = value.startsWith('/') ? value : `/${value}`;

  const mediaBase = String(
    import.meta.env.VITE_UPLOAD_BASE_URL ||
      import.meta.env.VITE_MEDIA_BASE_URL ||
      ''
  )
    .trim()
    .replace(/\/$/, '');
  if (mediaBase && pathPart.startsWith('/uploads')) {
    return `${mediaBase}${pathPart}`;
  }

  const isLocal = import.meta.env.VITE_IS_LOCAL === 'true';
  if (isLocal) {
    const api = String(import.meta.env.VITE_LOCAL_API_URL || '');
    const origin = api.replace(/\/api\/?$/, '');
    return origin ? `${origin}${pathPart}` : pathPart;
  }

  return pathPart;
}
