import {
  AUTH_TTL_MS, cookieValue, randomToken, secureCookie,
  SESSION_COOKIE, sha256, STATE_COOKIE
} from '../../../_shared/auth.js';
import { redirect } from '../../../_shared/http.js';

function decodePart(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0))));
}

async function verifyIdToken(token, clientId, nonce) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed_token');
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('unsupported_token');

  const certsResponse = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!certsResponse.ok) throw new Error('certs_unavailable');
  const { keys = [] } = await certsResponse.json();
  const jwk = keys.find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('signing_key_missing');
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const signaturePadded = parts[2].replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - parts[2].length % 4) % 4);
  const signature = Uint8Array.from(atob(signaturePadded), c => c.charCodeAt(0));
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed)) throw new Error('bad_signature');

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(clientId)) throw new Error('bad_audience');
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss)) throw new Error('bad_issuer');
  if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error('expired_token');
  if (claims.nonce !== nonce) throw new Error('bad_nonce');
  if (!claims.sub) throw new Error('missing_subject');
  return claims;
}

function finish(location, cookies = []) {
  const response = redirect(location);
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = env.PUBLIC_ORIGIN || url.origin;
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const cookieState = cookieValue(request, STATE_COOKIE);
  const clearState = secureCookie(STATE_COOKIE, '', 0);
  if (!state || !code || !cookieState || state !== cookieState) {
    return finish(`${origin}/?auth=denied`, [clearState]);
  }

  const stateHash = await sha256(state);
  const row = await env.DB.prepare(
    'SELECT verifier, nonce, expires_at FROM oauth_states WHERE state_hash = ?1'
  ).bind(stateHash).first();
  await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash = ?1').bind(stateHash).run();
  if (!row || row.expires_at <= Date.now()) return finish(`${origin}/?auth=expired`, [clearState]);

  try {
    const callback = `${origin}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callback,
        grant_type: 'authorization_code',
        code_verifier: row.verifier
      })
    });
    if (!tokenResponse.ok) throw new Error('token_exchange_failed');
    const token = await tokenResponse.json();
    const claims = await verifyIdToken(token.id_token, env.GOOGLE_CLIENT_ID, row.nonce);

    const now = Date.now();
    let user = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?1').bind(claims.sub).first();
    const userId = user?.id || crypto.randomUUID();
    const email = claims.email_verified === true ? String(claims.email || '').slice(0, 254) : null;
    const name = String(claims.name || 'Player').slice(0, 100);
    await env.DB.prepare(
      `INSERT INTO users (id, google_sub, email, display_name, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)
       ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email,
         display_name = excluded.display_name, updated_at = excluded.updated_at`
    ).bind(userId, claims.sub, email, name, now).run();

    const sessionToken = randomToken(32);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?1').bind(now),
      env.DB.prepare(
        'INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)'
      ).bind(await sha256(sessionToken), userId, now, now + AUTH_TTL_MS)
    ]);
    return finish(`${origin}/?auth=success`, [
      secureCookie(SESSION_COOKIE, sessionToken, AUTH_TTL_MS / 1000), clearState
    ]);
  } catch {
    return finish(`${origin}/?auth=error`, [clearState]);
  }
}

export const _test = { decodePart, verifyIdToken };
