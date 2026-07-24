export const CLAIM_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["approved", "rejected", "awaiting_info"],
  awaiting_info: ["under_review"],
  approved: ["resolved"],
  rejected: ["closed"],
  resolved: ["closed"],
  closed: [],
  open: ["in_progress", "resolved"],
  in_progress: ["resolved", "closed"],
};

export function isAllowedClaimTransition(currentStatus: string, nextStatus: string) {
  return (CLAIM_TRANSITIONS[currentStatus] || []).includes(nextStatus);
}
