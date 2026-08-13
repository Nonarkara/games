import { authConfigured, randomToken, secureCookie, sha256, STATE_COOKIE } from '../../../_shared/auth.js';
import { redirect } from '../../../_shared/http.js';

const OAUTH_TTL_MS = 10 * 60 * 1000;

export async function onRequestGet({ request, env }) {
  const origin = env.PUBLIC_ORIGIN || new URL(request.url).origin;
  if (!authConfigured(env)) return redirect(`${origin}/?auth=unavailable`);

  const state = randomToken(32);
  const verifier = randomToken(48);
  const nonce = randomToken(24);
  const stateHash = await sha256(state);
  const challenge = await sha256(verifier);
  const now = Date.now();

  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM oauth_states WHERE expires_at <= ?1').bind(now),
      env.DB.prepare(
        'INSERT INTO oauth_states (state_hash, verifier, nonce, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)'
      ).bind(stateHash, verifier, nonce, now, now + OAUTH_TTL_MS)
    ]);
  } catch {
    return redirect(`${origin}/?auth=error`);
  }

  const callback = `${origin}/api/auth/google/callback`;
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callback);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid email profile');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('nonce', nonce);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');
  authorize.searchParams.set('prompt', 'select_account');

  return redirect(authorize.toString(), 302, {
    'set-cookie': secureCookie(STATE_COOKIE, state, OAUTH_TTL_MS / 1000)
  });
}
