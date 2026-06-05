import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase browser environment variables are not configured");
    }

    if (typeof window !== "undefined") {
      console.warn("Supabase browser environment variables not set. Using placeholder.");
    }
    browserClient = createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
    return browserClient;
  }

  browserClient = createBrowserClient(
    url,
    key
  );

  return browserClient;
}
