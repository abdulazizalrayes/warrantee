# Warrantee public crawler policy

Owner instruction: allow public search and assistant retrieval, not AI training.
No visual, form, authentication, DNS, billing, or account changes.

The previous robots file explicitly allowed GPTBot and Google-Extended despite
advertising ai-train=no. Known training tokens are now denied separately.
Search/retrieval groups retain the existing API exclusions and public API exceptions.
Robots directives are cooperative instructions, not authentication or a guarantee
against scraping, training, or reuse of historical datasets.

## Providers

- OpenAI: OAI-SearchBot and ChatGPT-User allowed, GPTBot denied.
- Anthropic: Claude-SearchBot and Claude-User allowed, ClaudeBot denied.
- Google: Googlebot allowed; Google-Extended conservatively denied because its
  documented scope includes training and Gemini grounding. This can reduce Gemini
  grounding availability; it does not block ordinary Google Search crawling.
- Kimi: Kimi-SearchBot and Kimi-User allowed, KimiBot denied.
- Perplexity: PerplexityBot and Perplexity-User allowed.
- Meta: search/fetch/link-preview tokens allowed, Meta-ExternalAgent denied.
  Official documentation was retrieved successfully via a direct HTTP request
  after the search tool encountered an access error; its public text confirms
  WebIndexer is for Meta AI search and ExternalAgent includes model training.
- Common Crawl CCBot denied to reduce collection for downstream training datasets.
- DeepSeek: no authoritative separate search/retrieval token verified. Public
  access falls under the wildcard search/input permission, not a fabricated bot name.
- "jev" is unidentified. Do not invent an operator identity or crawler token.
- "Muse" is treated as the owner's Meta AI product reference, not a verified token.

Sources checked November 7, 2026:

- https://developers.openai.com/api/docs/bots
- https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- https://www.kimi.ai/policies/kimi-crawlers
- https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/

## Verification and rollback

Run `npx vitest run src/lib/__tests__/crawler-policy.test.ts`, type-check and CI.
After deployment, fetch robots.txt and public EN/AR pages with representative
user-agent strings. Such requests test this runner's access, not the providers'
actual IPs or Cloudflare verified-bot handling. Never bypass security by trusting
a spoofable user-agent alone. Inspect edge rules/logs separately if access fails.
Rollback by reverting this scoped commit and redeploying, not by weakening auth.
