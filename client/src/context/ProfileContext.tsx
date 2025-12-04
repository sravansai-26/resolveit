// src/context/ProfileContext.tsx – FINAL, FULLY FIXED & STABILIZED

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

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
  user: string;
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

// Helper to check token source
const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const saveUserToStorage = (user: User) => {
  const local = localStorage.getItem("token");
  const storage = local ? localStorage : sessionStorage;
  storage.setItem("user", JSON.stringify(user));
};

// ==================== PROVIDER ====================
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reposts, setReposts] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==================== FETCH USER PROFILE ====================
  const fetchProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok && json.success && json.user) {
        setUser(json.user);
        saveUserToStorage(json.user);
      } else {
        setError(json.message || "Could not fetch profile.");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError("Failed to fetch profile.");
    }
  }, []);

  // ==================== FETCH USER ISSUES ====================
  const fetchIssues = useCallback(async () => {
    const token = getToken();
    if (!token) {
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
    } catch (err) {
      console.error("Issues fetch error:", err);
      setIssues([]);
    }
  }, []);

  // ==================== FETCH USER REPOSTS ====================
  const fetchReposts = useCallback(async () => {
    const token = getToken();
    if (!token) {
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
    } catch (err) {
      console.error("Reposts fetch error:", err);
      setReposts([]);
    }
  }, []);

  // ==================== UPDATE PROFILE ====================
  const updateProfile = useCallback(
    async (data: Partial<User>, avatarFile?: File) => {
      const token = getToken();
      if (!token) return alert("Authentication required.");

      try {
        const form = new FormData();

        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            form.append(key, value as string);
          }
        });

        if (avatarFile) form.append("avatar", avatarFile);

        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });

        const json = await res.json();

        if (res.ok && json.success && json.user) {
          setUser(json.user);
          saveUserToStorage(json.user);
          alert("Profile updated successfully!");
        } else {
          alert(json.message || "Failed to update profile.");
        }
      } catch (err) {
        console.error("Update profile error:", err);
        alert("Error updating profile.");
      }
    },
    []
  );

  // ==================== DELETE ISSUE ====================
  const deleteIssue = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) throw new Error("No token found.");

    const res = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message || "Could not delete issue.");

    setIssues((prev) => prev.filter((i) => i._id !== id));
    setReposts((prev) => prev.filter((i) => i._id !== id));
  }, []);

  // ==================== TOGGLE REPOST ====================
  const toggleRepost = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) return;

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

      // Remove from reposts list when toggled
      setReposts((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error("Toggle repost error:", err);
    }
  }, []);

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const token = getToken();
      const stored = localStorage.getItem("user") || sessionStorage.getItem("user");

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?._id) setUser(parsed);
        } catch {
          localStorage.removeItem("user");
        }
      }

      if (token) {
        await fetchProfile();
        await fetchIssues();
        await fetchReposts();
      }

      if (mounted) setLoading(false);
    };

    init();
    return () => {
      mounted = false;
    };
  }, [fetchProfile, fetchIssues, fetchReposts]);

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

// ==================== HOOK ====================
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
