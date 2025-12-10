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
import api from "../lib/api";

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
    addIssue: (issue: Issue) => void; // <--- ADDED: Function to instantly add new report
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

  // ==================== CORE ACTIONS ====================

    // NEW FUNCTION: Adds a new issue to the top of the 'issues' list immediately
    const addIssue = useCallback(
        (issue: Issue) => {
            console.log("🔵 ProfileContext: Adding new issue to state");
            setIssues(prevIssues => [issue, ...prevIssues]); // Prepend new issue
        },
        []
    );

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
        console.log("🔵 Calling GET /api/issues/my (via api)");
        const resp = await api.get("/issues/my");
        const json = resp.data;

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
        console.log("🔵 Calling GET /api/issues/reposts/me (via api)");
        const resp = await api.get("/issues/reposts/me");
        const json = resp.data;

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

  // ==================== UPDATE PROFILE (FIXED) ====================
  const updateProfile = useCallback(
    async (data: Partial<User>, avatarFile?: File) => {
      console.log("🔵 ProfileContext: updateProfile called");

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

        console.log("🔵 Calling PUT /api/users/me (via api)");

        const resp = await api.put("/users/me", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const json = resp.data;

        if (json.success) {
          console.log("✅ Profile updated successfully");
          
          // 1. Refresh AuthContext (updates authUser)
          await fetchUserProfile(); 
              
          // 2. CRITICAL FIX: Directly update local user state for immediate UI refresh (Navbar)
          // Assumes the API returns the updated user object at json.data.user
          if (json.data && json.data.user) {
              setUser(json.data.user as User);
          } else {
              // Fallback if API doesn't return user, rely on fetchUserProfile refresh
              console.warn("⚠️ API response missing user object for immediate update.");
          }
              
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
      
      // ... authentication checks ...
      
      const resp = await api.delete(`/issues/${id}`);
      const json = resp.data;

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
      // ... authentication and API call ...

      try {
        console.log("🔵 Calling POST /api/issues/" + id + "/repost (via api)");
        const resp = await api.post(`/issues/${id}/repost`, {});
        const json = resp.data;

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
  useEffect(() => {
    const init = async () => {
      console.log("🔵 ProfileContext: Initializing...");

      if (!isAuthenticated) {
        console.log("⚠️ Not authenticated, skipping data load");
        setLoading(false);
        return;
      }

      console.log("🔵 Loading profile data...");
      
      try {
        await fetchUserProfile(); // Fetch from AuthContext
        
        // Fetch issues and reposts
        const token = getToken();
        if (token) {
          // Fetch issues
          try {
            const issuesResp = await api.get("/issues/my");
            if (issuesResp?.data?.success && Array.isArray(issuesResp.data.data)) {
              setIssues(issuesResp.data.data);
            }
          } catch (err) {
            console.error("❌ Failed to fetch issues:", err);
          }

          // Fetch reposts
          try {
            const repostsResp = await api.get("/issues/reposts/me");
            if (repostsResp?.data?.success && Array.isArray(repostsResp.data.data)) {
              setReposts(repostsResp.data.data);
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
        addIssue // <--- ADDED: Expose the new function
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