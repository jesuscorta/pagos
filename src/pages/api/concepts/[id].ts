import { errorResponse, jsonResponse } from '../../../lib/api';
import { requireUser } from '../../../lib/auth';
import { deleteConcept, updateConcept } from '../../../lib/db';

export async function PATCH({ params, request }: { params: { id: string }; request: Request }) {
  try {
    await requireUser(request);
    const id = params.id;
    const body = await request.json();
    await updateConcept({
      id,
      title: body?.title,
      amount: body?.amount,
      introducedAt: body?.introducedAt,
      categoryId: body?.categoryId,
    });
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}

export async function DELETE({ params, request }: { params: { id: string }; request: Request }) {
  try {
    await requireUser(request);
    await deleteConcept(params.id);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
