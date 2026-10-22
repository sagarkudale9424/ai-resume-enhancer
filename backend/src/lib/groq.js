import Groq from 'groq-sdk';
import { HttpError } from './http.js';

export const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

let groq;

export function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 60_000, maxRetries: 2 });
  return groq;
}

// Turn provider failures into messages a user can act on
function friendlyError(err) {
  if (err.status === 429) return new HttpError(429, 'The AI is busy right now. Please try again in a few seconds.');
  if (err.status === 401 || err.status === 403) return new HttpError(503, 'The AI service is not configured correctly (check GROQ_API_KEY).');
  if (err.name === 'APIConnectionTimeoutError') return new HttpError(504, 'The AI took too long to respond. Please try again.');
  return new HttpError(502, 'The AI service failed to respond. Please try again.');
}

export async function complete(messages, { maxTokens = 2000, temperature = 0.3, json = false } = {}) {
  let response;
  try {
    response = await getGroq().chat.completions.create({
      model: MODEL,
      temperature,
      max_tokens: maxTokens,
      response_format: json ? { type: 'json_object' } : undefined,
      messages,
    });
  } catch (err) {
    console.error('Groq error:', err.status || '', err.message);
    throw friendlyError(err);
  }
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, 'The AI returned an empty response. Please try again.');
  return content;
}
