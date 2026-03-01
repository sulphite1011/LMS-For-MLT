"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  userRole: "superAdmin" | "admin" | null;
  username: string | null;
  dbUserId: string | null;
}

const AuthContext = createContext<AuthState>({
  isLoaded: false,
  isSignedIn: false,
  userRole: null,
  username: null,
  dbUserId: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [authState, setAuthState] = useState<AuthState>({
    isLoaded: false,
    isSignedIn: false,
    userRole: null,
    username: null,
    dbUserId: null,
  });

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setAuthState({
        isLoaded: true,
        isSignedIn: false,
        userRole: null,
        username: null,
        dbUserId: null,
      });
      return;
    }

    const syncUser = async () => {
      try {
        const res = await fetch("/api/auth/sync", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setAuthState({
            isLoaded: true,
            isSignedIn: true,
            userRole: data.role,
            username: data.username,
            dbUserId: data._id,
          });
        }
      } catch {
        setAuthState({
          isLoaded: true,
          isSignedIn: true,
          userRole: null,
          username: user?.username || null,
          dbUserId: null,
        });
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export const useAuthState = () => useContext(AuthContext);
