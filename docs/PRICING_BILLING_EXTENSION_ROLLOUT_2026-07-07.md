# Pricing, Billing, And Extension Rollout

Date: 2026-07-07

## Decision

Warrantee should stop presenting Professional as `$1/month` with a first free month. The approved local change moves public copy, schema, and plan definitions to:

- Free: `0`, no card, up to 10 warranties, retained warranty history.
- Professional: `SAR 149/month` launch offer for early Saudi/GCC customers.
- Enterprise: custom pricing.
- Warranty-extension transaction fee: separate commercial line, not a plan feature.

## Why

- `$1/month` made the product look unfinished and too cheap to trust for B2B warranty records.
- USD conflicted with Saudi/GCC beachhead positioning.
- "First month free" on a tiny price sounded like test copy.
- "8% commission" was a cost shown inside a benefit list.
- "30-day history" and "12-month history" created unacceptable ambiguity around whether warranty records disappear.

## Live Billing Requirements Before Deployment

Do not deploy the pricing change as a commercial launch until all are true:

1. Stripe live product and recurring price exist for Professional at `SAR 149/month`.
2. Vercel Production `STRIPE_PRO_PRICE_ID` points to that live SAR price.
3. Vercel Production has `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
4. Stripe webhook points to `https://warrantee.io/api/stripe/webhook`.
5. Webhook events include at least `checkout.session.completed`, `customer.subscription.updated`, and `invoice.payment_succeeded`.
6. Production checkout is tested with an authenticated account.
7. Stripe dashboard and Vercel env values are checked without exposing secrets.

## 2026-07-08 Stripe Blocker

The code and public copy are prepared for the `SAR 149/month` Professional launch offer, but the live Stripe price cannot be confirmed or created from the current local machine yet:

- `STRIPE_PRO_PRICE_ID` is missing from Vercel Production.
- Vercel env pull does not expose the sensitive live `STRIPE_SECRET_KEY` locally, so the Stripe API cannot be used from this session.
- Regular Chrome opens the Stripe dashboard at the login screen for `https://dashboard.stripe.com/products`.

Required closure path:

1. Sign in to the Stripe dashboard for the Warrantee live account, or temporarily restore a usable live Stripe secret in a private local env file.
2. Create or confirm the live recurring Professional price: `SAR 149/month`.
3. Copy the resulting `price_...` id.
4. Set `STRIPE_PRO_PRICE_ID` in Vercel Production without exposing the value in docs or chat.
5. Redeploy production and run checkout/readiness verification with an authenticated QA account.

## Extension Loop Requirements Before Launching Extension Revenue

1. Seller/provider creates an approved extension offer.
2. Buyer/holder sees extension eligibility.
3. Checkout starts only for the approved offer.
4. Stripe webhook verifies amount and currency.
5. Warranty dates update only after verified payment.
6. Commission/revenue event is reconciled in admin/reporting.
7. Customer receives proof/confirmation.

## Rollback

If billing cannot be finalized immediately, keep pricing copy honest by leaving Professional visible as the SAR launch offer but route unavailable checkout to billing/contact until `STRIPE_PRO_PRICE_ID` is configured.
