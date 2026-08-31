# Warrantee First Customer Sprint

Date: 2026-08-21
Last verified: 2026-08-31
Scope: founder-led, zero paid media, no automated sends.

## Recommendation

For seven days, focus only on **Riyadh commercial-kitchen and equipment service businesses that issue installation, repair, or product warranties**.

This is narrower than “all B2B and B2C” on purpose. The segment has serialized equipment, written service reports, warranty-backed work, claims/maintenance follow-up, and a plausible future extension or maintenance-plan path. Those conditions make the product understandable in one conversation.

The offer is:

> Give Warrantee one warranty template and up to ten approved sample or real records. We will prepare the first bilingual warranty records and QR verification flow with you, free, within one working day. No card and no migration commitment.

Do not sell asset intelligence, API / CLI / MCP, a marketplace, or seventeen future features in the first message. The first outcome is one company issuing one warranty and sharing one QR verification record.

## Public Fit Candidates

These are research candidates, not endorsements or CRM records. On 2026-08-31, each official public site was reachable and continued to describe warranty-backed service, equipment supply, maintenance, after-sales support, or serialized equipment. Verify the current public contact channel again immediately before outreach.

| Candidate | Public evidence of fit | Public source |
| --- | --- | --- |
| KitchenAxis | Commercial-kitchen repairs, service reports, and warranty-backed work | https://www.kitchenaxis.co/en |
| Edge Hospitality | Equipment supply, installation support, warranty management, and ongoing maintenance | https://edgehospitality.co/hotel-operations/commercial-kitchen-equipment-riyadh/ |
| Professional Line Trading | Commercial kitchen/laundry equipment, installation, maintenance, warranty and OEM assurance | https://prolinetrading.co/ |
| Cebco Solutions | Equipment coding, maintenance reports, plans, and spare-parts work in Riyadh | https://cebcosa.com/sa/ |
| Al-Ajhizah | Equipment supply with parts/labour warranty and on-site maintenance | https://alajhizah.com/service/after-sale-service/ |
| Asante Kitchens | Public warranty policy tied to invoices, maintenance, and covered equipment | https://asantekitchens.com/en/p/ZllGD |
| Galaxy Engineering | Riyadh equipment trading, commissioning, and after-sales support | https://galaxy-engineering.com/pumps/ |
| Western Pump | Riyadh warranty, service-network, and after-sales workflow | https://thewesternpump.com/costumer-service/ |
| Windcatcher HVAC | Riyadh installation warranties, maintenance contracts, and extended-warranty offer | https://www.windcco.com/contact.html |
| Ekuep | Riyadh/Khobar equipment seller with documented serial-number and warranty-service rules | https://www.ekuep.com/en/warranty |

## Current Measurable Links

Use only these September 2026 links for the next approved pilot. They contain campaign labels only and no person or company identifiers.

- Seller pilot EN: `https://warrantee.io/en/seller/register?utm_source=manual_outreach&utm_medium=direct&utm_campaign=seller_pilot_sep_2026`
- Seller pilot AR: `https://warrantee.io/ar/seller/register?utm_source=manual_outreach&utm_medium=direct&utm_campaign=seller_pilot_sep_2026`
- Business-pricing EN: `https://warrantee.io/en/pricing?utm_source=manual_outreach&utm_medium=direct&utm_campaign=business_pilot_sep_2026`
- Business-pricing AR: `https://warrantee.io/ar/pricing?utm_source=manual_outreach&utm_medium=direct&utm_campaign=business_pilot_sep_2026`

The integration-pilot links remain available from `npm run campaign:links`, but they are not part of this first-customer sprint. The sprint stays focused on one company issuing one warranty.

## Seven-Day Operating Plan

1. Verify ten candidates and rank the best five by reachable decision maker, monthly warranty volume, manual process, and willingness to pilot.
2. Ask the owner for approval before creating those real leads in Twenty CRM or sending any message.
3. Send five individually written messages on day one and five on day two. Use the existing tracked seller-pilot link; do not bulk-send.
4. Offer a 15-minute workflow call or a concierge setup using one non-sensitive sample warranty.
5. Follow up once after 48 hours. Stop after that unless the company responds.
6. Review campaign page views, CTA clicks, seller applications, signups, onboarding completions, and first warranty creation after 48 hours and day seven.

## Success And Decision Rules

Minimum seven-day target:

- 10 verified companies contacted;
- 3 replies;
- 2 workflow calls;
- 1 pilot account;
- 1 non-QA company issues at least one warranty;
- that company returns or issues another warranty in the following week.

Interpretation:

- No replies: the target/contact/message is wrong; do not redesign the app.
- Replies but no calls: the offer or urgency is weak.
- Calls but no signup: use concierge onboarding and inspect objections.
- Signup but no warranty: activation workflow is the blocker.
- First warranty but no second-week return: retention/value is the blocker.

## Extension Pilot Recommendation

Do not activate paid extension checkout while Stripe Pro billing is postponed. Use three evidence stages:

1. **Interest:** seller defines approved extension terms; buyer interest is captured through the existing authenticated extension-interest event.
2. **Manual quote:** seller confirms eligibility and provides a quote outside Warrantee; Warrantee records no payment and makes no underwriting promise.
3. **Paid flow:** only after demand is proven and payment setup is approved, enable verified checkout, webhook reconciliation, customer proof, refund/dispute handling, and the platform fee.

Advance to paid implementation only after at least three sellers create offers, ten eligible warranties are shown, and at least three buyers request a quote or extension. These thresholds avoid building a financial marketplace before demand exists.

## Safety

- No scraping behind logins.
- No personal contact data in repository files or analytics parameters.
- No test contacts in Twenty CRM.
- No real message, campaign, or automated send without explicit owner approval.
- No claims that paid extensions are live.
