import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PUBLIC_WARRANTY_STATUSES } from "@/lib/public-warranty";

const mocks = vi.hoisted(() => ({
  user: { id: "synthetic-user" } as { id: string } | null,
  authError: null as Error | null,
  row: {} as Record<string, unknown>,
  denied: false,
  party: false,
  limited: false,
  calls: [] as Array<[string, string, string, ...unknown[]]>,
  session: vi.fn(),
  admin: vi.fn(),
  access: vi.fn(),
  update: vi.fn(),
  storage: vi.fn(),
  upload: vi.fn(),
  publicUrl: vi.fn(),
  qrHtml: vi.fn(),
  qrBuffer: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: mocks.session }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.session }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.admin }));
vi.mock("@/lib/warranty-access", () => ({ resolveWarrantyAccessOrClause: mocks.access }));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "192.0.2.1",
  getRateLimitHeaders: () => ({ "Retry-After": "60" }),
  certificateRateLimit: async () => ({ success: !mocks.limited }),
}));
vi.mock("qrcode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("qrcode")>();
  return { default: {
    toDataURL: mocks.qrHtml.mockImplementation(actual.toDataURL),
    toBuffer: mocks.qrBuffer.mockImplementation(actual.toBuffer),
  } };
});

import { POST } from "../../src/app/api/certificates/generate/route";
import { GET } from "../../src/app/api/warranties/[id]/certificate/route";

const id = "00000000-0000-4000-8000-000000000001";
const accessClause = "user_id.eq.synthetic-user,issuer_company_id.in.(synthetic-company)";
const certificateUrl = "https://storage.invalid/certificates/synthetic.pdf";
type Kind = "generate" | "html" | "pdf";

function client(scope: "session" | "admin") {
  let warrantyReads = 0;
  return {
    auth: { getUser: async () => ({ data: { user: mocks.user }, error: mocks.authError }) },
    storage: { from: mocks.storage },
    from: (table: string) => {
      mocks.calls.push([scope, table, "from"]);
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "or"]) {
        query[method] = (...args: unknown[]) => {
          mocks.calls.push([scope, table, method, ...args]);
          return query;
        };
      }
      query.update = (values: unknown) => {
        mocks.update(scope, table, values);
        return query;
      };
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
      query.single = async () => {
        if (table === "party_warranties") {
          return { data: mocks.party ? { warranty_id: id } : null, error: null };
        }
        warrantyReads += 1;
        if (mocks.denied || (mocks.party && warrantyReads === 1)) {
          return { data: null, error: { message: "Synthetic RLS denial" } };
        }
        return { data: mocks.row, error: null };
      };
      return query;
    },
  };
}

async function request(kind: Kind) {
  if (kind === "generate") {
    return POST(new Request("https://fixture.invalid/api/certificates/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warrantyId: id }),
    }));
  }
  return GET(new NextRequest(`https://fixture.invalid/api/warranties/${id}/certificate?format=${kind}`), {
    params: Promise.resolve({ id }),
  });
}

function expectNoSideEffects() {
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.storage).not.toHaveBeenCalled();
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(mocks.publicUrl).not.toHaveBeenCalled();
  expect(mocks.qrHtml).not.toHaveBeenCalled();
  expect(mocks.qrBuffer).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Outbound network forbidden in certificate state tests"); }));
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-not-a-secret");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.invalid");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://fixture.invalid");
  mocks.user = { id: "synthetic-user" };
  mocks.authError = null;
  mocks.denied = false;
  mocks.party = false;
  mocks.limited = false;
  mocks.calls = [];
  mocks.row = {
    id, status: "active", language: "en", certificate_number: "SYNTHETIC-CERT-001",
    product_name: "Synthetic pump", reference_number: "SYNTHETIC-REF-001",
    start_date: "2020-01-01", end_date: "2099-12-31", companies: { name: "Synthetic Company" },
  };
  mocks.session.mockImplementation(() => client("session"));
  mocks.admin.mockImplementation(() => client("admin"));
  mocks.access.mockResolvedValue(accessClause);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.publicUrl.mockReturnValue({ data: { publicUrl: certificateUrl } });
  mocks.storage.mockReturnValue({ upload: mocks.upload, getPublicUrl: mocks.publicUrl });
});

afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe.each<Kind>(["generate", "html", "pdf"])("%s certificate issuance-state boundary", (kind) => {
  it("rejects unauthenticated requests before any record access or side effects", async () => {
    mocks.user = null;
    expect((await request(kind)).status).toBe(401);
    expect(mocks.calls).toEqual([]);
    expect(mocks.access).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("preserves tenant/RLS denial even for an active record", async () => {
    mocks.denied = true;
    expect((await request(kind)).status).toBe(404);
    expect(mocks.access).toHaveBeenCalledWith(expect.anything(), "synthetic-user");
    expect(mocks.calls).toContainEqual(["session", "warranties", "eq", "id", id]);
    expect(mocks.calls).toContainEqual(["session", "warranties", "or", accessClause]);
    if (kind !== "generate") {
      expect(mocks.calls).toContainEqual(["session", "party_warranties", "eq", "user_id", "synthetic-user"]);
      expect(mocks.calls).toContainEqual(["session", "party_warranties", "eq", "warranty_id", id]);
      expect(mocks.calls.filter(([, table, method]) => table === "warranties" && method === "from")).toHaveLength(1);
    }
    expectNoSideEffects();
  });

  it.each(["pending_approval", "pending", "draft", "unissued", "rejected", "", null, undefined])(
    "rejects %s despite existing certificate metadata, without rendering or writes",
    async (status) => {
      mocks.row = { ...mocks.row, status, certificate_hash: "synthetic-hash", certificate_url: certificateUrl };
      const response = await request(kind);
      expect(response.status).toBe(409);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("content-security-policy")).toBeTruthy();
      expect(await response.json()).toEqual({ error: "Certificate unavailable" });
      expectNoSideEffects();
    },
  );

  it.each(["pending_approval", "draft"])("cannot create missing metadata for %s", async (status) => {
    mocks.row = { ...mocks.row, status, certificate_number: null };
    expect((await request(kind)).status).toBe(409);
    expectNoSideEffects();
  });

  it.each(PUBLIC_WARRANTY_STATUSES)("continues serving public-eligible %s records", async (status) => {
    mocks.row = {
      ...mocks.row, status, end_date: status === "active" ? "2099-12-31" : "2021-01-01",
      approved_at: status === "cancelled" ? "2020-01-01T00:00:00Z" : null,
    };
    const response = await request(kind);
    expect(response.status).toBe(200);
    expect(mocks.calls).toContainEqual(["session", "warranties", "or", accessClause]);
    expect(mocks.admin).not.toHaveBeenCalled();
    if (kind === "pdf") {
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
      expect(mocks.upload).toHaveBeenCalledWith(`certificates/${id}.pdf`, expect.any(Buffer), {
        contentType: "application/pdf", upsert: true,
      });
      expect(mocks.update).toHaveBeenCalledWith("session", "warranties", { certificate_url: certificateUrl });
    } else {
      expect(response.headers.get("content-type")).toContain("text/html");
      const html = await response.text();
      expect(html).toContain("Synthetic pump");
      if (kind === "html") expect(html).toContain(status === "active" ? ">Active<" : ">Expired<");
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.storage).not.toHaveBeenCalled();
    }
  });

  it.each([null, undefined, "", "not-a-date", 0])(
    "rejects cancelled records without valid approval evidence (%s), despite certificate metadata",
    async (approvedAt) => {
      mocks.row = {
        ...mocks.row, status: "cancelled", approved_at: approvedAt,
        certificate_hash: "synthetic-hash", certificate_url: certificateUrl,
      };
      const response = await request(kind);
      expect(response.status).toBe(409);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expectNoSideEffects();
    },
  );

  if (kind !== "generate") {
    it.each(["pending_approval", "draft"])("also gates %s resolved through party membership", async (status) => {
      mocks.party = true;
      mocks.row = { ...mocks.row, status };
      expect((await request(kind)).status).toBe(409);
      expect(mocks.calls).toContainEqual(["session", "party_warranties", "eq", "user_id", "synthetic-user"]);
      expectNoSideEffects();
    });

    it.each(["active", "expired"])("preserves party access to an eligible %s record", async (status) => {
      mocks.party = true;
      mocks.row = { ...mocks.row, status, end_date: status === "active" ? "2099-12-31" : "2021-01-01" };
      expect((await request(kind)).status).toBe(200);
      expect(mocks.calls).toContainEqual(["session", "party_warranties", "eq", "user_id", "synthetic-user"]);
      expect(mocks.admin).not.toHaveBeenCalled();
    });
  }
});

it("preserves active certificate metadata generation after scoped authorization", async () => {
  mocks.row = { ...mocks.row, certificate_number: null };
  const response = await request("generate");
  expect(response.status).toBe(200);
  expect(mocks.calls).toContainEqual(["session", "warranties", "or", accessClause]);
  expect(mocks.update).toHaveBeenCalledWith("admin", "warranties", {
    certificate_number: expect.stringMatching(/^WC-/), certificate_hash: expect.stringMatching(/^[a-f0-9]{16}$/),
  });
  expect(mocks.calls).toContainEqual(["admin", "warranties", "eq", "id", id]);
  expect(mocks.storage).not.toHaveBeenCalled();
});

it("preserves the generation rate limit before record access", async () => {
  mocks.limited = true;
  expect((await request("generate")).status).toBe(429);
  expect(mocks.calls).toEqual([]);
  expectNoSideEffects();
});

it("fails closed when company access resolution fails", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  for (const kind of ["generate", "html", "pdf"] as const) {
    mocks.access.mockRejectedValue(new Error("Synthetic membership failure"));
    expect((await request(kind)).status).toBe(500);
    expectNoSideEffects();
  }
  expect(log).toHaveBeenCalled();
});
