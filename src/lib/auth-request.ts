export async function boundedAuthRequest<T extends PromiseLike<unknown>>(request: (signal: AbortSignal) => T, timeoutMs = 8000): Promise<Awaited<T>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => request(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Authentication request timed out. Please retry."));
        }, timeoutMs);
      }),
    ]) as Awaited<T>;
  } finally {
    clearTimeout(timer);
  }
}

export async function prepareOAuthSignup(input: {
  accountType: "consumer" | "business" | null;
  companyName: string | null;
  provider: "google" | "apple";
  next: string;
}) {
  return boundedAuthRequest(async (signal) => {
    const response = await fetch("/api/auth/oauth-intent", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input), signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || (input.accountType && typeof payload?.flowId !== "string")) {
      throw new Error("Could not prepare signup. Please retry.");
    }
    return input.accountType ? payload.flowId as string : undefined;
  });
}
