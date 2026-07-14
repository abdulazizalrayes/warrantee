import type { Resend } from "resend";
import { describe, expect, it, vi } from "vitest";
import {
  isInvitationRetryable,
  sendSellerInvitationEmail,
} from "../seller-invitation-delivery";

describe("seller invitation delivery", () => {
  it("uses an invitation-scoped idempotency key and returns the provider ID", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });
    const resend = { emails: { send } } as unknown as Resend;

    await expect(sendSellerInvitationEmail(resend, invitationInput())).resolves.toEqual({
      emailId: "email-1",
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "seller@example.com" }),
      { idempotencyKey: "seller-invitation/invitation-1" },
    );
  });

  it("treats a resolved Resend error as a delivery failure", async () => {
    const resend = {
      emails: { send: vi.fn().mockResolvedValue({ data: null, error: { message: "Rejected" } }) },
    } as unknown as Resend;

    await expect(sendSellerInvitationEmail(resend, invitationInput())).rejects.toThrow("Rejected");
  });

  it("allows failed and stale pending invitations to retry", () => {
    const now = new Date("2026-07-14T12:00:00Z").getTime();
    expect(isInvitationRetryable({
      status: "pending_delivery",
      created_at: "2026-07-14T11:59:59Z",
    }, now)).toBe(true);
    expect(isInvitationRetryable({
      status: "pending",
      created_at: "2026-07-14T11:50:00Z",
    }, now)).toBe(true);
    expect(isInvitationRetryable({
      status: "pending",
      created_at: "2026-07-14T11:59:00Z",
    }, now)).toBe(false);
    expect(isInvitationRetryable({
      status: "sent",
      created_at: "2026-07-14T11:00:00Z",
    }, now)).toBe(false);
  });
});

function invitationInput() {
  return {
    invitationId: "invitation-1",
    sellerEmail: "seller@example.com",
    sellerName: "Seller",
    inviterName: "Customer",
    inviteUrl: "https://warrantee.io/en/seller/accept-invite?token=safe-token",
    from: "Warrantee <hello@warrantee.io>",
    bcc: "hello@warrantee.io",
  };
}
