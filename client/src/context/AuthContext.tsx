// src/context/AuthContext.tsx
// FINAL VERSION — WORKS ON VERCEL + RENDER + REFRESH + GOOGLE + MANUAL LOGIN

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

// CRITICAL: FULL URL — NO RELATIVE PATHS, NO VITE_API_URL BUGS
const BACKEND_URL = "https://resolveit-api.onrender.com";

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

  const getToken = useCallback(() => {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
  }, []);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    setFirebaseUser(null);
    setIsAuthenticated(false);
  }, []);

  const login = useCallback((token: string, userData: ProfileUser, rememberMe: boolean = true) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("token", token);
    storage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Firebase sign out failed:", e);
    }

    clearAuthData();

    // Optional: tell backend to invalidate token
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      // ignore
    }
  }, [clearAuthData]);

  // Sync Firebase user → backend session
  const syncWithFirebase = async (fbUser: FirebaseUser) => {
    try {
      const idToken = await fbUser.getIdToken();

      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) throw new Error("Google sync failed");

      const json = await res.json();
      if (json.success && json.data?.token && json.data?.user) {
        login(json.data.token, json.data.user, true);
      }
    } catch (err) {
      console.error("Firebase → Backend sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // THIS IS THE GOLDEN FUNCTION — HARDCODED URL + BETTER ERROR LOGGING
  const fetchUserProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      clearAuthData();
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      // DEBUG: See exactly what backend returns
      if (!res.ok) {
        const text = await res.text();
        console.error("Profile fetch failed:", res.status, text);
        clearAuthData();
        setLoading(false);
        return;
      }

      const json = await res.json();

      if (json.success && json.user) {
        const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(json.user));
        setUser(json.user);
        setIsAuthenticated(true);
      } else {
        console.warn("Invalid response from /me:", json);
        clearAuthData();
      }
    } catch (err) {
      console.error("Network error in fetchUserProfile:", err);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, [getToken, clearAuthData, login]);

  // Main auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        syncWithFirebase(fbUser);
      } else {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}