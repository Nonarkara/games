import { json } from './http.js';

export const SESSION_COOKIE = '__Host-ngs_session';
export const STATE_COOKIE = '__Host-ngs_oauth_state';
export const AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return base64url(data);
}

export function base64url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return base64url(await crypto.subtle.digest('SHA-256', bytes));
}

export function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    if (part.slice(0, at).trim() === name) return decodeURIComponent(part.slice(at + 1).trim());
  }
  return '';
}

export function secureCookie(name, value, maxAgeSeconds) {
  const age = Math.max(0, Math.floor(maxAgeSeconds));
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}

export async function currentUser(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name AS name
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND s.expires_at > ?2`
  ).bind(tokenHash, now).first();
  return row || null;
}

export async function requireUser(request, env) {
  const user = await currentUser(request, env);
  return user ? { ok: true, user } : { ok: false, response: json({ error: 'authentication_required' }, 401) };
}

export function authConfigured(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
