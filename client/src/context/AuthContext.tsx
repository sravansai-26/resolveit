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
import api from "../lib/api";

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
    const localToken = localStorage.getItem("token");
    const sessionToken = sessionStorage.getItem("token");
    
    if (localToken) {
      console.log("🔵 Token found in localStorage (length:", localToken.length, ")");
      return localToken;
    }
    
    if (sessionToken) {
      console.log("🔵 Token found in sessionStorage (length:", sessionToken.length, ")");
      return sessionToken;
    }
    
    console.warn("⚠️ No token found in storage");
    return null;
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

    console.log("✅ Auth data cleared");
  }, []);

  // ================================================================
  // HYDRATION: Immediate Load from Storage (Fixes APK State Loss)
  // ================================================================
  useEffect(() => {
    console.log("🔋 HYDRATION: Checking for existing session...");
    const savedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const savedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log("✅ Hydration successful: User found");
      } catch (e) {
        console.error("❌ Hydration failed", e);
      }
    }
  }, []);

  // ================================================================
  // LOGIN — Manual + Google (Client-Side)
  // ================================================================
  const login = useCallback(
    (token: string, userData: ProfileUser, rememberMe: boolean = true) => {
      console.log("🟢 LOGIN FUNCTION CALLED");
      console.log("📧 User email:", userData.email);
      console.log("💾 Remember me:", rememberMe);
      console.log("🎫 Token length:", token.length);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", token);
      storage.setItem("user", JSON.stringify(userData));

      console.log("✅ Token and user saved to", rememberMe ? "localStorage" : "sessionStorage");

      setUser(userData);
      setIsAuthenticated(true);

      console.log("✅ User state updated, authentication successful");
    },
    []
  );

  // ================================================================
  // LOGOUT — Firebase + Backend Sync
  // ================================================================
  const logout = useCallback(async () => {
    console.log("🔵 LOGOUT FUNCTION CALLED");

    try {
      console.log("🔵 Signing out from Firebase...");
      await firebaseSignOut(auth);
      console.log("✅ Firebase sign out successful");
    } catch (e) {
      console.error("❌ Firebase sign out failed:", e);
    }

    clearAuthData();

    try {
      console.log("🔵 Notifying backend of logout...");
      await api.post("/auth/logout");
      console.log("✅ Backend logout notification sent");
    } catch (e) {
      console.warn("⚠️ Backend logout notification failed (non-critical)");
    }

    console.log("✅ Logout complete");
  }, [clearAuthData]);

  // ================================================================
  // GOOGLE LOGIN: Firebase → Backend Sync
  // ================================================================
  const syncWithFirebase = useCallback(async (fbUser: FirebaseUser) => {
    console.log("🔵 SYNC WITH FIREBASE STARTED");
    console.log("📧 Firebase user email:", fbUser.email);

    try {
      console.log("🔵 Getting Firebase ID token...");
      const idToken = await fbUser.getIdToken(true);
      console.log("✅ Firebase ID token obtained");

      console.log("🔵 Sending token to backend for verification...");
      const resp = await api.post("/auth/google", { idToken });
      const json = resp.data;

      if (json.success && json.data?.token && json.data?.user) {
        console.log("✅ Valid response structure. User:", json.data.user.email);
        login(json.data.token, json.data.user, true);
      } else {
        console.error("❌ Invalid response structure:", json);
        clearAuthData();
      }
    } catch (err) {
      console.error("❌ Google Sync Error:", err);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, [login, clearAuthData]);

  // ================================================================
  // FETCH LOGGED-IN USER PROFILE (AFTER REFRESH)
  // ================================================================
  const fetchUserProfile = useCallback(
    async () => {
      console.log("🔵 FETCH USER PROFILE STARTED");
      const token = getToken();

      if (!token) {
        console.warn("⚠️ No token found → cannot fetch profile");
        clearAuthData();
        setLoading(false);
        return;
      }

      // Capacitor Fix: Delay ensure storage is ready
      await new Promise(resolve => setTimeout(resolve, 150));

      try {
        console.log("🔵 Calling GET /api/users/me");
        const resp = await api.get("/users/me");
        const json = resp.data;

        if (json.success && json.user) {
          console.log("✅ Valid profile data received");
          const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
          storage.setItem("user", JSON.stringify(json.user));
          setUser(json.user);
          setIsAuthenticated(true);
        } else {
          console.warn("⚠️ Invalid profile data structure:", json);
          clearAuthData();
        }
      } catch (err) {
        console.error("❌ Network error during profile fetch:", err);
      } finally {
        setLoading(false);
      }
    },
    [getToken, clearAuthData]
  );

  // ================================================================
  // MAIN AUTH FLOW (Firebase Listener)
  // ================================================================
  useEffect(() => {
    console.log("🔧 SETTING UP FIREBASE AUTH LISTENER");

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log("🔵 Firebase auth state changed");
      
      if (fbUser) {
        console.log("🟢 Firebase user detected:", fbUser.email);
        setFirebaseUser(fbUser);
        syncWithFirebase(fbUser);
      } else {
        console.log("🔵 No Firebase user → checking JWT token");
        setFirebaseUser(null);

        const token = getToken();
        if (token) {
          console.log("✅ JWT token found, fetching profile");
          fetchUserProfile();
        } else {
          console.log("⚠️ No JWT token found");
          clearAuthData();
          setLoading(false);
        }
      }
    });

    return () => {
      console.log("🔧 Cleaning up Firebase auth listener");
      unsubscribe();
    };
  }, [syncWithFirebase, fetchUserProfile, getToken, clearAuthData]);

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