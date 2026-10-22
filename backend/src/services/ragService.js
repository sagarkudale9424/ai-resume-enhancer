import { complete } from '../lib/groq.js';

// In-memory store: sessionId -> [{ text, embedding }]
const store = new Map();

function splitText(text, chunkSize = 400, overlap = 50) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

function embed(text) {
  const words = text.toLowerCase().split(/\W+/);
  const freq = {};
  words.forEach(w => { if (w.length > 2) freq[w] = (freq[w] || 0) + 1; });
  return freq;
}

function similarity(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, normA = 0, normB = 0;
  keys.forEach(k => {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb; normA += va * va; normB += vb * vb;
  });
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export async function indexResume(sessionId, resumeText) {
  const chunks = splitText(resumeText).map(text => ({ text, embedding: embed(text) }));
  store.delete(sessionId);
  if (store.size >= 1000) store.delete(store.keys().next().value);
  store.set(sessionId, chunks);
  return { chunksIndexed: chunks.length };
}

export async function queryResume(sessionId, query, topK = 3) {
  const chunks = store.get(sessionId) || [];
  if (!chunks.length) return 'Resume not indexed yet. Please upload your resume in the Analyzer tab first.';

  const queryEmb = embed(query);
  const context = chunks
    .map(c => ({ text: c.text, score: similarity(queryEmb, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(c => c.text)
    .join('\n\n');

  return complete(
    [
      { role: 'system', content: `You are a career coach. Use this resume context:\n\n${context}` },
      { role: 'user', content: query },
    ],
    { maxTokens: 800, temperature: 1 }
  );
}

export async function clearSession(sessionId) {
  store.delete(sessionId);
}
