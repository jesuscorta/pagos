import { errorResponse, jsonResponse } from '../../../lib/api';
import { requireUser } from '../../../lib/auth';

export async function GET({ request }: { request: Request }) {
  try {
    const user = await requireUser(request);
    return jsonResponse({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
