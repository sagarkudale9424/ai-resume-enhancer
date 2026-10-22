import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelJSON, toObjectId, HttpError } from '../src/lib/http.js';
import { checkConfig } from '../src/lib/config.js';

test('parseModelJSON accepts clean JSON, fenced JSON and JSON wrapped in text', () => {
  assert.deepEqual(parseModelJSON('{"a":1}'), { a: 1 });
  assert.deepEqual(parseModelJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseModelJSON('Sure! Here it is: {"a":{"b":2}} Hope this helps'), { a: { b: 2 } });
});

test('parseModelJSON turns garbage into a friendly 502', () => {
  assert.throws(() => parseModelJSON('not json at all'), err => err instanceof HttpError && err.status === 502);
});

test('toObjectId rejects invalid ids with a 400', () => {
  assert.throws(() => toObjectId('nope', 'resume id'), err => err.status === 400 && err.message === 'Invalid resume id');
  assert.equal(String(toObjectId('64b7f0c2a1b2c3d4e5f60718')), '64b7f0c2a1b2c3d4e5f60718');
});

test('checkConfig lists every missing variable', () => {
  const saved = { ...process.env };
  try {
    delete process.env.GROQ_API_KEY;
    delete process.env.MONGODB_URI;
    assert.throws(checkConfig, /GROQ_API_KEY, MONGODB_URI/);
  } finally {
    Object.assign(process.env, saved);
  }
});

test('toBuilderData coerces arrays and junk from the model into builder strings', async () => {
  const { toBuilderData } = await import('../src/services/groqService.js');
  const data = toBuilderData({
    personal: { name: 'A', email: 5 },
    projects: [{ name: 'P', tech: ['Java', 'Spring Boot'], bullets: ['one', 'two'] }, 'junk'],
    skills: [{ label: 'Lang', items: ['Java', 'Go'] }, { label: 'Empty', items: [] }],
    certifications: ['AWS', 'GCP'],
  });
  assert.equal(data.personal.email, '5');
  assert.equal(data.projects.length, 1);
  assert.equal(data.projects[0].tech, 'Java, Spring Boot');
  assert.equal(data.projects[0].bullets, 'one\ntwo');
  assert.deepEqual(data.skills, [{ label: 'Lang', items: 'Java, Go' }]);
  assert.equal(data.certifications, 'AWS\nGCP');
  assert.deepEqual(data.experience, []);
});
