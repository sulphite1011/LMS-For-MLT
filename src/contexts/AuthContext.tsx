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

interface AuthContextType extends AuthState {
  updateUser: (data: { username?: string; userImage?: string; userRole?: any }) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoaded: false,
  isSignedIn: false,
  userRole: null,
  username: null,
  userImage: null,
  dbUserId: null,
  updateUser: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  // Depend on these primitives rather than the Clerk `user` object: the object's identity can change
  // (e.g. on session/token refresh) without any real change, which would re-run the sync request.
  // Username/image changes still trigger a re-sync, exactly as before.
  const clerkId = user?.id;
  const clerkUsername = user?.username;
  const clerkHasImage = user?.hasImage;
  const clerkImageUrl = user?.imageUrl;
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
        const res = await fetch("/api/auth/sync", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
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
          username: clerkUsername || null,
          userImage: clerkHasImage && clerkImageUrl ? clerkImageUrl : "/images/default-avatar.png",
          dbUserId: null,
        });
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, clerkId, clerkUsername, clerkHasImage, clerkImageUrl]);

  const updateUser = (data: { username?: string; userImage?: string; userRole?: any }) => {
    setAuthState(prev => ({
      ...prev,
      ...(data.username ? { username: data.username } : {}),
      ...(data.userImage ? { userImage: data.userImage } : {}),
      ...(data.userRole ? { userRole: data.userRole } : {}),
    }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthState = (): AuthContextType => useContext(AuthContext);
