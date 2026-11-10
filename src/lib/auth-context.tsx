"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  buildAuthEmailErrorMessage,
  normalizeAuthEmail,
  rememberAuthEmailSend,
} from "@/lib/auth-email-guard";
import type { User, Session } from "@supabase/supabase-js";
import { boundedAuthRequest } from "@/lib/auth-request";
import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";
import { normalizeLocale } from "@/lib/i18n";
import { clearCreationDraftStorage, creationDraftStorage } from "@/lib/warranty-creation-draft";

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
  authError: string | null;
  profileLoading: boolean;
  profileError: string | null;
  signInWithGoogle: (locale?: string, nextPath?: string, signupFlow?: string) => Promise<AuthActionResult>;
  signInWithApple: (locale?: string, nextPath?: string, signupFlow?: string) => Promise<AuthActionResult>;
  signInWithMagicLink: (email: string, locale?: string, nextPath?: string) => Promise<AuthActionResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>, locale?: string, nextPath?: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface AuthActionResult {
  error: string | null;
  confirmed?: boolean;
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const activeUserId = useRef<string | null>(null);
  const profileRequest = useRef(0);
  const authBoundaryVersion = useRef(0);
  const supabase = createSupabaseBrowserClient();

  const fetchProfile = useCallback(async (userId: string) => {
    if (activeUserId.current !== userId) return;
    const requestId = ++profileRequest.current;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await boundedAuthRequest((signal) => supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .abortSignal(signal)
        .single());
      if (activeUserId.current !== userId || requestId !== profileRequest.current) return;
      if (error || !data) throw new Error("Profile unavailable");
      setProfile({
        ...data,
        company_name:
          typeof data.company === "string" ? data.company : null,
      });
    } catch {
      if (activeUserId.current === userId && requestId === profileRequest.current) {
        setProfile(null);
        setProfileError("Could not load your profile. Please retry.");
      }
    } finally {
      if (activeUserId.current === userId && requestId === profileRequest.current) {
        setProfileLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    let authVersion = 0;

    if (!hasSupabaseConfig) {
      setAuthError(missingConfigError);
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const initAuth = async () => {
      const version = authVersion;
      try {
        const sessionResult = await boundedAuthRequest(() => supabase.auth.getSession());
        if (sessionResult.error) throw sessionResult.error;
        const { data: { session: s } } = sessionResult;
        if (!mounted || version !== authVersion) return;
        activeUserId.current = s?.user.id ?? null;
        setAuthError(null);
        setSession(s);
        setUser(s?.user ?? null);
        // Set loading false IMMEDIATELY - do not wait for profile fetch
        setLoading(false);
        // Fetch profile in background (non-blocking)
        if (s?.user) {
          fetchProfile(s.user.id);
        }
      } catch {
        if (mounted && version === authVersion) {
          setAuthError("Could not verify your session. Please retry signing in.");
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, ns: Session | null) => {
        if (!mounted) return;
        authVersion += 1;
        if (event === "SIGNED_OUT" || (activeUserId.current && activeUserId.current !== (ns?.user.id ?? null))) {
          authBoundaryVersion.current += 1;
          clearCreationDraftStorage(creationDraftStorage());
        }
        if (activeUserId.current !== (ns?.user.id ?? null)) setProfile(null);
        activeUserId.current = ns?.user.id ?? null;
        setAuthError(null);
        setSession(ns);
        setUser(ns?.user ?? null);
        setLoading(false);
        if (ns?.user) {
          fetchProfile(ns.user.id);
        } else {
          profileRequest.current += 1;
          setProfile(null);
          setProfileError(null);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      activeUserId.current = null;
      authBoundaryVersion.current += 1;
      profileRequest.current += 1;
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  const getRedirectURL = (locale = "en", nextPath?: string, signupFlow?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const safeLocale = normalizeLocale(locale);
    const fallbackNext = `/${safeLocale}/dashboard`;
    const safeNext = resolveSafeAuthRedirect(nextPath ?? null, fallbackNext);
    return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}${signupFlow ? `&signup_flow=${encodeURIComponent(signupFlow)}` : ""}`;
  };

  const signInWithProvider = async (provider: "google" | "apple", locale = "en", nextPath?: string, signupFlow?: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const initiatingUser = activeUserId.current;
    const boundaryVersion = authBoundaryVersion.current;
    try {
      const result = await boundedAuthRequest(() => supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getRedirectURL(locale, nextPath, signupFlow), skipBrowserRedirect: true },
      }));
      if (activeUserId.current !== initiatingUser || authBoundaryVersion.current !== boundaryVersion) return { error: "Your session changed. Please retry." };
      if (result.error) return { error: result.error.message };
      if (!result.data.url) return { error: "Authentication is unavailable. Please retry." };
      window.location.assign(result.data.url);
      return { error: null };
    } catch {
      return { error: "Could not start authentication. Please retry." };
    }
  };

  const signInWithGoogle = (locale = "en", nextPath?: string, signupFlow?: string) => signInWithProvider("google", locale, nextPath, signupFlow);
  const signInWithApple = (locale = "en", nextPath?: string, signupFlow?: string) => signInWithProvider("apple", locale, nextPath, signupFlow);

  const signInWithMagicLink = async (email: string, locale = "en", nextPath?: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const normalizedEmail = normalizeAuthEmail(email);
    const guardError = buildAuthEmailErrorMessage(normalizedEmail, "magic-link");
    if (guardError) return { error: guardError };
    const boundaryVersion = authBoundaryVersion.current;
    try {
      const result = await boundedAuthRequest(() => supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: getRedirectURL(locale, nextPath) },
      }));
      if (authBoundaryVersion.current !== boundaryVersion) return { error: "Your session changed. Please retry." };
      if (!result.error) {
        rememberAuthEmailSend(normalizedEmail, "magic-link");
      }
      return { error: result.error?.message ?? null };
    } catch {
      return { error: "Could not request a sign-in link. Please retry." };
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const boundaryVersion = authBoundaryVersion.current;
    try {
      const result = await boundedAuthRequest(() => supabase.auth.signInWithPassword({ email: normalizeAuthEmail(email), password }));
      if (authBoundaryVersion.current !== boundaryVersion) return { error: "Your session changed. Please retry." };
      return { error: result.error?.message ?? null };
    } catch {
      return { error: "Could not sign in. Please retry." };
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>, locale = "en", nextPath?: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    const normalizedEmail = normalizeAuthEmail(email);
    const guardError = buildAuthEmailErrorMessage(normalizedEmail, "signup");
    if (guardError) return { error: guardError };
    const boundaryVersion = authBoundaryVersion.current;
    try {
      const result = await boundedAuthRequest(() => supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: metadata,
          emailRedirectTo: getRedirectURL(locale, nextPath),
        },
      }));
      if (authBoundaryVersion.current !== boundaryVersion) return { error: "Your session changed. Please retry." };
      if (!result.error) {
        rememberAuthEmailSend(normalizedEmail, "signup");
      }
      return { error: result.error?.message ?? null, confirmed: Boolean(result.data?.session) };
    } catch {
      return { error: "Could not complete signup. Please retry." };
    }
  };

  const signOut = async () => {
    const signingOutUser = activeUserId.current;
    authBoundaryVersion.current += 1;
    clearCreationDraftStorage(creationDraftStorage());
    if (hasSupabaseConfig) {
      try {
        const result = await boundedAuthRequest(() => supabase.auth.signOut());
        if (result.error) throw result.error;
      } catch {
        setAuthError("Could not sign out. Please retry.");
        throw new Error("Could not sign out. Please retry.");
      }
    }
    if (activeUserId.current && activeUserId.current !== signingOutUser) return;
    activeUserId.current = null;
    profileRequest.current += 1;
    setProfile(null);
    setProfileLoading(false);
    setProfileError(null);
    setSession(null);
    setUser(null);
    setAuthError(null);
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
        authError,
        profileLoading,
        profileError,
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
