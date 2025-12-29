import { errorResponse, jsonResponse } from '../../lib/api';
import { createConcept } from '../../lib/db';

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const concept = await createConcept({
      title: body?.title,
      amount: body?.amount,
      introducedAt: body?.introducedAt,
      categoryId: body?.categoryId,
    });
    return jsonResponse({ concept }, 201);
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
