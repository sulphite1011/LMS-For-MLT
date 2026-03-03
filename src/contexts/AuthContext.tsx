"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  userRole: "superAdmin" | "admin" | "user" | null;
  username: string | null;
  userImage: string | null;
  dbUserId: string | null;
}

const AuthContext = createContext<AuthState>({
  isLoaded: false,
  isSignedIn: false,
  userRole: null,
  username: null,
  userImage: null,
  dbUserId: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [authState, setAuthState] = useState<AuthState>({
    isLoaded: false,
    isSignedIn: false,
    userRole: null,
    username: null,
    userImage: null,
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
        userImage: null,
        dbUserId: null,
      });
      return;
    }

    const syncUser = async () => {
      try {
        console.log("[AuthContext] Initiating sync...");
        const res = await fetch("/api/auth/sync", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          console.log("[AuthContext] Sync successful:", data);
          setAuthState({
            isLoaded: true,
            isSignedIn: true,
            userRole: data.role,
            username: data.username,
            userImage: data.userImage,
            dbUserId: data._id,
          });
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error("[AuthContext] Sync failed with status:", res.status, errorData);
          setAuthState(prev => ({ ...prev, isLoaded: true }));
        }
      } catch (error) {
        console.error("[AuthContext] Sync error:", error);
        setAuthState({
          isLoaded: true,
          isSignedIn: true,
          userRole: null,
          username: user?.username || null,
          userImage: user?.hasImage ? user.imageUrl : "/images/default-avatar.png",
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
