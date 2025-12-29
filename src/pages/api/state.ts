import { errorResponse, jsonResponse } from '../../lib/api';
import { getState } from '../../lib/db';

export async function GET() {
  try {
    const data = await getState();
    return jsonResponse(data);
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
}
