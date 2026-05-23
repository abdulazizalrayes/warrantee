# IndexNow and Bing Submission

Last updated: 2026-05-23

Warrantee uses IndexNow to notify Bing and other participating search engines when public URLs change.

## Current Configuration

- Production host: `warrantee.io`
- Sitemap source: `https://warrantee.io/sitemap.xml`
- IndexNow key file: `https://warrantee.io/99975fddf27362d564d730362b73f94d.txt`
- Submission command: `npm run indexnow:submit`
- Endpoints submitted by default:
  - `https://api.indexnow.org/indexnow`
  - `https://www.bing.com/indexnow`

## Operating Rule

Run `npm run indexnow:submit` after production deployments that change public pages, metadata, sitemap content, robots policy, or agent-readiness files.

Do not submit authenticated dashboard URLs, API routes, private warranty pages, or customer document URLs.

## Verification

The production smoke gate checks that the IndexNow key file is available at the root and has not been redirected through the localized app shell.

Search engine acceptance means the URLs were received. It does not guarantee immediate indexing or ranking. Bing Webmaster Tools should still be used to inspect a sample of submitted URLs after crawl processing.

Latest production submission on 2026-05-23 accepted 28 sitemap URLs at both the generic IndexNow endpoint and the Bing IndexNow endpoint with HTTP 200.
