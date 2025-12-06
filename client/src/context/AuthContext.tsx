// src/context/AuthContext.tsx

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

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const clearAuthData = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    setFirebaseUser(null);
    setIsAuthenticated(false);
  }, []);

  const login = (token: string, userData: ProfileUser, rememberMe: boolean) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("token", token);
    storage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Firebase sign out error:", e);
    }

    clearAuthData();

    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Backend logout failed:", e);
    }
  }, [clearAuthData]);

  const syncWithFirebase = async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      clearAuthData();
      setLoading(false);
      return;
    }

    setFirebaseUser(fbUser);

    try {
      const idToken = await fbUser.getIdToken();

      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) throw new Error("Backend sync failed");

      const json = await res.json();
      if (json.success && json.data?.token && json.data?.user) {
        const { token, user } = json.data;
        login(token, user, true); // Google = always remember
      }
    } catch (err) {
      console.error("Failed to sync Firebase user with backend:", err);
      // Don't log out Firebase user — just no backend session
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Invalid token");

      const json = await res.json();
      if (json.success && json.user) {
        const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(json.user));
        setUser(json.user);
        setIsAuthenticated(true);
      }
    } catch (err) {
      clearAuthData();
    }
  }, [clearAuthData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        syncWithFirebase(fbUser);
      } else {
        // No Firebase user → check if we have manual login token
        const token = getToken();
        if (token) {
          fetchUserProfile();
        } else {
          clearAuthData();
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile, clearAuthData]);

  const value: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated: !!user || !!firebaseUser,
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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}