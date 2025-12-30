import { errorResponse, jsonResponse } from '../../../lib/api';
import { requireUser } from '../../../lib/auth';
import { deletePayment, updatePayment } from '../../../lib/db';

export async function PATCH({ params, request }: { params: { id: string }; request: Request }) {
  try {
    await requireUser(request);
    const body = await request.json();
    await updatePayment({ id: params.id, amount: body?.amount, date: body?.date });
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}

export async function DELETE({ params, request }: { params: { id: string }; request: Request }) {
  try {
    await requireUser(request);
    await deletePayment(params.id);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
