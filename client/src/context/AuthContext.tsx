// src/contexts/AuthContext.tsx

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback,
} from 'react';
// Assuming ProfileUser is defined in ProfileContext.tsx or imported globally
import { User as ProfileUser } from './ProfileContext'; 

// ======================================================================
// ✅ ARCHITECTURE: VITE_API_URL (Option B) - STICKING TO THIS.
// ======================================================================
// Use the base URL defined in the client's .env file
const API_BASE_URL = import.meta.env.VITE_API_URL; 

// ==================== Type Definitions ====================

interface AuthContextType {
    user: ProfileUser | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    login: (token: string, userData: ProfileUser, rememberMe: boolean) => void;
    logout: () => void;
    // We only need the async function exposed if other components need to trigger a profile refresh manually.
    fetchUserProfile: () => Promise<void>; 
}

// ==================== Context Setup ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Provider Component ====================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Initialize loading to true so RequireAuth waits for server validation
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState<string | null>(null);

    // 🔑 Retrieve token from storage
    const getToken = (): string | null => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    };

    // ❌ Clear ALL auth/session data
    const clearAuthData = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');

        setUser(null);
        setIsAuthenticated(false);
    };

    // ✔ Called after successful login
    const login = (token: string, userData: ProfileUser, rememberMe: boolean) => {
        const storage = rememberMe ? localStorage : sessionStorage;

        storage.setItem('token', token);
        // Ensure user data is always stored
        storage.setItem('user', JSON.stringify(userData)); 

        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
    };

    // ✔ Logout user
    const logout = () => {
        clearAuthData();
    };

    // 📡 Validate token & fetch user profile
    // Wrapped in useCallback to prevent unnecessary re-renders/warnings in effects
    const fetchUserProfile = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    // Fix: Ensure the token is always sent in the correct Authorization header
                    Authorization: `Bearer ${token}`, 
                },
            });

            if (res.status === 401 || res.status === 403) {
                // Token expired or invalid, server explicitly rejected it
                clearAuthData();
                return;
            }

            const json = await res.json();

            if (res.ok && json.success && json.data) {
                const userData: ProfileUser = json.data;

                // Update storage with fresh user data (optional, but good practice)
                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
                storage.setItem("user", JSON.stringify(userData));

                setUser(userData);
                setIsAuthenticated(true);
            } else {
                // Generic failure, likely token expired or server error
                console.warn("Token validation failed:", json.message || "Unknown error");
                clearAuthData();
            }

        } catch (err) {
            // Network error (Server down, failed to construct URL)
            console.error("Profile fetch error:", err);
            setError("Could not connect to the API server.");
            clearAuthData();
        } 
        // Note: We don't call setLoading(false) here, we do it in the main effect.
    }, []);


    // ==================== Initial Load Effect (Centralized Logic) ====================

    useEffect(() => {
        let isMounted = true; // Cleanup flag

        const initializeAuth = async () => {
            const token = getToken();
            const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

            if (token && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);

                    if (parsedUser?._id && isMounted) {
                        // Set basic state based on stored data (improves perceived speed)
                        setUser(parsedUser);
                        setIsAuthenticated(true);
                    }
                    
                    // CRITICAL: Validate the token with backend to confirm session is still active
                    await fetchUserProfile(); 

                } catch (error) {
                    console.warn("Stored user data corrupted or token is invalid. Resetting.", error);
                    clearAuthData();
                }
            } else {
                // No token found, ensure state is clean
                clearAuthData();
            }

            // CRITICAL FIX: Only set loading to false AFTER the async check is done
            if (isMounted) { 
                setLoading(false); 
            }
        };

        initializeAuth();

        // Cleanup function for unmounting component
        return () => {
            isMounted = false;
        };

    }, [fetchUserProfile]); // fetchUserProfile is a dependency because it's used inside the effect


    // ==================== Return Context ====================

    const contextValue: AuthContextType = {
        user,
        isAuthenticated,
        loading,
        error,
        login,
        logout,
        fetchUserProfile,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// ==================== Hook ====================

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}