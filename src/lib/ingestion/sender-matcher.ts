// @ts-nocheck
// Warrantee â Sender Matching Engine
// Matches incoming email senders to registered users

import { createClient } from '@supabase/supabase-js';
import type { SenderMatch, TrustLevel } from './types';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Match sender email to a registered user.
 * Returns trust level and matched user ID.
 *
 * Priority:
 * 1. Exact email match in auth.users â VERIFIED_OWNER (1.0)
 * 2. CC/reply-to match against auth.users â VERIFIED_SELLER (0.9)
 * 3. Secondary email in profiles â KNOWN_CONTACT (0.6)
 * 4. Domain match against company profiles â KNOWN_CONTACT (0.4)
 * 5. No match â UNKNOWN (0.0)
 */
export async function matchSender(
  fromEmail: string,
  ccEmails: string[] = [],
  _replyTo?: string
): Promise<SenderMatch> {
  const supabaseAdmin = getSupabaseAdmin();
  const normalizedFrom = fromEmail.toLowerCase().trim();

  // Step 1: Exact email match in profiles (linked to auth.users)
  const { data: exactMatch } = await supabaseAdmin
    .from('profiles')
    .select('id, role, email')
    .eq('email', normalizedFrom)
    .single();

  if (exactMatch) {
    if (exactMatch.role === 'seller' && ccEmails.length > 0) {
      const buyerId = await findBuyerFromCC(ccEmails, supabaseAdmin);
      return {
        user_id: exactMatch.id,
        trust_level: 'verified_seller',
        trust_score: 0.9,
        match_method: 'exact_email_seller_with_cc',
        buyer_id: buyerId,
      };
    }

    return {
      user_id: exactMatch.id,
      trust_level: 'verified_owner',
      trust_score: 1.0,
      match_method: 'exact_email',
    };
  }

  // Step 2: Check CC addresses for registered users
  for (const cc of ccEmails) {
    const { data: ccMatch } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .eq('email', cc.toLowerCase().trim())
      .single();

    if (ccMatch) {
      return {
        user_id: null,
        trust_level: 'known_contact',
        trust_score: 0.6,
        match_method: 'cc_match',
        buyer_id: ccMatch.id,
      };
    }
  }

  // Step 3: Check secondary/linked emails in profiles
  const { data: linkedMatch } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .contains('linked_emails', [normalizedFrom])
    .single();

  if (linkedMatch) {
    return {
      user_id: linkedMatch.id,
      trust_level: 'known_contact',
      trust_score: 0.6,
      match_method: 'linked_email',
    };
  }

  // Step 4: Domain match
  const domain = normalizedFrom.split('@')[1];
  if (domain && !isCommonEmailDomain(domain)) {
    const { data: domainMatch } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('company_domain', domain)
      .eq('role', 'seller')
      .limit(1)
      .single();

    if (domainMatch) {
      return {
        user_id: domainMatch.id,
        trust_level: 'known_contact',
        trust_score: 0.4,
        match_method: 'domain_match',
      };
    }
  }

  // Step 5: No match
  return {
    user_id: null,
    trust_level: 'unknown',
    trust_score: 0.0,
    match_method: 'no_match',
  };
}

async function findBuyerFromCC(ccEmails: string[], supabaseAdmin: ReturnType<typeof createClient>): Promise<string | null> {
  for (const cc of ccEmails) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', cc.toLowerCase().trim())
      .single();
    if (data) return data.id;
  }
  return null;
}

const COMMON_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'mail.com', 'protonmail.com',
  'live.com', 'msn.com',
]);

function isCommonEmailDomain(domain: string): boolean {
  return COMMON_DOMAINS.has(domain.toLowerCase());
}
