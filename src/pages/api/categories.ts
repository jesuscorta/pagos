import { errorResponse, jsonResponse } from '../../lib/api';
import { requireUser } from '../../lib/auth';
import { createCategory } from '../../lib/db';

export async function POST({ request }: { request: Request }) {
  try {
    await requireUser(request);
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const color = String(body?.color || '#22c55e');
    if (!name) throw new Error('BAD_REQUEST: nombre requerido');
    const category = await createCategory(name, color);
    return jsonResponse({ category }, 201);
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
