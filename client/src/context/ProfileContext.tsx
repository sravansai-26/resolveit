// src/context/ProfileContext.tsx - COMPLETE FIXED VERSION

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

import { useAuth } from "./AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ==================== TYPES ====================
export type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  bio?: string;
  avatar?: string;
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
  media: string[];
  votes: Vote[];
  upvotes: number;
  downvotes: number;
  status?: "Pending" | "In Progress" | "Resolved";
  user: string | User;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface ProfileContextType {
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
  deleteIssue: (id: string) => Promise<void>;
  toggleRepost: (id: string) => Promise<void>;
}

// ==================== CONTEXT ====================
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const getToken = () => {
  const localToken = localStorage.getItem("token");
  const sessionToken = sessionStorage.getItem("token");
  
  if (localToken) {
    console.log("🔵 ProfileContext: Token found in localStorage");
    return localToken;
  }
  if (sessionToken) {
    console.log("🔵 ProfileContext: Token found in sessionStorage");
    return sessionToken;
  }
  
  console.warn("⚠️ ProfileContext: No token found");
  return null;
};

// ==================== PROVIDER ====================
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user: authUser, isAuthenticated, fetchUserProfile } = useAuth();

  const [user, setUser] = useState<User | null>(authUser);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reposts, setReposts] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Keep ProfileContext.user synced with AuthContext.user
  useEffect(() => {
    console.log("🔵 ProfileContext syncing with AuthContext");
    console.log("🔵 AuthContext user:", authUser?.email || "none");
    setUser(authUser ?? null);
  }, [authUser]);

  // ==================== FETCH PROFILE ====================
  const fetchProfile = useCallback(async () => {
    console.log("🔵 ProfileContext: fetchProfile called");

    if (!isAuthenticated) {
      console.warn("⚠️ Not authenticated, skipping profile fetch");
      return;
    }

    console.log("🔵 Delegating to AuthContext.fetchUserProfile");
    await fetchUserProfile();
  }, [isAuthenticated, fetchUserProfile]);

  // ==================== FETCH ISSUES ====================
  const fetchIssues = useCallback(async () => {
    console.log("🔵 ProfileContext: fetchIssues called");

    const token = getToken();
    if (!token || !isAuthenticated) {
      console.warn("⚠️ No token or not authenticated");
      setIssues([]);
      return;
    }

    try {
      console.log("🔵 Calling GET /api/issues/my");

      const res = await fetch(`${API_BASE_URL}/api/issues/my`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: 'include', // IMPORTANT for cross-origin auth
      });

      console.log("🔵 Issues response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Issues fetch failed:", errorText);
        setIssues([]);
        return;
      }

      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        console.log("✅ Issues loaded:", json.data.length);
        setIssues(json.data);
      } else {
        console.warn("⚠️ Invalid issues response structure");
        setIssues([]);
      }
    } catch (err) {
      console.error("❌ Failed to fetch issues:", err);
      setIssues([]);
    }
  }, [isAuthenticated]);

  // ==================== FETCH REPOSTS ====================
  const fetchReposts = useCallback(async () => {
    console.log("🔵 ProfileContext: fetchReposts called");

    const token = getToken();
    if (!token || !isAuthenticated) {
      console.warn("⚠️ No token or not authenticated");
      setReposts([]);
      return;
    }

    try {
      console.log("🔵 Calling GET /api/issues/reposts/me");

      const res = await fetch(`${API_BASE_URL}/api/issues/reposts/me`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: 'include',
      });

      console.log("🔵 Reposts response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Reposts fetch failed:", errorText);
        setReposts([]);
        return;
      }

      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        console.log("✅ Reposts loaded:", json.data.length);
        setReposts(json.data);
      } else {
        console.warn("⚠️ Invalid reposts response structure");
        setReposts([]);
      }
    } catch (err) {
      console.error("❌ Failed to fetch reposts:", err);
      setReposts([]);
    }
  }, [isAuthenticated]);

  // ==================== UPDATE PROFILE ====================
  const updateProfile = useCallback(
    async (data: Partial<User>, avatarFile?: File) => {
      console.log("🔵 ProfileContext: updateProfile called");
      console.log("🔵 Update data:", data);
      console.log("🔵 Avatar file:", avatarFile ? "Yes" : "No");

      const token = getToken();
      if (!token || !isAuthenticated) {
        console.error("❌ Not authenticated");
        alert("Authentication required.");
        return;
      }

      try {
        const form = new FormData();

        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            form.append(k, v as string);
            console.log(`🔵 Appending: ${k} =`, v);
          }
        });

        if (avatarFile) {
          form.append("avatar", avatarFile);
          console.log("🔵 Avatar file appended to FormData");
        }

        console.log("🔵 Calling PUT /api/users/me");

        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          body: form,
        });

        console.log("🔵 Update response status:", res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Update failed:", errorText);
          alert("Failed to update profile.");
          return;
        }

        const json = await res.json();

        if (json.success) {
          console.log("✅ Profile updated successfully");
          await fetchUserProfile(); // Refresh authenticated user
          alert("Profile updated successfully!");
        } else {
          console.error("❌ Update failed:", json.message);
          alert(json.message || "Failed to update profile.");
        }
      } catch (err) {
        console.error("❌ Update profile error:", err);
        alert("Error updating profile.");
      }
    },
    [isAuthenticated, fetchUserProfile]
  );

  // ==================== DELETE ISSUE ====================
  const deleteIssue = useCallback(
    async (id: string) => {
      console.log("🔵 ProfileContext: deleteIssue called");
      console.log("🔵 Issue ID:", id);

      const token = getToken();
      if (!token || !isAuthenticated) {
        console.error("❌ Not authenticated");
        throw new Error("Not authenticated.");
      }

      console.log("🔵 Calling DELETE /api/issues/" + id);

      const res = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: 'include',
      });

      console.log("🔵 Delete response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Delete failed:", errorText);
        throw new Error("Failed to delete issue.");
      }

      const json = await res.json();
      
      if (!json.success) {
        console.error("❌ Delete failed:", json.message);
        throw new Error(json.message || "Failed to delete issue.");
      }

      console.log("✅ Issue deleted successfully");

      setIssues((prev) => prev.filter((i) => i._id !== id));
      setReposts((prev) => prev.filter((i) => i._id !== id));
    },
    [isAuthenticated]
  );

  // ==================== TOGGLE REPOST ====================
  const toggleRepost = useCallback(
    async (id: string) => {
      console.log("🔵 ProfileContext: toggleRepost called");
      console.log("🔵 Issue ID:", id);

      const token = getToken();
      if (!token || !isAuthenticated) {
        console.warn("⚠️ Not authenticated");
        return;
      }

      try {
        console.log("🔵 Calling POST /api/issues/" + id + "/repost");

        const res = await fetch(`${API_BASE_URL}/api/issues/${id}/repost`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({}),
        });

        console.log("🔵 Repost response status:", res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Repost toggle failed:", errorText);
          throw new Error("Failed to toggle repost");
        }

        const json = await res.json();
        
        if (!json.success) {
          console.error("❌ Repost toggle failed:", json.message);
          throw new Error(json.message);
        }

        console.log("✅ Repost toggled successfully");

        setReposts((prev) => prev.filter((r) => r._id !== id));
      } catch (err) {
        console.error("❌ Toggle repost error:", err);
      }
    },
    [isAuthenticated]
  );

  // ==================== INITIAL LOAD ====================
  // CRITICAL FIX: Remove fetchProfile, fetchIssues, fetchReposts from dependencies
  // They're useCallback functions that can trigger infinite loops
  useEffect(() => {
    const init = async () => {
      console.log("🔵 ProfileContext: Initializing...");
      console.log("🔵 Is authenticated:", isAuthenticated);

      if (!isAuthenticated) {
        console.log("⚠️ Not authenticated, skipping data load");
        setLoading(false);
        return;
      }

      console.log("🔵 Loading profile data...");
      
      // Call functions directly instead of relying on dependencies
      try {
        await fetchUserProfile(); // Fetch from AuthContext
        
        // Fetch issues and reposts
        const token = getToken();
        if (token) {
          // Fetch issues
          try {
            const issuesRes = await fetch(`${API_BASE_URL}/api/issues/my`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              credentials: 'include',
            });
            
            if (issuesRes.ok) {
              const issuesJson = await issuesRes.json();
              if (issuesJson.success && Array.isArray(issuesJson.data)) {
                setIssues(issuesJson.data);
              }
            }
          } catch (err) {
            console.error("❌ Failed to fetch issues:", err);
          }

          // Fetch reposts
          try {
            const repostsRes = await fetch(`${API_BASE_URL}/api/issues/reposts/me`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              credentials: 'include',
            });
            
            if (repostsRes.ok) {
              const repostsJson = await repostsRes.json();
              if (repostsJson.success && Array.isArray(repostsJson.data)) {
                setReposts(repostsJson.data);
              }
            }
          } catch (err) {
            console.error("❌ Failed to fetch reposts:", err);
          }
        }

        console.log("✅ Profile data loaded");
      } catch (err) {
        console.error("❌ Error loading profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isAuthenticated, fetchUserProfile]); // Only depend on isAuthenticated and fetchUserProfile

  // ==================== RETURN CONTEXT ====================
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

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}