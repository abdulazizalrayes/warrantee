"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  buildAuthEmailErrorMessage,
  normalizeAuthEmail,
  rememberAuthEmailSend,
} from "@/lib/auth-email-guard";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "seller" | "admin" | "support" | "super_admin";
  company_id?: string | null;
  company_domain?: string | null;
  company_name: string | null;
  phone: string | null;
  account_type?: string | null;
  onboarding_completed?: boolean | null;
  preferred_locale?: string | null;
  preferred_language: string | null;
  email_notifications?: boolean | null;
  push_notifications?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: (locale?: string, nextPath?: string) => Promise<AuthActionResult>;
  signInWithApple: (locale?: string, nextPath?: string) => Promise<AuthActionResult>;
  signInWithMagicLink: (email: string, locale?: string, nextPath?: string) => Promise<AuthActionResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>, locale?: string, nextPath?: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface AuthActionResult {
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const missingConfigError = "Authentication is unavailable until Supabase environment variables are configured.";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .abortSignal(controller.signal)
        .single();
      clearTimeout(timeout);
      if (data) setProfile(data);
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.error("fetchProfile error:", err);
      }
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    if (!hasSupabaseConfig) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const initAuth = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Auth session request timed out")), 8000)
          ),
        ]);
        const { data: { session: s } } = sessionResult;
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        // Set loading false IMMEDIATELY - do not wait for profile fetch
        setLoading(false);
        // Fetch profile in background (non-blocking)
        if (s?.user) {
          fetchProfile(s.user.id);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, ns: Session | null) => {
        if (!mounted) return;
        setSession(ns);
        setUser(ns?.user ?? null);
        setLoading(false);
        if (ns?.user) {
          fetchProfile(ns.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  const getRedirectURL = (locale = "en", nextPath?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const safeLocale = locale || "en";
    const fallbackNext = `/${safeLocale}/dashboard`;
    const safeNext =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : fallbackNext;
    return `${origin}/${safeLocale}/auth/callback?next=${encodeURIComponent(safeNext)}`;
  };

  const signInWithGoogle = async (locale = "en", nextPath?: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getRedirectURL(locale, nextPath) },
    });
    return { error: result.error?.message ?? null };
  };

  const signInWithApple = async (locale = "en", nextPath?: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const result = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: getRedirectURL(locale, nextPath) },
    });
    return { error: result.error?.message ?? null };
  };

  const signInWithMagicLink = async (email: string, locale = "en", nextPath?: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const normalizedEmail = normalizeAuthEmail(email);
    const guardError = buildAuthEmailErrorMessage(normalizedEmail, "magic-link");
    if (guardError) return { error: guardError };
    const result = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: getRedirectURL(locale, nextPath) },
    });
    if (!result.error) {
      rememberAuthEmailSend(normalizedEmail, "magic-link");
    }
    return { error: result.error?.message ?? null };
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const result = await supabase.auth.signInWithPassword({ email: normalizeAuthEmail(email), password });
    return { error: result.error?.message ?? null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>, locale = "en", nextPath?: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const normalizedEmail = normalizeAuthEmail(email);
    const guardError = buildAuthEmailErrorMessage(normalizedEmail, "signup");
    if (guardError) return { error: guardError };
    const result = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: metadata,
        emailRedirectTo: getRedirectURL(locale, nextPath),
      },
    });
    if (!result.error) {
      rememberAuthEmailSend(normalizedEmail, "signup");
    }
    return { error: result.error?.message ?? null };
  };

  const signOut = async () => {
    setProfile(null);
    if (!hasSupabaseConfig) return;
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithGoogle,
        signInWithApple,
        signInWithMagicLink,
        signInWithPassword,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
