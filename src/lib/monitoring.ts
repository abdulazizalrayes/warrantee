type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  route: string;
  msg: string;
  requestId?: string | null;
  ms?: number;
  status?: number | string;
  error?: unknown;
  [key: string]: unknown;
};

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error ? String(error) : undefined;
}

export function structuredLog(level: LogLevel, payload: LogPayload) {
  const entry = {
    level,
    product: "warrantee",
    timestamp: new Date().toISOString(),
    ...payload,
    error: normalizeError(payload.error),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function getRequestId(request: Request) {
  return (
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    request.headers.get("cf-ray")
  );
}
