import { errorResponse, jsonResponse } from '../../lib/api';
import { createPayment } from '../../lib/db';

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    await createPayment({
      conceptId: body?.conceptId,
      amount: body?.amount,
      date: body?.date,
    });
    return jsonResponse({ ok: true }, 201);
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
