import { NextResponse } from "next/server";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, A2A-Version",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
};

export function GET() {
  return NextResponse.json(
    {
      name: "Warrantee Agent Concierge",
      protocol: "A2A",
      protocolVersion: "1.0",
      binding: "HTTP+JSON",
      baseUrl: "https://warrantee.io/api/a2a",
      sendMessageEndpoint: "https://warrantee.io/api/a2a/message:send",
      agentCard: "https://warrantee.io/.well-known/agent-card.json",
      mode: "synchronous public read-only message responses",
      unsupported: ["tasks", "streaming", "push notifications", "private account actions"],
    },
    { headers },
  );
}

export function HEAD() {
  return new NextResponse(null, {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function OPTIONS() {
  return new NextResponse(null, { headers });
}
