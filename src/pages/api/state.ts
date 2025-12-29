import { errorResponse, jsonResponse } from '../../lib/api';
import { requireUser } from '../../lib/auth';
import { getState } from '../../lib/db';

export async function GET({ request }: { request: Request }) {
  try {
    await requireUser(request);
    const data = await getState();
    return jsonResponse(data);
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
