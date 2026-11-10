import { createRequire } from 'node:module';
import { expect, test } from 'vitest';
import config from '../../../next.config';

const require = createRequire(import.meta.url);
const { pathToRegexp } = require('next/dist/compiled/path-to-regexp') as { pathToRegexp: (source: string) => RegExp };

test('framework redirects cannot intercept the root or localized auth callbacks', async () => {
  const redirects = await config.redirects!();
  const matches = (pathname: string) => redirects.filter(route => pathToRegexp(route.source).test(pathname));
  for (const path of ['/auth/callback', '/en/auth/callback', '/ar/auth/callback']) {
    expect(matches(path), `${path} must reach its actual auth handler with query and cookie path intact`).toEqual([]);
  }
  expect(matches('/auth')).toEqual([{ source: '/auth', destination: '/en/auth', permanent: true }]);
  expect(matches('/warranties/new')).toEqual([{ source: '/warranties/:path*', destination: '/en/warranties/:path*', permanent: true }]);
});
