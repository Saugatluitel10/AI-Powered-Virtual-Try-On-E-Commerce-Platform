"use client";

import { useCallback } from "react";
import { getLocalSession, localSignIn, localSignOut, localSignUp } from "@/lib/local-auth";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, loading, setAuth } = useAuthStore();

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setAuth(await localSignIn(email, password));
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error("Unable to sign in.") };
    }
  }, [setAuth]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      setAuth(await localSignUp(name, email, password));
      return { error: null, confirmationRequired: false };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error("Unable to create account."), confirmationRequired: false };
    }
  }, [setAuth]);

  const signOut = useCallback(async () => {
    localSignOut();
    setAuth(null);
  }, [setAuth]);

  return { user, session: getLocalSession(), loading, signIn, signUp, signOut };
}
