// @ts-nocheck
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "seller" | "admin" | "support" | "super_admin";
  company_name: string | null;
  phone: string | null;
  preferred_language: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<any>;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
    } catch (err: any) {
      if (err?.name !== "AbortError") {
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
      (_event, ns) => {
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

  const getRedirectURL = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin + "/auth/callback";
  };

  const signInWithGoogle = async () => {
    if (!hasSupabaseConfig) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getRedirectURL() },
    });
  };

  const signInWithApple = async () => {
    if (!hasSupabaseConfig) return;
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: getRedirectURL() },
    });
  };

  const signInWithMagicLink = async (email: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getRedirectURL() },
    });
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    if (!hasSupabaseConfig) return { error: missingConfigError };
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: getRedirectURL(),
      },
    });
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
