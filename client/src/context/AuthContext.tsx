// src/context/AuthContext.tsx
// FINAL PRODUCTION VERSION — WITH DEBUG LOGS + FIXED ENDPOINTS + FULL SYNC

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { User as ProfileUser } from "./ProfileContext";

import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../firebase";

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface AuthContextType {
  user: ProfileUser | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (token: string, userData: ProfileUser, rememberMe: boolean) => void;
  logout: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ================================================================
  // TOKEN HELPERS
  // ================================================================
  const getToken = useCallback(() => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      null
    );
  }, []);

  const clearAuthData = useCallback(() => {
    console.warn("🔴 Clearing authentication data…");

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setUser(null);
    setFirebaseUser(null);
    setIsAuthenticated(false);
  }, []);

  // ================================================================
  // LOGIN — Manual + Google (Client-Side)
  // ================================================================
  const login = useCallback(
    (token: string, userData: ProfileUser, rememberMe: boolean = true) => {
      console.log("🟢 Login Success:", userData);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", token);
      storage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);
    },
    []
  );

  // ================================================================
  // LOGOUT — Firebase + Backend Sync
  // ================================================================
  const logout = useCallback(async () => {
    console.log("🔵 Logging out user…");

    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Firebase sign out failed:", e);
    }

    clearAuthData();

    // Inform backend (not required but good)
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.warn("Logout sync ignored");
    }
  }, [clearAuthData]);

  // ================================================================
  // GOOGLE LOGIN: Firebase → Backend Sync
  // ================================================================
  const syncWithFirebase = async (fbUser: FirebaseUser) => {
    console.log("🔵 Firebase session detected → syncing to backend…");

    try {
      const idToken = await fbUser.getIdToken(true);

      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Google backend sync failed:", res.status, text);
        throw new Error("Google sync failed");
      }

      const json = await res.json();
      console.log("🟢 Firebase → Backend user:", json.data?.user);

      if (json.success && json.data?.token && json.data?.user) {
        login(json.data.token, json.data.user, true);
      }
    } catch (err) {
      console.error("❌ Google Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================================================================
  // FETCH LOGGED-IN USER PROFILE (AFTER REFRESH)
  // ================================================================
  const fetchUserProfile = useCallback(
    async () => {
      const token = getToken();

      if (!token) {
        console.warn("No token found → user logged out");
        clearAuthData();
        setLoading(false);
        return;
      }

      try {
        console.log("🔵 Fetching user profile from /api/users/me");

        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Profile fetch failed:", res.status, text);
          clearAuthData();
          setLoading(false);
          return;
        }

        const json = await res.json();
        console.log("🟢 Profile loaded successfully:", json.user);

        if (json.success && json.user) {
          const storage = localStorage.getItem("token")
            ? localStorage
            : sessionStorage;

          storage.setItem("user", JSON.stringify(json.user));
          setUser(json.user);
          setIsAuthenticated(true);
        } else {
          console.warn("⚠ Invalid profile data:", json);
          clearAuthData();
        }
      } catch (err) {
        console.error("❌ Network error during profile fetch:", err);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    },
    [getToken, clearAuthData, login]
  );

  // ================================================================
  // MAIN AUTH FLOW
  // ================================================================
  useEffect(() => {
    console.log("🔧 Setting up Firebase listener…");

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        console.log("🟢 Firebase user detected:", fbUser.email);
        setFirebaseUser(fbUser);
        syncWithFirebase(fbUser);
      } else {
        console.log("🔵 No firebase user → checking JWT");
        setFirebaseUser(null);

        const token = getToken();
        if (token) {
          fetchUserProfile();
        } else {
          clearAuthData();
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile, getToken, clearAuthData]);

  // ================================================================
  // CONTEXT VALUE
  // ================================================================
  const value: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    loading,
    error: null,
    login,
    logout,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
