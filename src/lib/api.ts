export const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const errorResponse = (err: unknown) => {
  const message = err instanceof Error ? err.message : 'Error inesperado';
  const isBadRequest = message.startsWith('BAD_REQUEST:');
  const cleanMessage = isBadRequest ? message.replace('BAD_REQUEST:', '').trim() : message;
  const status = isBadRequest ? 400 : 500;
  return jsonResponse({ error: cleanMessage }, status);
};
