"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  account_type: "consumer" | "business";
  preferred_locale: string;
  role: "user" | "admin" | "seller";
  onboarding_completed: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: (locale?: string) => Promise<void>;
  signInWithApple: (locale?: string) => Promise<void>;
  signInWithMagicLink: (email: string, locale?: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata: { full_name: string; account_type: string; company_name?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!error && data) setProfile(data as Profile);
  }, [supabase]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await fetchProfile(s.user.id);
      setLoading(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, ns) => {
      setSession(ns);
      setUser(ns?.user ?? null);
      if (ns?.user) await fetchProfile(ns.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const getRedirectURL = (locale: string = "en") => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || "https://warrantee.io";
    return `${baseUrl}/${locale}/auth/callback`;
  };

  const signInWithGoogle = async (locale: string = "en") => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: getRedirectURL(locale), queryParams: { access_type: "offline", prompt: "consent" } } });
  };

  const signInWithApple = async (locale: string = "en") => {
    await supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: getRedirectURL(locale) } });
  };

  const signInWithMagicLink = async (email: string, locale: string = "en") => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: getRedirectURL(locale) } });
    return { error: error?.message || null };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, metadata: { full_name: string; account_type: string; company_name?: string }) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: metadata, emailRedirectTo: getRedirectURL("en") } });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => { if (user) await fetchProfile(user.id); };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signInWithGoogle, signInWithApple, signInWithMagicLink, signInWithPassword, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
