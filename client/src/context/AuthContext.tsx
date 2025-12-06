import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

// Assuming ProfileUser is defined in ProfileContext or another type file
import { User as ProfileUser } from "./ProfileContext";

import { signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface AuthContextType {
  user: ProfileUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (token: string, userData: ProfileUser, rememberMe: boolean) => void;
  logout: () => void;
  fetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ❌ FIX: The signature for AuthProvider props has been corrected here
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const clearAuthData = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setUser(null);
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
      console.error("Firebase sign out failed:", e);
    }

    clearAuthData();

    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.error("Backend logout failed:", e);
    }
  }, [clearAuthData]);

  const fetchUserProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      clearAuthData();
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        clearAuthData();
        return;
      }

      const json = await res.json();

      if (res.ok && json.success && json.user) {
        const userData = json.user;

        const storage =
          localStorage.getItem("token") ? localStorage : sessionStorage;

        storage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
      } else {
        clearAuthData();
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      clearAuthData();
    }
  }, [clearAuthData]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = getToken();
      const storedUser =
        localStorage.getItem("user") || sessionStorage.getItem("user");

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed?._id) {
            setUser(parsed);
          }
        } catch {}
      }

      if (token) {
        await fetchUserProfile();
      } else {
        clearAuthData();
      }

      if (isMounted) setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, () => {});

    initAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchUserProfile, clearAuthData]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    fetchUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}