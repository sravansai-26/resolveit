// src/contexts/AuthContext.tsx

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback,
} from 'react';

import { User as ProfileUser } from './ProfileContext';

// FIREBASE
import { signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ==================== Types ====================
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

// ==================== Provider ====================
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true); // TRUE until fully resolved
    const [error, setError] = useState<string | null>(null);

    // Get token helper
    const getToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token");

    // Clear all auth data
    const clearAuthData = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        setUser(null);
        setIsAuthenticated(false);
    };

    // Called after successful login
    const login = (token: string, userData: ProfileUser, rememberMe: boolean) => {
        const storage = rememberMe ? localStorage : sessionStorage;

        storage.setItem("token", token);
        storage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
    };

    // Logout
    const logout = useCallback(async () => {
        try {
            if (auth) await firebaseSignOut(auth);
        } catch {
            console.warn("Firebase logout failed (may be normal for email login)");
        }

        clearAuthData();

        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
        } catch {
            console.error("Server logout error");
        }
    }, []);

    // Fetch user profile from backend
    const fetchUserProfile = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
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

            if (res.ok && json.success && json.data) {
                const userData = json.data;
                const storage =
                    localStorage.getItem("token") ? localStorage : sessionStorage;

                storage.setItem("user", JSON.stringify(userData));

                setUser(userData);
                setIsAuthenticated(true);
            } else {
                clearAuthData();
            }
        } catch (err) {
            console.error("Profile fetch failed:", err);
            clearAuthData();
        }
    }, []);

    // ===========================
    //  FINAL FIXED AUTH INITIALIZER – NO MORE FLASH
    // ===========================
    useEffect(() => {
        let isMounted = true;

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!isMounted) return;

            const token = getToken();
            const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

            // ——— CASE 1: We have a token → TRUST IT IMMEDIATELY ———
            if (token) {
                // Optimistically mark as authenticated
                setIsAuthenticated(true);

                // Restore stored user if exists
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        if (parsed?._id) {
                            setUser(parsed);
                        }
                    } catch (e) {
                        console.warn("Failed to parse stored user", e);
                    }
                }

                // Now validate token with backend ( asynchronously )
                // If backend says invalid → we log out
                try {
                    await fetchUserProfile();
                } catch {
                    // Token invalid → force logout
                    clearAuthData();
                }

                // Only now we are 100% done loading
                if (isMounted) setLoading(false);
                return;
            }

            // ——— CASE 2: No token → definitely not logged in ———
            clearAuthData();
            if (isMounted) setLoading(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [fetchUserProfile]);

    // ============================
    // Context Value
    // ============================
    const value: AuthContextType = {
        user,
        isAuthenticated,
        loading,
        error,
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

// Hook
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}