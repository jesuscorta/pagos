import { errorResponse, resolvePublicUrl } from '../../../lib/api';

const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET({ request }: { request: Request }) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const publicUrl = resolvePublicUrl(request);
    if (!publicUrl) throw new Error('Configura PUBLIC_URL');
    const redirectUri = new URL('/api/auth/google/callback', publicUrl).toString();
    if (!clientId) throw new Error('Configura GOOGLE_CLIENT_ID');
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    // Guardamos el state en cookie httpOnly
    const cookie = `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300; ${
      process.env.NODE_ENV === 'production' ? 'Secure' : ''
    }`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${googleAuthUrl}?${params.toString()}`,
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
