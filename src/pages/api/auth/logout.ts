import { clearSessionCookie, readSessionToken, verifySession } from '../../../lib/auth';

export async function POST({ request }: { request: Request }) {
  const token = readSessionToken(request);
  if (token) await verifySession(token); // best-effort; ignore errors
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': clearSessionCookie() },
  });
}
