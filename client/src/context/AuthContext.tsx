// src/contexts/AuthContext.tsx

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode
} from 'react';
import { User as ProfileUser } from './ProfileContext';

// ======================================================================
// ✅ IMPORTANT: USE ABSOLUTE API URL (Render backend)
// Vercel is frontend → Render is backend
// ======================================================================
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


    // ✔ Logout user
    const logout = () => {
        clearAuthData();
    };



    // 📡 Validate token & fetch user profile
    const fetchUserProfile = async () => {
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

            const json = await res.json();

            if (res.ok && json.success && json.data) {
                const userData: ProfileUser = json.data;

                const storage = localStorage.getItem('token')
                    ? localStorage
                    : sessionStorage;

                storage.setItem("user", JSON.stringify(userData));

                setUser(userData);
                setIsAuthenticated(true);
            } else {
                console.warn("Token invalid or expired:", json.message);
                clearAuthData();
            }

        } catch (err) {
            console.error("Profile fetch error:", err);
            clearAuthData();
        }
    };



    // ==================== Initial Load Effect ====================

    useEffect(() => {
        const token = getToken();
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

        if (token && storedUser) {
            try {
                const parsed = JSON.parse(storedUser);

                if (parsed?._id) {
                    setUser(parsed);
                    setIsAuthenticated(true);
                }

                // Validate the token with backend
                fetchUserProfile();

            } catch (error) {
                console.warn("Stored user corrupted. Resetting.", error);
                clearAuthData();
            }
        } else {
            clearAuthData();
        }

        setLoading(false);
    }, []);



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
