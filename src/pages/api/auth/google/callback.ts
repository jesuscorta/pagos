import { errorResponse } from '../../../../lib/api';
import { allowedEmails, clearSessionCookie, createSessionToken, sessionCookie } from '../../../../lib/auth';

const tokenEndpoint = 'https://oauth2.googleapis.com/token';

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    if (error) throw new Error(error);
    if (!code) throw new Error('BAD_REQUEST: falta el code');

    const stateCookie = (request.headers.get('cookie') || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('oauth_state='));
    if (!stateCookie || stateCookie.split('=')[1] !== state) throw new Error('UNAUTHORIZED');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.PUBLIC_URL || ''}/api/auth/google/callback` || '';
    if (!clientId || !clientSecret || !redirectUri) throw new Error('Configura GOOGLE_* y PUBLIC_URL');

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      throw new Error(`Token exchange failed: ${txt}`);
    }

    const tokenJson = await tokenRes.json();
    const idToken = tokenJson.id_token;
    if (!idToken) throw new Error('No id_token devuelto');

    const [, payloadB64] = idToken.split('.');
    const payloadJson = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));
    const email = String(payloadJson.email || '').toLowerCase();
    const name = payloadJson.name || '';
    if (!allowedEmails.includes(email)) throw new Error('FORBIDDEN');

    const token = await createSessionToken({ email, name });
    const cookies = [
      sessionCookie(token),
      'oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ' +
        (process.env.NODE_ENV === 'production' ? 'Secure' : ''),
    ];

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': cookies,
      },
    });
  } catch (err) {
    return new Response('Auth error', {
      status: 302,
      headers: { Location: '/?auth=error' },
    });
  }
}
