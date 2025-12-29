import { errorResponse, jsonResponse } from '../../../lib/api';
import { deleteCategory, renameCategory } from '../../../lib/db';

export async function PATCH({ params, request }: { params: { id: string }; request: Request }) {
  try {
    const id = params.id;
    const body = await request.json();
    const name = String(body?.name || '').trim();
    if (!name) throw new Error('BAD_REQUEST: nombre requerido');
    await renameCategory(id, name);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}

export async function DELETE({ params }: { params: { id: string } }) {
  try {
    const id = params.id;
    await deleteCategory(id);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
