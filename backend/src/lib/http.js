import { ObjectId } from 'mongodb';

// An error with an HTTP status that the error handler sends to the client as-is
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function toObjectId(id, what = 'id') {
  if (!ObjectId.isValid(id)) throw new HttpError(400, `Invalid ${what}`);
  return new ObjectId(id);
}

// Lets async route handlers throw and still reach the error handler
export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Parse JSON from an LLM, tolerating stray text or code fences around it
export function parseModelJSON(text) {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
    }
    throw new HttpError(502, 'The AI returned an unexpected response. Please try again.');
  }
}
