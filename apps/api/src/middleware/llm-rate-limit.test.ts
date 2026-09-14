import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { Bindings } from '../types';
import { llmRateLimit } from './llm-rate-limit';

// Plain Hono app, no D1/KV — exercises the middleware directly against a fake
// RateLimit binding (see docs/testing.md on why apps/api tests must not touch
// D1-backed routes; this one touches neither D1 nor a real Workers binding).
function testApp() {
  const app = new Hono<{ Bindings: Bindings }>();
  app.use('*', llmRateLimit);
  app.get('/', (c) => c.text('ok'));
  return app;
}

describe('llmRateLimit', () => {
  it('passes through when LLM_RATE_LIMITER is unbound', async () => {
    const res = await testApp().request('/', {}, {} as Bindings);
    expect(res.status).toBe(200);
  });

  it('passes through when the binding allows the request', async () => {
    const env = { LLM_RATE_LIMITER: { limit: async () => ({ success: true }) } } as unknown as Bindings;
    const res = await testApp().request('/', {}, env);
    expect(res.status).toBe(200);
  });

  it('returns 429 with Retry-After when the binding refuses', async () => {
    const env = { LLM_RATE_LIMITER: { limit: async () => ({ success: false }) } } as unknown as Bindings;
    const res = await testApp().request('/', {}, env);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(await res.text()).toContain('cached for up to a day');
  });
});
