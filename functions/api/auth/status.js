import { authConfigured, currentUser } from '../../_shared/auth.js';
import { json } from '../../_shared/http.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    return json({
      authenticated: Boolean(user),
      google_available: authConfigured(env),
      user: user ? { name: user.name || 'Player', email: user.email || '' } : null
    });
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }
}
