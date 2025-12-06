// src/context/ProfileContext.tsx — FINAL, ERROR-FREE VERSION

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

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

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
    setUser(authUser ?? null);
  }, [authUser]);

  // ==================== FETCH PROFILE ====================
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    await fetchUserProfile();
  }, [isAuthenticated, fetchUserProfile]);

  // ==================== FETCH ISSUES ====================
  const fetchIssues = useCallback(async () => {
    const token = getToken();
    if (!token || !isAuthenticated) {
      setIssues([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (res.ok && Array.isArray(json.data)) {
        setIssues(json.data);
      } else {
        setIssues([]);
      }
    } catch {
      setIssues([]);
    }
  }, [isAuthenticated]);

  // ==================== FETCH REPOSTS ====================
  const fetchReposts = useCallback(async () => {
    const token = getToken();
    if (!token || !isAuthenticated) {
      setReposts([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/issues/reposts/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (res.ok && Array.isArray(json.data)) {
        setReposts(json.data);
      } else {
        setReposts([]);
      }
    } catch {
      setReposts([]);
    }
  }, [isAuthenticated]);

  // ==================== UPDATE PROFILE ====================
  const updateProfile = useCallback(
    async (data: Partial<User>, avatarFile?: File) => {
      const token = getToken();
      if (!token || !isAuthenticated) return alert("Authentication required.");

      try {
        const form = new FormData();

        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            form.append(k, v as string);
          }
        });

        if (avatarFile) form.append("avatar", avatarFile);

        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });

        const json = await res.json();

        if (res.ok && json.success) {
          await fetchUserProfile(); // refresh authenticated user
          alert("Profile updated successfully!");
        } else {
          alert(json.message || "Failed to update profile.");
        }
      } catch (err) {
        console.error("Update profile error:", err);
        alert("Error updating profile.");
      }
    },
    [isAuthenticated, fetchUserProfile]
  );

  // ==================== DELETE ISSUE ====================
  const deleteIssue = useCallback(
    async (id: string) => {
      const token = getToken();
      if (!token || !isAuthenticated) throw new Error("Not authenticated.");

      const res = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to delete issue.");

      setIssues((prev) => prev.filter((i) => i._id !== id));
      setReposts((prev) => prev.filter((i) => i._id !== id));
    },
    [isAuthenticated]
  );

  // ==================== TOGGLE REPOST ====================
  const toggleRepost = useCallback(
    async (id: string) => {
      const token = getToken();
      if (!token || !isAuthenticated) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/issues/${id}/repost`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message);

        setReposts((prev) => prev.filter((r) => r._id !== id));
      } catch (err) {
        console.error("Toggle repost error:", err);
      }
    },
    [isAuthenticated]
  );

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) {
        await fetchProfile();
        await fetchIssues();
        await fetchReposts();
      }
      setLoading(false);
    };

    init();
  }, [isAuthenticated, fetchProfile, fetchIssues, fetchReposts]);

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
