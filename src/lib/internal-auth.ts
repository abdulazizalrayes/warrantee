import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function timingSafeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function getBearerToken(request: NextRequest | Request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
}

export function requireInternalBearer(request: NextRequest | Request, secret: string | undefined) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!secret) {
    return NextResponse.json(
      { error: "Internal endpoint is not configured for authenticated use" },
      { status: 503 }
    );
  }

  if (!timingSafeEqualString(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
