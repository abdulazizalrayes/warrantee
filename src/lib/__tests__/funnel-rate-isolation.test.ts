import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('RATE_LIMIT_REQUIRE_REDIS', '0');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', ''); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
});
afterEach(() => vi.unstubAllEnvs());

test('telemetry cannot consume the unchanged warranty API allowance', async () => {
  const { apiRateLimit, funnelEventRateLimit } = await import('../rate-limit');
  for (let i = 0; i < 300; i++) expect((await funnelEventRateLimit('synthetic-shared-office')).success).toBe(true);
  expect((await funnelEventRateLimit('synthetic-shared-office')).success).toBe(false);
  expect(await apiRateLimit('synthetic-shared-office')).toMatchObject({ success: true, remaining: 299 });
});
test('business requests cannot consume the separately enforced telemetry allowance', async () => {
  const { apiRateLimit, funnelEventRateLimit } = await import('../rate-limit');
  for (let i = 0; i < 300; i++) expect((await apiRateLimit('synthetic-shared-office')).success).toBe(true);
  expect((await apiRateLimit('synthetic-shared-office')).success).toBe(false);
  expect(await funnelEventRateLimit('synthetic-shared-office')).toMatchObject({ success: true, remaining: 299 });
});
