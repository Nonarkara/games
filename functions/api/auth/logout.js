import { cookieValue, secureCookie, SESSION_COOKIE, sha256 } from '../../_shared/auth.js';
import { json, sameOrigin } from '../../_shared/http.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env.PUBLIC_ORIGIN)) return json({ error: 'origin_rejected' }, 403);
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) {
    try { await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?1').bind(await sha256(token)).run(); }
    catch { return json({ error: 'service_unavailable' }, 503); }
  }
  return json({ ok: true }, 200, { 'set-cookie': secureCookie(SESSION_COOKIE, '', 0) });
}
