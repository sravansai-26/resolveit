import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";

import { User as ProfileUser } from "./ProfileContext";

import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from "firebase/auth";

import { auth as firebaseAuth } from "../firebase";
import api from "../lib/api";

/* =========================================================
    TYPES
========================================================= */
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

/* =========================================================
    AUTH PROVIDER
========================================================= */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth: Auth = firebaseAuth;

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔒 Prevent duplicate Firebase → Backend sync
  const hasSyncedFirebaseRef = useRef(false);
  const isFetchingProfileRef = useRef(false);

  /* =========================================================
      TOKEN HELPERS
  ========================================================= */
  const getToken = useCallback(() => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  }, []);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setUser(null);
    setFirebaseUser(null);

    hasSyncedFirebaseRef.current = false;
    isFetchingProfileRef.current = false;
  }, []);

  /* =========================================================
      HYDRATION (STORAGE → STATE)
  ========================================================= */
  useEffect(() => {
    const savedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    const savedToken =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearAuthData();
      }
    }

    // Set loading to false initially if we have local data, 
    // but the onAuthStateChanged listener will provide finality.
    setLoading(false);
  }, [clearAuthData]);

  /* =========================================================
      LOGIN (JWT)
  ========================================================= */
  const login = useCallback(
    (token: string, userData: ProfileUser, rememberMe: boolean) => {
      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("token", token);
      storage.setItem("user", JSON.stringify(userData));

      setUser(userData);
    },
    []
  );

  /* =========================================================
      LOGOUT
  ========================================================= */
  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }

    clearAuthData();

    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
  }, [auth, clearAuthData]);

  /* =========================================================
      FIREBASE → BACKEND SYNC (GOOGLE LOGIN)
  ========================================================= */
  const syncWithFirebase = useCallback(
    async (fbUser: FirebaseUser) => {
      if (hasSyncedFirebaseRef.current) return;
      if (user) {
        setLoading(false);
        return; 
      }

      hasSyncedFirebaseRef.current = true;
      setLoading(true);

      try {
        // 🔥 Use true to force refresh token for APK stability
        const idToken = await fbUser.getIdToken(true);
        const resp = await api.post("/auth/google", { idToken });
        const json = resp.data;

        if (json?.success && json?.data?.token && json?.data?.user) {
          login(json.data.token, json.data.user, true);
        } else {
          clearAuthData();
        }
      } catch {
        clearAuthData();
      } finally {
        setLoading(false);
      }
    },
    [login, clearAuthData, user]
  );

  /* =========================================================
      FETCH PROFILE (JWT SESSION)
  ========================================================= */
  const fetchUserProfile = useCallback(async () => {
    if (isFetchingProfileRef.current) return;

    const token = getToken();
    if (!token) {
        setLoading(false);
        return;
    }

    isFetchingProfileRef.current = true;
    setLoading(true);

    try {
      const resp = await api.get("/users/me");
      const json = resp.data;

      if (json?.success && json?.user) {
        const storage = localStorage.getItem("token")
          ? localStorage
          : sessionStorage;

        storage.setItem("user", JSON.stringify(json.user));
        setUser(json.user);
      } else {
        clearAuthData();
      }
    } catch {
      clearAuthData();
    } finally {
      isFetchingProfileRef.current = false;
      setLoading(false);
    }
  }, [getToken, clearAuthData]);

  /* =========================================================
      MAIN AUTH LISTENER
  ========================================================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        syncWithFirebase(fbUser);
        return;
      }

      // No Firebase user → JWT session
      if (!user) {
        fetchUserProfile();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, syncWithFirebase, fetchUserProfile, user]);

  /* =========================================================
      CONTEXT VALUE
  ========================================================= */
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
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
    HOOK
========================================================= */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}