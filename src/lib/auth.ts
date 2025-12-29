import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();
const cookieName = 'pagos_session';
const getSecret = () => {
  const secret = process.env.AUTH_SECRET || 'dev-secret-change-me';
  return encoder.encode(secret);
};

const isProd = process.env.NODE_ENV === 'production';

export type SessionUser = { email: string; name?: string };

export const allowedEmails = (process.env.ALLOWED_EMAILS || 'jesuscortacero@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const createSessionToken = async (user: SessionUser) => {
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
};

export const verifySession = async (token: string): Promise<SessionUser | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { email: String(payload.email), name: payload.name ? String(payload.name) : undefined };
  } catch (err) {
    console.error('verifySession error', err);
    return null;
  }
};

export const readSessionToken = (request: Request) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${cookieName}=`));
  if (!match) return null;
  return match.split('=')[1] || null;
};

export const sessionCookie = (token: string) => {
  const maxAge = 60 * 60 * 24 * 7; // 7 días
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; ${
    isProd ? 'Secure' : ''
  }`;
};

export const clearSessionCookie = () =>
  `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${isProd ? 'Secure' : ''}`;

export const requireUser = async (request: Request): Promise<SessionUser> => {
  const token = readSessionToken(request);
  if (!token) throw new Error('UNAUTHORIZED');
  const user = await verifySession(token);
  if (!user) throw new Error('UNAUTHORIZED');
  if (!allowedEmails.includes(user.email.toLowerCase())) throw new Error('FORBIDDEN');
  return user;
};
