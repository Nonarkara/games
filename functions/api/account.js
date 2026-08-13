import { requireUser, secureCookie, SESSION_COOKIE } from '../_shared/auth.js';
import { json, sameOrigin } from '../_shared/http.js';

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request, env.PUBLIC_ORIGIN)) return json({ error: 'origin_rejected' }, 403);
  try {
    const auth = await requireUser(request, env);
    if (!auth.ok) return auth.response;
    await env.DB.batch([
      env.DB.prepare('DELETE FROM user_play_events WHERE user_id = ?1').bind(auth.user.id),
      env.DB.prepare('DELETE FROM user_snapshots WHERE user_id = ?1').bind(auth.user.id),
      env.DB.prepare('DELETE FROM auth_sessions WHERE user_id = ?1').bind(auth.user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(auth.user.id)
    ]);
    return json({ ok: true }, 200, { 'set-cookie': secureCookie(SESSION_COOKIE, '', 0) });
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }
}
