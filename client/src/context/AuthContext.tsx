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

// 🟢 FIREBASE IMPORTS
import { signOut as firebaseSignOut } from 'firebase/auth'; 
import { auth } from '../firebase'; // Import the initialized Firebase auth instance

// ======================================================================
// CONFIGURATION
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
    fetchUserProfile: () => Promise<void>; 
}

// ==================== Context Setup ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Provider Component ====================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
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
        storage.setItem('user', JSON.stringify(userData)); 

        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
    };

    // ------------------------------------
    // ✔ Logout user (FINAL IMPLEMENTATION)
    // ------------------------------------
    const logout = useCallback(async () => {
        // 1. Attempt Firebase sign out (for users who logged in via Google)
        try {
            if (auth) {
                await firebaseSignOut(auth); 
                console.log("Firebase session cleared successfully.");
            }
        } catch (error) {
            console.warn("Firebase sign out failed, but proceeding with app logout:", error);
        }
        
        // 2. Clear JWT tokens and local state
        clearAuthData();
        
        // 3. 🟢 UNCOMMENTED: Signal server to clear any HTTP-only cookies/sessions
        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
            console.log("Server logout signal sent.");
        } catch(e) {
            console.error("Failed to signal server logout:", e);
        }
        
    }, [API_BASE_URL]);

    // 📡 Validate token & fetch user profile
    const fetchUserProfile = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
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

                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
                storage.setItem("user", JSON.stringify(userData));

                setUser(userData);
                setIsAuthenticated(true);
            } else {
                console.warn("Token validation failed:", json.message || "Unknown error");
                clearAuthData();
            }

        } catch (err) {
            console.error("Profile fetch error:", err);
            setError("Could not connect to the API server.");
            clearAuthData();
        } 
    }, [API_BASE_URL]);


    // ==================== Initial Load Effect ====================

    useEffect(() => {
        let isMounted = true; 

        const initializeAuth = async () => {
            const token = getToken();
            const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

            if (token && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);

                    if (parsedUser?._id && isMounted) {
                        // Set basic state based on stored data (perceived speed)
                        setUser(parsedUser);
                        setIsAuthenticated(true);
                    }
                    
                    // Validate the token with backend to confirm session is still active
                    await fetchUserProfile(); 

                } catch (error) {
                    console.warn("Stored user data corrupted or token is invalid. Resetting.", error);
                    clearAuthData();
                }
            } else {
                clearAuthData();
            }

            // Only set loading to false AFTER the async check is done
            if (isMounted) { 
                setLoading(false); 
            }
        };

        initializeAuth();

        // Cleanup function for unmounting component
        return () => {
            isMounted = false;
        };

    }, [fetchUserProfile, API_BASE_URL]); 

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