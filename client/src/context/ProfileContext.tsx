// src/context/ProfileContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback, // 🟢 Added useCallback for stable functions
} from "react";

// ======================================================================
// ✅ ARCHITECTURE: VITE_API_URL (Option B) - STICKING TO THIS.
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

// ==================== Type Definitions ====================

// Exporting types for use in other files (like AuthContext.tsx)
export type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  avatar: string; // URL path to the avatar image
};

export type Vote = {
  user: string;
  isUpvote: boolean;
};

export type Issue = {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  media: string[]; // Array of media URL paths
  votes: Vote[];
  upvotes: number;
  downvotes: number;
  status: "Pending" | "In Progress" | "Resolved";
  user: string;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  reposts: Issue[];
  setReposts: React.Dispatch<React.SetStateAction<Issue[]>>;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  fetchIssues: () => Promise<void>;
  fetchReposts: () => Promise<void>;
  updateProfile: (data: Partial<User>, avatarFile?: File) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  toggleRepost: (issueId: string) => Promise<void>;
};

// ==================== Context Setup ====================

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// ==================== Provider Component ====================

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reposts, setReposts] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }, []);

  const saveUserToStorage = useCallback((userData: User) => {
    // Determine which storage to use based on where the token is stored
    const useLocal = localStorage.getItem("token") ? true : false;
    const storage = useLocal ? localStorage : sessionStorage;
    storage.setItem("user", JSON.stringify(userData));
  }, []);

  // ==================== API Calls ====================

  const fetchProfile = useCallback(async () => {
    setError(null);
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "GET",
        headers: {
          // 🟢 Only JSON needed for GET request
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        // Token expired/invalid, let AuthContext handle full logout if necessary
        throw new Error("Session expired or invalid token."); 
      }

      const json = await res.json();

      if (res.ok && json.success) {
        setUser(json.data);
        saveUserToStorage(json.data);
      } else {
        throw new Error(json.message || "Failed to fetch profile data.");
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      // We don't clear tokens here, AuthContext handles that to prevent race conditions
      setError(err.message || "Failed to load profile."); 
    }
  }, [getToken, saveUserToStorage]);

  const fetchIssues = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIssues([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok && Array.isArray(json.data)) {
        setIssues(json.data);
      } else {
        setIssues([]);
      }
    } catch (err: any) {
      console.error("Error fetching issues:", err);
      setIssues([]);
    }
  }, [getToken]);

  const fetchReposts = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setReposts([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/reposts/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok && Array.isArray(json.data)) {
        setReposts(json.data);
      } else {
        setReposts([]);
      }
    } catch (err: any) {
      console.error("Error fetching reposts:", err);
      setReposts([]);
    }
  }, [getToken]);

  const updateProfile = useCallback(async (data: Partial<User>, avatarFile?: File) => {
    const token = getToken();
    if (!token) {
        alert("Authentication required for profile update.");
        return;
    }

    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Append non-file data
          formData.append(key, value as string);
        }
      });

      if (avatarFile) {
        // Append the file
        formData.append("avatar", avatarFile); 
      }

      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          // 🔴 CRITICAL FIX: DO NOT set 'Content-Type' for FormData
          // The browser sets 'multipart/form-data' automatically, 
          // which is required for file uploads.
        },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Profile update failed.");
      }

      setUser(json.data);
      saveUserToStorage(json.data);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error("Profile update error:", err);
      alert(err.message || "Failed to update profile due to a network error.");
    }
  }, [getToken, saveUserToStorage]);

  const deleteIssue = useCallback(async (issueId: string) => {
    const token = getToken();
    if (!token) throw new Error("No token found.");

    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Failed to delete issue.");

      // Optimistic UI update: remove the issue immediately
      setIssues((prev) => prev.filter((i) => i._id !== issueId));
      setReposts((prev) => prev.filter((i) => i._id !== issueId));
      alert("Issue successfully deleted.");

    } catch (err: any) {
      console.error("Delete issue error:", err);
      throw err;
    }
  }, [getToken]);

  // Note: Your repost logic currently removes the item from reposts state
  // This suggests the endpoint is *toggling* the repost status, and if it's successful, 
  // it means the issue is no longer a repost for the user.
  const toggleRepost = useCallback(async (issueId: string) => {
    const token = getToken();
    if (!token) throw new Error("No token found.");

    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/repost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Failed to toggle repost status.");

      // The server response usually indicates the new status (e.g., {isReposted: boolean})
      // For now, we'll keep your existing logic which assumes a successful POST means it was removed.
      // A more robust implementation would read the server's response payload to update state correctly.
      
      // Temporary logic based on existing code: filter out the issue from reposts array
      setReposts((prev) => prev.filter((issue) => issue._id !== issueId)); 

    } catch (err: any) {
      console.error("Repost toggle error:", err);
      throw err;
    }
  }, [getToken]);

  // ==================== Initial Load Effect ====================

  useEffect(() => {
    let isMounted = true; // Cleanup flag

    const initializeProfileData = async () => {
      const token = getToken();
      const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

      if (storedUser && token && isMounted) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?._id) {
            setUser(parsedUser);
          }
        } catch {
          // If stored user data is corrupted, clear it (tokens will be validated by AuthContext)
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
        }
      }

      if (token && isMounted) {
        // Fetch fresh profile data and then issues/reposts
        // We use .then() to ensure serial execution.
        await fetchProfile();
        await fetchIssues();
        await fetchReposts();
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    initializeProfileData();
    
    // Cleanup function
    return () => {
        isMounted = false;
    };
  }, [getToken, fetchProfile, fetchIssues, fetchReposts]); // Added dependencies

  // ==================== Return Context ====================

  return (
    <ProfileContext.Provider
      value={{
        user,
        setUser,
        issues,
        setIssues,
        reposts,
        setReposts,
        loading,
        error,
        fetchProfile,
        fetchIssues,
        fetchReposts,
        updateProfile,
        deleteIssue,
        toggleRepost,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ==================== Hook ====================

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}