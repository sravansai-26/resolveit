// ProfileContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// ======================================================================
// ✅ IMPORTANT: USE ABSOLUTE URL (Render backend)
// DO NOT USE relative URLs — they break on Vercel and cause 405 & CORS.
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

// ==================== Type Definitions ====================

export type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  avatar: string;
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

  const getToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  const saveUserToStorage = (userData: User) => {
    const useLocal = localStorage.getItem("token") ? true : false;
    const storage = useLocal ? localStorage : sessionStorage;
    storage.setItem("user", JSON.stringify(userData));
  };

  // ==================== API Calls ====================

  const fetchProfile = async () => {
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("No authentication token found.");

      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setUser(json.data);
        saveUserToStorage(json.data);
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.message || "Failed to load profile.");
      setUser(null);
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
    }
  };

  const fetchIssues = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("No token found.");

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
  };

  const fetchReposts = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("No token found.");

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
  };

  const updateProfile = async (data: Partial<User>, avatarFile?: File) => {
    try {
      const token = getToken();
      if (!token) throw new Error("No token found.");

      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.message);

      setUser(json.data);
      saveUserToStorage(json.data);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error("Profile update error:", err);
      alert(err.message);
    }
  };

  const deleteIssue = async (issueId: string) => {
    try {
      const token = getToken();
      if (!token) throw new Error("No token found.");

      const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.message);

      setIssues((prev) => prev.filter((i) => i._id !== issueId));
      setReposts((prev) => prev.filter((i) => i._id !== issueId));
    } catch (err: any) {
      console.error("Delete issue error:", err);
      throw err;
    }
  };

  const toggleRepost = async (issueId: string) => {
    try {
      const token = getToken();
      if (!token) throw new Error("No token found.");

      const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/repost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.message);

      setReposts((prev) => prev.filter((issue) => issue._id !== issueId));
    } catch (err: any) {
      console.error("Repost toggle error:", err);
      throw err;
    }
  };

  // ==================== Initial Load Effect ====================

  useEffect(() => {
    const token = getToken();
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?._id) {
          setUser(parsedUser);
        }
      } catch {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
      }
    }

    if (token) {
      fetchProfile()
        .then(() => {
          fetchIssues();
          fetchReposts();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

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
