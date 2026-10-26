import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const postersDir = path.join(__dirname, '../uploads/posters');

fs.mkdirSync(postersDir, { recursive: true });

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Public origin where /uploads is served.
 * Set PUBLIC_UPLOAD_BASE_URL on BOTH backends to the dashboard/upload server
 * (e.g. https://admin.example.com) when client + dashboard use separate folders.
 */
export function getUploadBaseUrl(req) {
  const fromEnv = String(
    process.env.PUBLIC_UPLOAD_BASE_URL || process.env.PUBLIC_BASE_URL || ''
  )
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (!req) return '';
  const proto = String(
    req.headers?.['x-forwarded-proto'] || req.protocol || 'https'
  ).split(',')[0].trim();
  const host = String(
    req.headers?.['x-forwarded-host'] || req.get?.('host') || ''
  )
    .split(',')[0]
    .trim();
  return host ? `${proto}://${host}` : '';
}

/** Turn /uploads/... into a full URL so client panel can load files from the upload server. */
export function absolutizeUploadUrl(url, req) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const pathPart = value.startsWith('/') ? value : `/${value}`;
  const base = getUploadBaseUrl(req);
  return base ? `${base}${pathPart}` : pathPart;
}

/** Normalize stored poster path for disk delete (relative or absolute). */
export function toUploadsPathname(publicPath) {
  let str = String(publicPath || '').trim();
  if (!str) return '';
  if (/^https?:\/\//i.test(str)) {
    try {
      str = new URL(str).pathname;
    } catch {
      return '';
    }
  }
  const idx = str.indexOf('/uploads/posters/');
  if (idx === -1) return '';
  return str.slice(idx);
}

/**
 * If value is a data:image/...;base64,... string, write it to disk and
 * return the public URL path. Otherwise return the original string.
 */
export async function persistPosterValue(value, kind = 'desktop', req = null) {
  const str = String(value || '').trim();
  if (!str) return '';

  if (!str.startsWith('data:image/')) {
    return absolutizeUploadUrl(str, req);
  }

  const match = str.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) {
    throw new Error('Invalid image data URL');
  }

  const mime = match[1].toLowerCase();
  const ext = MIME_EXT[mime] || mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const buffer = Buffer.from(match[2], 'base64');

  if (!buffer.length) {
    throw new Error('Empty image data');
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Image too large (max 5MB)');
  }

  const filename = `login-${kind}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  await fs.promises.writeFile(path.join(postersDir, filename), buffer);
  return absolutizeUploadUrl(`/uploads/posters/${filename}`, req);
}

/** Delete a previously stored poster file if path points under /uploads/posters/ */
export function deletePosterFile(publicPath) {
  try {
    const pathname = toUploadsPathname(publicPath);
    if (!pathname.startsWith('/uploads/posters/')) return;
    const filename = path.basename(pathname);
    if (!filename || filename === '.' || filename === '..') return;
    const full = path.join(postersDir, filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    // ignore cleanup errors
  }
}
