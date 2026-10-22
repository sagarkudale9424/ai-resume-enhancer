import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';

// No database or AI key: these tests cover everything that must be rejected
// before either is touched.
process.env.JWT_SECRET = 'test-secret';
delete process.env.MONGODB_URI;
delete process.env.GOOGLE_CLIENT_ID;

let app;
before(async () => {
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

const token = (payload = { userId: '64b7f0c2a1b2c3d4e5f60718', email: 'a@b.co', name: 'A' }, opts = {}) =>
  jwt.sign(payload, 'test-secret', { expiresIn: '1h', ...opts });
const auth = t => ({ Authorization: `Bearer ${t}` });

test('unknown API routes return JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.match(res.body.error, /Not found/);
});

test('health reports the database as unreachable instead of crashing', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.db, 'unreachable');
});

test('malformed JSON bodies get a 400', async () => {
  const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid JSON body');
});

for (const [method, path] of [
  ['get', '/api/resumes'], ['post', '/api/resumes'], ['get', '/api/resumes/64b7f0c2a1b2c3d4e5f60718'],
  ['get', '/api/history'], ['post', '/api/history/save'], ['delete', '/api/history/64b7f0c2a1b2c3d4e5f60718'],
  ['get', '/api/auth/me'], ['put', '/api/auth/profile'],
]) {
  test(`${method.toUpperCase()} ${path} requires sign-in`, async () => {
    const res = await request(app)[method](path);
    assert.equal(res.status, 401);
  });
}

test('a token signed with another secret is rejected', async () => {
  const forged = jwt.sign({ userId: '64b7f0c2a1b2c3d4e5f60718' }, 'some-other-secret');
  const res = await request(app).get('/api/resumes').set(auth(forged));
  assert.equal(res.status, 401);
  assert.match(res.body.error, /Invalid session/);
});

test('an expired token gets a clear message', async () => {
  const expired = token(undefined, { expiresIn: -10 });
  const res = await request(app).get('/api/resumes').set(auth(expired));
  assert.equal(res.status, 401);
  assert.match(res.body.error, /expired/);
});

test('invalid ids are a 400, not a server error', async () => {
  const res = await request(app).get('/api/resumes/not-an-id').set(auth(token()));
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid resume id');
});

test('history rejects out-of-range scores but accepts 0', async () => {
  const bad = await request(app).post('/api/history/save').set(auth(token())).send({ atsScore: 140 });
  assert.equal(bad.status, 400);
  const zero = await request(app).post('/api/history/save').set(auth(token())).send({ atsScore: 0 });
  assert.notEqual(zero.status, 400); // passes validation; fails later only because there is no database
});

test('register validates input before touching the database', async () => {
  const cases = [
    [{}, /required/],
    [{ name: 'A', email: 'not-an-email', password: 'secret1' }, /valid email/],
    [{ name: 'A', email: 'a@b.co', password: '123' }, /at least 6/],
  ];
  for (const [body, message] of cases) {
    const res = await request(app).post('/api/auth/register').send(body);
    assert.equal(res.status, 400);
    assert.match(res.body.error, message);
  }
});

test('Google sign-in never trusts a client-supplied email', async () => {
  // Not configured: refuses outright
  let res = await request(app).post('/api/auth/google').send({ email: 'victim@example.com' });
  assert.equal(res.status, 503);

  process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
  res = await request(app).post('/api/auth/google').send({ email: 'victim@example.com' });
  assert.equal(res.status, 400);
  res = await request(app).post('/api/auth/google').send({ credential: 'forged.token.value' });
  assert.equal(res.status, 401);

  res = await request(app).get('/api/auth/google/config');
  assert.equal(res.body.clientId, 'test-client.apps.googleusercontent.com');
  delete process.env.GOOGLE_CLIENT_ID;
});

test('resume AI and import validate their input', async () => {
  let res = await request(app).post('/api/resumes/ai').send({ action: 'hack' });
  assert.equal(res.status, 400);
  res = await request(app).post('/api/resumes/import');
  assert.equal(res.status, 400);
  res = await request(app).post('/api/resumes/import').attach('resume', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /PDF/);
});

test('chat rejects empty and oversized messages', async () => {
  assert.equal((await request(app).post('/api/chat/message').send({})).status, 400);
  assert.equal((await request(app).post('/api/chat/message').send({ message: 'x'.repeat(4001) })).status, 400);
});

for (const [method, path] of [
  ['get', '/api/jobs'], ['post', '/api/jobs'], ['put', '/api/jobs/64b7f0c2a1b2c3d4e5f60718'],
  ['delete', '/api/jobs/64b7f0c2a1b2c3d4e5f60718'], ['put', '/api/resumes/64b7f0c2a1b2c3d4e5f60718/share'],
]) {
  test(`${method.toUpperCase()} ${path} requires sign-in`, async () => {
    assert.equal((await request(app)[method](path)).status, 401);
  });
}

test('job tracker validates required fields and status', async () => {
  let res = await request(app).post('/api/jobs').set(auth(token())).send({ company: 'Acme' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Company and role/);
  res = await request(app).post('/api/jobs').set(auth(token())).send({ company: 'Acme', role: 'SDE', status: 'hired!!' });
  assert.equal(res.status, 400);
  res = await request(app).put('/api/jobs/bad-id').set(auth(token())).send({ status: 'applied' });
  assert.equal(res.status, 400);
});

test('public resume links reject malformed ids', async () => {
  const res = await request(app).get('/api/public/resumes/<script>');
  assert.equal(res.status, 404);
});

test('AI resume generation and tailoring validate input', async () => {
  let res = await request(app).post('/api/resumes/generate').send({ background: 'long enough background text here' });
  assert.equal(res.status, 400);
  res = await request(app).post('/api/resumes/generate').send({ targetRole: 'SDE', background: 'short' });
  assert.equal(res.status, 400);
  res = await request(app).post('/api/resumes/tailor').send({ resume: {}, jobDescription: 'too short' });
  assert.equal(res.status, 400);
});

test('interview practice and LinkedIn tools validate input', async () => {
  assert.equal((await request(app).post('/api/interview/evaluate').send({ question: 'Q?', answer: 'short' })).status, 400);
  assert.equal((await request(app).post('/api/interview/generate').send({})).status, 400);
  assert.equal((await request(app).post('/api/tools/linkedin').send({ resumeText: 'tiny' })).status, 400);
});

test('chat and RAG refuse to fall back to a shared session', async () => {
  assert.equal((await request(app).post('/api/chat/message').send({ message: 'hi' })).status, 400);
  assert.equal((await request(app).post('/api/rag/query').send({ query: 'hi' })).status, 400);
});
