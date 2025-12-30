export const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const resolvePublicUrl = (request: Request) => {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
};

export const errorResponse = (err: unknown) => {
  const message = err instanceof Error ? err.message : 'Error inesperado';
  const isBadRequest = message.startsWith('BAD_REQUEST:');
  const isUnauthorized = message === 'UNAUTHORIZED';
  const isForbidden = message === 'FORBIDDEN';
  const cleanMessage = isBadRequest ? message.replace('BAD_REQUEST:', '').trim() : message;
  const status = isUnauthorized ? 401 : isForbidden ? 403 : isBadRequest ? 400 : 500;
  return jsonResponse({ error: cleanMessage }, status);
};
