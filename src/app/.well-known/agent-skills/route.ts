import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(
    "https://warrantee.io/.well-known/agent-skills/index.json",
    307,
  );
}

export function HEAD() {
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: "https://warrantee.io/.well-known/agent-skills/index.json",
    },
  });
}
