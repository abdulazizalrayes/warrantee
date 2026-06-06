# Warrantee Translation Rollout Plan

## Current production posture

- English is the primary content source and default locale.
- Arabic is the only fully localized indexed secondary locale.
- Beta language routes are enabled for discovery and user preference continuity, but they intentionally fall back to English content and remain `noindex, follow`.
- Beta languages must not be added to the sitemap or reciprocal `hreflang` until the page copy, metadata, legal wording, layout, and support workflow have been reviewed for that locale.

## Beta languages

The current beta-language set is Hindi, Urdu, Filipino, Malayalam, Tamil, Bengali, French, Indonesian, Turkish, Spanish, Russian, German, Italian, Chinese, and Japanese.

These cover likely GCC workforce languages plus international buyer/investor languages. They are available in the language selector so users can keep locale-specific routes, but they do not claim translated content to Google yet.

## Pages that need real translation before indexation

- Homepage and value proposition.
- Pricing, plan limits, promotion wording, and checkout-related messaging.
- Features and workflow pages.
- FAQ, support, and error-state language.
- Blog and guide pages intended for search demand.
- About and contact pages.
- Verification and product-passport pages.
- Auth, dashboard, seller onboarding, warranty, claims, and billing UI.
- Privacy, terms, cookies, warranty disclaimers, and region-specific legal copy.
- Metadata, Open Graph text, JSON-LD text, sitemap entries, and `llms.txt` summaries.

## Acceptance checklist per locale

- Native or professional review confirms the translation is natural, not literal.
- Warranty, claim, seller, buyer, subscription, and legal terms are consistent across the product.
- Desktop and mobile QA pass without overflow, clipped buttons, broken wrapping, or layout shift.
- RTL is enabled only for fully RTL-ready languages and verified across forms, tables, nav, footer, certificates, and QR flows.
- Auth redirects, protected routes, public verification, pricing, and checkout preserve the requested locale.
- Metadata, canonical URLs, `hreflang`, JSON-LD, sitemap entries, and `llms.txt` are updated together.
- Search pages are indexable only after all relevant public pages in that locale are translated and tested.
- Support and sales operations know which languages are actively supported.

## Recommended release order

1. French, Spanish, German, and Russian for broad international business credibility.
2. Hindi, Urdu, Filipino, Malayalam, Tamil, Bengali, Indonesian, and Turkish for GCC workforce accessibility.
3. Italian, Chinese, and Japanese once the core translated public and product flows are stable.

## Do not do yet

- Do not index beta language pages while they still fall back to English.
- Do not add beta language `hreflang` alternates until the translated page pair exists and is production-tested.
- Do not translate legal, pricing, or checkout copy without business review.
- Do not use machine translation as the final public version for high-trust pages.
